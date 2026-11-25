import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  Auth,
  SEEDED,
  bootstrapApp,
  loginAs,
  makeClass,
  openSemester,
  subjectIdOf,
  userIdOf,
} from './helpers';

describe('Classes: creation, approval, allocation and schedules (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let admin: Auth;
  let secretary: Auth;
  let carol: Auth;
  let frank: Auth;
  let student: Auth;
  let semesterId: number;
  let carolId: number;
  let frankId: number;
  let cc101: number;
  let cc102: number;
  let mat101: number;
  const server = () => app.getHttpServer();

  const slot = (weekday: number, startTime: string, endTime: string) => ({
    weekday,
    startTime,
    endTime,
  });

  beforeAll(async () => {
    ({ app, ds } = await bootstrapApp());
    admin = await loginAs(app, SEEDED.admin);
    secretary = await loginAs(app, SEEDED.secretary);
    carol = await loginAs(app, SEEDED.teacher);
    frank = await loginAs(app, '12121212108');
    student = await loginAs(app, SEEDED.student);
    carolId = await userIdOf(ds, SEEDED.teacher);
    frankId = await userIdOf(ds, '12121212108');
    cc101 = await subjectIdOf(app, admin, 'CC101');
    cc102 = await subjectIdOf(app, admin, 'CC102');
    mat101 = await subjectIdOf(app, admin, 'MAT101');
    semesterId = await openSemester(app, secretary);
  });
  afterAll(async () => app.close());

  describe('creation and approval (REQ06, RN01, UC06, UC08)', () => {
    it('creates a class as pending with an automatic code', async () => {
      const res = await request(server())
        .post('/classes')
        .set(secretary)
        .send({ semesterId, subjectId: mat101, seats: 40 })
        .expect(201);
      expect(res.body).toMatchObject({
        status: 'pending',
        code: 'T01',
        seats: 40,
        enrolledCount: 0,
        availableSeats: 40,
        teacher: null,
        schedules: [],
      });
      const second = await request(server())
        .post('/classes')
        .set(secretary)
        .send({ semesterId, subjectId: mat101, seats: 10 })
        .expect(201);
      expect(second.body.code).toBe('T02');
    });

    it('cannot approve a class without teacher and schedule (E01)', async () => {
      const created = await request(server())
        .post('/classes')
        .set(secretary)
        .send({ semesterId, subjectId: cc101, seats: 20 })
        .expect(201);
      const res = await request(server()).post(`/classes/${created.body.id}/approve`).set(secretary).expect(400);
      expect(res.body.message).toContain('professor e horário');
    });

    it('keeps pending classes out of the open catalogue until approved (RN01)', async () => {
      const cls = await makeClass(app, secretary, {
        semesterId, subjectId: cc102, teacherId: carolId, approve: false,
        schedules: [slot(2, '08:00', '10:00')],
      });
      let available = await request(server()).get('/classes/available?pageSize=100').set(student).expect(200);
      expect(available.body.items.some((c: { id: number }) => c.id === cls.id)).toBe(false);

      const approved = await request(server()).post(`/classes/${cls.id}/approve`).set(secretary).expect(200);
      expect(approved.body.status).toBe('approved');

      available = await request(server()).get('/classes/available?pageSize=100').set(student).expect(200);
      const found = available.body.items.find((c: { id: number }) => c.id === cls.id);
      expect(found).toMatchObject({
        subject: { code: 'CC102' },
        teacher: { name: 'Carol Teacher' },
        availableSeats: 30,
        schedules: [{ weekday: 2, startTime: '08:00', endTime: '10:00' }],
      });
      await request(server()).post(`/classes/${cls.id}/approve`).set(secretary).expect(409);
    });

    it('rejects a class with a reason and keeps it unavailable (A01)', async () => {
      const cls = await makeClass(app, secretary, {
        semesterId, subjectId: mat101, teacherId: frankId, approve: false,
        schedules: [slot(3, '08:00', '10:00')],
      });
      await request(server()).post(`/classes/${cls.id}/reject`).set(secretary).send({}).expect(400);
      const res = await request(server())
        .post(`/classes/${cls.id}/reject`)
        .set(secretary)
        .send({ reason: 'Sala indisponível' })
        .expect(200);
      expect(res.body).toMatchObject({ status: 'rejected', rejectionReason: 'Sala indisponível' });
      await request(server()).post(`/classes/${cls.id}/approve`).set(secretary).expect(409);
    });

    it('validates semester, subject and teacher', async () => {
      const base = { semesterId, subjectId: cc101, seats: 10 };
      await request(server()).post('/classes').set(secretary).send({ ...base, semesterId: 9999 }).expect(400);
      await request(server()).post('/classes').set(secretary).send({ ...base, subjectId: 9999 }).expect(400);
      await request(server()).post('/classes').set(secretary).send({ ...base, teacherId: 9999 }).expect(400);
      await request(server()).post('/classes').set(secretary).send({ ...base, seats: 0 }).expect(400);
      await request(server())
        .post('/classes')
        .set(secretary)
        .send({ ...base, schedules: [slot(1, '10:00', '08:00')] })
        .expect(400);
      await request(server())
        .post('/classes')
        .set(secretary)
        .send({ ...base, schedules: [slot(1, '08:00', '10:00'), slot(1, '09:00', '11:00')] })
        .expect(400);
    });

    it('restricts management routes by role', async () => {
      const body = { semesterId, subjectId: cc101, seats: 10 };
      await request(server()).post('/classes').set(student).send(body).expect(403);
      await request(server()).post('/classes').set(carol).send(body).expect(403);
      await request(server()).post('/classes/1/approve').set(carol).expect(403);
      await request(server()).get('/classes').set(student).expect(403);
      await request(server()).post('/classes').set(admin).send(body).expect(201);
    });
  });

  describe('teacher request (UC09)', () => {
    it('lets a teacher request a class, which stays pending for the Administration', async () => {
      const res = await request(server())
        .post('/classes/requests')
        .set(frank)
        .send({ subjectId: mat101, seats: 25, schedules: [slot(4, '14:00', '16:00')] })
        .expect(201);
      expect(res.body).toMatchObject({
        status: 'pending',
        teacher: { name: 'Frank Teacher' },
        requestedBy: frankId,
      });
      const mine = await request(server()).get('/classes').set(frank).expect(200);
      expect(mine.body.items.some((c: { id: number }) => c.id === res.body.id)).toBe(true);
      await request(server()).post(`/classes/${res.body.id}/approve`).set(secretary).expect(200);
    });

    it('warns about the teacher\'s own schedule conflict (E01)', async () => {
      const res = await request(server())
        .post('/classes/requests')
        .set(frank)
        .send({ subjectId: cc101, seats: 25, schedules: [slot(4, '15:00', '17:00')] })
        .expect(409);
      expect(res.body.code).toBe('MSG03');
    });

    it('requires at least one suggested schedule and a teacher role', async () => {
      await request(server()).post('/classes/requests').set(frank).send({ subjectId: cc101, seats: 5, schedules: [] }).expect(400);
      await request(server())
        .post('/classes/requests')
        .set(student)
        .send({ subjectId: cc101, seats: 5, schedules: [slot(5, '08:00', '10:00')] })
        .expect(403);
    });

    it('scopes the teacher list to their own classes', async () => {
      const mine = await request(server()).get('/classes?pageSize=100').set(frank).expect(200);
      expect(
        mine.body.items.every(
          (c: { teacher: { id: number } | null; requestedBy: number }) =>
            c.teacher?.id === frankId || c.requestedBy === frankId,
        ),
      ).toBe(true);
      const all = await request(server()).get('/classes?pageSize=100').set(secretary).expect(200);
      expect(all.body.total).toBeGreaterThan(mine.body.total);
    });
  });

  describe('allocation and schedules (REQ07, REQ08, RN02, UC07)', () => {
    it('blocks overlapping classes for the same teacher (RN02) with MSG03', async () => {
      await makeClass(app, secretary, {
        semesterId, subjectId: cc101, teacherId: carolId, schedules: [slot(5, '08:00', '10:00')],
      });
      const res = await request(server())
        .post('/classes')
        .set(secretary)
        .send({ semesterId, subjectId: cc102, teacherId: carolId, seats: 10, schedules: [slot(5, '09:00', '11:00')] })
        .expect(409);
      expect(res.body).toMatchObject({ code: 'MSG03' });
      expect(res.body.message).toContain('Introduction to Programming');
    });

    it('accepts back-to-back classes and other weekdays', async () => {
      await request(server())
        .post('/classes')
        .set(secretary)
        .send({ semesterId, subjectId: cc102, teacherId: carolId, seats: 10, schedules: [slot(5, '10:00', '12:00')] })
        .expect(201);
      await request(server())
        .post('/classes')
        .set(secretary)
        .send({ semesterId, subjectId: cc102, teacherId: carolId, seats: 10, schedules: [slot(6, '08:00', '10:00')] })
        .expect(201);
    });

    it('revalidates when schedules are replaced (A01)', async () => {
      const cls = await makeClass(app, secretary, {
        semesterId, subjectId: mat101, teacherId: carolId, approve: false,
        schedules: [slot(7, '08:00', '10:00')],
      });
      await request(server())
        .put(`/classes/${cls.id}/schedules`)
        .set(secretary)
        .send({ schedules: [slot(5, '08:30', '09:30')] })
        .expect(409);
      const ok = await request(server())
        .put(`/classes/${cls.id}/schedules`)
        .set(secretary)
        .send({ schedules: [slot(7, '10:00', '12:00'), slot(3, '18:00', '20:00')] })
        .expect(200);
      expect(ok.body.schedules).toEqual([
        { weekday: 3, startTime: '18:00', endTime: '20:00', room: null },
        { weekday: 7, startTime: '10:00', endTime: '12:00', room: null },
      ]);
    });

    it('revalidates when the teacher changes', async () => {
      const cls = await makeClass(app, secretary, {
        semesterId, subjectId: mat101, teacherId: frankId, approve: false,
        schedules: [slot(5, '08:00', '10:00')],
      });
      // Carol teaches CC101 on Friday 08:00-10:00.
      await request(server()).patch(`/classes/${cls.id}`).set(secretary).send({ teacherId: carolId }).expect(409);
      await request(server()).patch(`/classes/${cls.id}`).set(secretary).send({ teacherId: 9999 }).expect(400);
    });

    it('ignores classes of closed outcomes and of other semesters', async () => {
      const other = await openSemester(app, secretary, 2027, 1);
      await request(server())
        .post('/classes')
        .set(secretary)
        .send({ semesterId: other, subjectId: cc101, teacherId: carolId, seats: 10, schedules: [slot(5, '08:00', '10:00')] })
        .expect(201);
    });

    it('frees the slot of a rejected class', async () => {
      const cls = await makeClass(app, secretary, {
        semesterId, subjectId: mat101, teacherId: frankId, approve: false,
        schedules: [slot(2, '20:00', '21:00')],
      });
      await request(server()).post(`/classes/${cls.id}/reject`).set(secretary).send({ reason: 'Sem demanda' }).expect(200);
      await request(server())
        .post('/classes')
        .set(secretary)
        .send({ semesterId, subjectId: cc101, teacherId: frankId, seats: 5, schedules: [slot(2, '20:00', '21:00')] })
        .expect(201);
    });
  });

  describe('seats (RN15)', () => {
    it('updates seats and refuses values below the enrolled students', async () => {
      const cls = await makeClass(app, secretary, {
        semesterId, subjectId: cc101, teacherId: frankId, seats: 5,
        schedules: [slot(1, '19:00', '21:00')],
      });
      const now = new Date().toISOString();
      const studentId = await userIdOf(ds, SEEDED.student);
      const other = await userIdOf(ds, '44455566619');
      await ds.query(
        `INSERT INTO enrollments (student_id, class_id, status, requested_at, confirmed_at) VALUES (?, ?, 'confirmed', ?, ?), (?, ?, 'confirmed', ?, ?)`,
        [studentId, cls.id, now, now, other, cls.id, now, now],
      );
      await request(server()).patch(`/classes/${cls.id}`).set(secretary).send({ seats: 1 }).expect(400);
      const ok = await request(server()).patch(`/classes/${cls.id}`).set(secretary).send({ seats: 2 }).expect(200);
      expect(ok.body).toMatchObject({ seats: 2, enrolledCount: 2, availableSeats: 0 });
    });
  });

  describe('reading', () => {
    it('shows a class to students only when approved', async () => {
      const pending = await makeClass(app, secretary, {
        semesterId, subjectId: mat101, teacherId: frankId, approve: false,
        schedules: [slot(6, '14:00', '16:00')],
      });
      await request(server()).get(`/classes/${pending.id}`).set(student).expect(403);
      await request(server()).get(`/classes/${pending.id}`).set(frank).expect(200);
      await request(server()).get(`/classes/${pending.id}`).set(carol).expect(403);
      await request(server()).post(`/classes/${pending.id}/approve`).set(secretary).expect(200);
      await request(server()).get(`/classes/${pending.id}`).set(student).expect(200);
      await request(server()).get('/classes/99999').set(student).expect(404);
    });

    it('filters the catalogue by subject and search term', async () => {
      const res = await request(server()).get('/classes/available?q=Programming&pageSize=100').set(student).expect(200);
      expect(res.body.items.length).toBeGreaterThan(0);
      expect(res.body.items.every((c: { subject: { code: string } }) => c.subject.code === 'CC101')).toBe(true);
    });
  });
});

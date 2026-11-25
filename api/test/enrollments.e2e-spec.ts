import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { ClockService } from '../src/common/clock/clock.service';
import {
  Auth,
  IN_ENROLLMENT,
  SEEDED,
  bootstrapApp,
  loginAs,
  makeClass,
  openSemester,
  subjectIdOf,
  userIdOf,
} from './helpers';

const IVAN = '44455566619';
const JUDY = '55566677720';
const KARL = '66677788830';

/** Enrollment requests (UC01): everything checked before the allocation. */
describe('Enrollment requests (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let clock: ClockService;
  let secretary: Auth;
  let erin: Auth;
  let ivan: Auth;
  let judy: Auth;
  let karl: Auth;
  let carol: Auth;
  let frank: Auth;
  let semesterId: number;
  let carolId: number;
  let frankId: number;
  let graceId: number;
  const subjects: Record<string, number> = {};
  const server = () => app.getHttpServer();

  const slot = (weekday: number, startTime: string, endTime: string) => ({ weekday, startTime, endTime });
  const enroll = (who: Auth, classId: number) =>
    request(server()).post('/enrollments').set(who).send({ classId });
  const newClass = (code: string, teacherId: number, weekday: number, seats = 30, approve = true) =>
    makeClass(app, secretary, {
      semesterId, subjectId: subjects[code], teacherId, seats, approve,
      schedules: [slot(weekday, '08:00', '10:00')],
    });
  const view = async (classId: number, who = secretary) =>
    (await request(server()).get(`/classes/${classId}`).set(who).expect(200)).body;

  beforeAll(async () => {
    ({ app, ds } = await bootstrapApp());
    clock = app.get(ClockService);
    clock.setNow(IN_ENROLLMENT);
    secretary = await loginAs(app, SEEDED.secretary);
    erin = await loginAs(app, SEEDED.student);
    ivan = await loginAs(app, IVAN);
    judy = await loginAs(app, JUDY);
    karl = await loginAs(app, KARL);
    carol = await loginAs(app, SEEDED.teacher);
    frank = await loginAs(app, '12121212108');
    carolId = await userIdOf(ds, SEEDED.teacher);
    frankId = await userIdOf(ds, '12121212108');
    graceId = await userIdOf(ds, '22233344405');
    for (const code of ['CC101', 'CC102', 'CC103', 'MAT101', 'MAT103', 'MAT104', 'STA101']) {
      subjects[code] = await subjectIdOf(app, secretary, code);
    }
    semesterId = await openSemester(app, secretary);
  });
  afterAll(async () => {
    clock.setNow(null);
    await app.close();
  });

  it('registers a request, not a seat: nothing is confirmed until the period ends', async () => {
    const cls = await newClass('CC101', carolId, 1, 5);
    const res = await enroll(erin, cls.id).expect(201);
    expect(res.body).toMatchObject({
      status: 'requested',
      confirmedAt: null,
      class: { id: cls.id, enrolledCount: 0, requestedCount: 1, availableSeats: 5 },
    });

    const mine = await request(server()).get('/enrollments/me').set(erin).expect(200);
    expect(mine.body).toHaveLength(1);
    expect(mine.body[0].status).toBe('requested');
  });

  it('keeps a request out of the roll, the panel and the teacher\'s work', async () => {
    const [{ class: cls }] = (await request(server()).get('/enrollments/me').set(erin)).body;
    const roster = await request(server()).get(`/classes/${cls.id}/enrollments`).set(carol).expect(200);
    expect(roster.body).toEqual([]);
    const panel = await request(server()).get('/me/academic-panel').set(erin).expect(200);
    expect(panel.body.classes).toEqual([]);
  });

  it('shows the student their own request in the catalogue', async () => {
    const cls = (await request(server()).get('/classes/available?q=CC101').set(erin)).body.items[0];
    expect(cls).toMatchObject({ alreadyEnrolled: true, myStatus: 'requested', requestedCount: 1 });
    const other = (await request(server()).get('/classes/available?q=CC101').set(ivan)).body.items[0];
    expect(other.alreadyEnrolled).toBe(false);
  });

  it('blocks a second request for the same class', async () => {
    const cls = (await request(server()).get('/enrollments/me').set(erin)).body[0].class;
    const res = await enroll(erin, cls.id).expect(409);
    expect(res.body.message).toContain('já solicitou');
  });

  it('does not check the seats at request time: demand may exceed the seats', async () => {
    const cls = await newClass('MAT104', graceId, 5, 1);
    await enroll(ivan, cls.id).expect(201);
    await enroll(erin, cls.id).expect(201);
    expect(await view(cls.id)).toMatchObject({ seats: 1, enrolledCount: 0, requestedCount: 2, availableSeats: 1 });
  });

  describe('period and class state (E04, RN01)', () => {
    it('refuses requests outside the calendar window', async () => {
      const cls = await newClass('MAT103', frankId, 2);
      clock.setNow('2026-03-01T12:00:00Z');
      const res = await enroll(ivan, cls.id).expect(400);
      expect(res.body.code).toBe('ENROLLMENT_CLOSED');
      clock.setNow('2026-01-10T12:00:00Z');
      await enroll(ivan, cls.id).expect(400);
      clock.setNow(IN_ENROLLMENT);
      await enroll(ivan, cls.id).expect(201);
    });

    it('refuses a class that is not approved', async () => {
      const cls = await newClass('STA101', frankId, 3, 30, false);
      const res = await enroll(ivan, cls.id).expect(400);
      expect(res.body.code).toBe('CLASS_NOT_OPEN');
    });

    it('returns 404 for an unknown class and 400 for a bad body', async () => {
      await enroll(ivan, 99999).expect(404);
      await request(server()).post('/enrollments').set(ivan).send({}).expect(400);
    });
  });

  describe('eligibility', () => {
    it('only active students can request (a locked student is refused)', async () => {
      const cls = await newClass('CC103', graceId, 4);
      const res = await enroll(karl, cls.id).expect(400);
      expect(res.body.code).toBe('STUDENT_NOT_ACTIVE');
    });

    it('is a student-only action', async () => {
      const cls = await newClass('CC102', carolId, 7);
      await enroll(carol, cls.id).expect(403);
      await enroll(secretary, cls.id).expect(403);
      await request(server()).post('/enrollments').send({ classId: cls.id }).expect(401);
    });

    it('requires the subject to be in the student\'s curriculum', async () => {
      const cls = await newClass('CC102', carolId, 6);
      const res = await enroll(judy, cls.id).expect(400);
      expect(res.body.code).toBe('SUBJECT_NOT_IN_CURRICULUM');
    });
  });

  describe('prerequisites (RN04, E01, MSG01)', () => {
    it('refuses without approval in the prerequisite and accepts after it', async () => {
      const cc102 = (await request(server()).get('/classes/available?q=CC102').set(erin)).body.items[0];
      const res = await enroll(erin, cc102.id).expect(400);
      expect(res.body).toMatchObject({ code: 'MSG01' });
      expect(res.body.message).toContain('CC101');

      // A merely requested or in-progress CC101 is not enough; approval is.
      const cc101 = (await request(server()).get('/enrollments/me').set(erin)).body.find(
        (e: { class: { subject: { code: string } } }) => e.class.subject.code === 'CC101',
      );
      await ds.query(`UPDATE enrollments SET status = 'approved' WHERE id = ?`, [cc101.id]);
      await enroll(erin, cc102.id).expect(201);
    });

    it('refuses to retake a subject already passed', async () => {
      const again = await newClass('CC101', graceId, 7);
      await enroll(erin, again.id).expect(409);
    });
  });

  describe('schedule overlap (RN05, E02, MSG03)', () => {
    it('refuses a request that overlaps another request of the same student', async () => {
      // Ivan requested MAT103 on Tuesday 08-10.
      const clash = await makeClass(app, secretary, {
        semesterId, subjectId: subjects.MAT101, teacherId: graceId,
        schedules: [slot(2, '09:00', '11:00')],
      });
      const res = await enroll(ivan, clash.id).expect(409);
      expect(res.body).toMatchObject({ code: 'MSG03' });
      expect(res.body.message).toContain('Linear Algebra');
    });

    it('accepts back-to-back classes', async () => {
      const next = await makeClass(app, secretary, {
        semesterId, subjectId: subjects.MAT101, teacherId: carolId,
        schedules: [slot(2, '10:00', '12:00')],
      });
      await enroll(ivan, next.id).expect(201);
    });
  });

  describe('withdrawing a request', () => {
    it('cancels freely before the allocation, even past the withdrawal deadline', async () => {
      const cls = await newClass('STA101', frankId, 6);
      const created = await enroll(judy, cls.id).expect(201);
      clock.setNow('2026-02-19T12:00:00Z');
      await request(server()).post(`/enrollments/${created.body.id}/lock`).set(judy).expect(409);
      const cancelled = await request(server()).delete(`/enrollments/${created.body.id}`).set(judy).expect(200);
      expect(cancelled.body.status).toBe('cancelled');
      expect(cancelled.body.class.requestedCount).toBe(0);
      await request(server()).delete(`/enrollments/${created.body.id}`).set(judy).expect(409);

      // The same row is reused when the student asks again.
      clock.setNow(IN_ENROLLMENT);
      const again = await enroll(judy, cls.id).expect(201);
      expect(again.body).toMatchObject({ id: created.body.id, status: 'requested' });
    });

    it('does not let a student touch someone else\'s request', async () => {
      const ivans = (await request(server()).get('/enrollments/me').set(ivan)).body[0];
      await request(server()).delete(`/enrollments/${ivans.id}`).set(erin).expect(404);
      await request(server()).delete('/enrollments/99999').set(erin).expect(404);
    });
  });

  it('audits each request', async () => {
    const admin = await loginAs(app, SEEDED.admin);
    const audit = await request(server()).get('/audit?action=enrollment.request&pageSize=100').set(admin).expect(200);
    expect(audit.body.total).toBeGreaterThan(5);
    void frank;
  });
});

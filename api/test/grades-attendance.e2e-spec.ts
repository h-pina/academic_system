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
  allocateSemester,
  openSemester,
  subjectIdOf,
  userIdOf,
} from './helpers';

const IVAN = '44455566619';
const JUDY = '55566677720';
const HEIDI = '33344455508';
const FRANK = '12121212108';
// Mondays of the semester (the class meets on Mondays).
const MONDAYS = ['2026-03-02', '2026-03-09', '2026-03-16', '2026-03-23'];

describe('Grades, attendance and results (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let clock: ClockService;
  let admin: Auth;
  let secretary: Auth;
  let carol: Auth;
  let frank: Auth;
  const students: Record<string, Auth> = {};
  const enrollment: Record<string, number> = {};
  let classId: number;
  let exam: number;
  let project: number;
  const server = () => app.getHttpServer();

  const post = (assessmentId: number, entries: object[], who = carol) =>
    request(server()).put(`/assessments/${assessmentId}/grades`).set(who).send({ entries });
  const record = (date: string, records: object[], who = carol) =>
    request(server()).put(`/classes/${classId}/attendance`).set(who).send({ date, records });
  const sheet = async (who = carol) =>
    (await request(server()).get(`/classes/${classId}/grades`).set(who).expect(200)).body;
  const row = (body: { rows: { name: string }[] }, name: string) =>
    body.rows.find((r) => r.name.startsWith(name)) as Record<string, unknown>;

  beforeAll(async () => {
    ({ app, ds } = await bootstrapApp());
    clock = app.get(ClockService);
    clock.setNow(IN_ENROLLMENT);
    admin = await loginAs(app, SEEDED.admin);
    secretary = await loginAs(app, SEEDED.secretary);
    carol = await loginAs(app, SEEDED.teacher);
    frank = await loginAs(app, FRANK);
    students.Erin = await loginAs(app, SEEDED.student);
    students.Ivan = await loginAs(app, IVAN);
    students.Judy = await loginAs(app, JUDY);
    students.Heidi = await loginAs(app, HEIDI);

    const semesterId = await openSemester(app, secretary);
    const cls = await makeClass(app, secretary, {
      semesterId,
      subjectId: await subjectIdOf(app, secretary, 'CC101'),
      teacherId: await userIdOf(ds, SEEDED.teacher),
      schedules: [{ weekday: 1, startTime: '08:00', endTime: '10:00' }],
    });
    classId = cls.id;
    for (const [name, auth] of Object.entries(students)) {
      const res = await request(server()).post('/enrollments').set(auth).send({ classId }).expect(201);
      enrollment[name] = res.body.id;
    }
    await allocateSemester(app, secretary, semesterId);
    clock.setNow('2026-04-01T12:00:00Z');
  });
  afterAll(async () => {
    clock.setNow(null);
    await app.close();
  });

  describe('assessments (RN12)', () => {
    it('lets only the responsible teacher define them', async () => {
      const body = { name: 'Prova 1', weight: 3 };
      await request(server()).post(`/classes/${classId}/assessments`).set(frank).send(body).expect(403);
      await request(server()).post(`/classes/${classId}/assessments`).set(secretary).send(body).expect(403);
      await request(server()).post(`/classes/${classId}/assessments`).set(students.Erin).send(body).expect(403);
      const created = await request(server()).post(`/classes/${classId}/assessments`).set(carol).send(body).expect(201);
      exam = created.body.id;
      expect(created.body.maxScore).toBe(10);
      const second = await request(server())
        .post(`/classes/${classId}/assessments`)
        .set(carol)
        .send({ name: 'Trabalho', weight: 1, maxScore: 20 })
        .expect(201);
      project = second.body.id;
    });

    it('validates the body and lists for teacher and Administration', async () => {
      await request(server()).post(`/classes/${classId}/assessments`).set(carol).send({ name: 'x', weight: 0 }).expect(400);
      for (const who of [carol, secretary]) {
        const list = await request(server()).get(`/classes/${classId}/assessments`).set(who).expect(200);
        expect(list.body).toHaveLength(2);
      }
      await request(server()).get(`/classes/${classId}/assessments`).set(frank).expect(403);
    });
  });

  describe('posting grades (REQ11, UC10)', () => {
    it('rejects values outside the assessment scale (E02)', async () => {
      const res = await post(exam, [{ enrollmentId: enrollment.Erin, value: 10.5 }]).expect(400);
      expect(res.body.code).toBe('GRADE_OUT_OF_RANGE');
      await post(exam, [{ enrollmentId: enrollment.Erin, value: -1 }]).expect(400);
      await post(project, [{ enrollmentId: enrollment.Erin, value: 21 }]).expect(400);
    });

    it('rejects enrollments of other classes and repeated students', async () => {
      await post(exam, [{ enrollmentId: 99999, value: 5 }]).expect(400);
      await post(exam, [
        { enrollmentId: enrollment.Erin, value: 5 },
        { enrollmentId: enrollment.Erin, value: 6 },
      ]).expect(400);
    });

    it('allows only the responsible teacher to post (RN12)', async () => {
      const entries = [{ enrollmentId: enrollment.Erin, value: 8 }];
      await post(exam, entries, frank).expect(403);
      await post(exam, entries, students.Erin).expect(403);
      await post(exam, entries, secretary).expect(403);
      await post(99999, entries).expect(404);
    });

    it('posts, corrects (A01) and computes running and final averages', async () => {
      const first = await post(exam, [
        { enrollmentId: enrollment.Erin, value: 8 },
        { enrollmentId: enrollment.Ivan, value: 10 },
        { enrollmentId: enrollment.Judy, value: 4 },
        { enrollmentId: enrollment.Heidi, value: 7 },
      ]).expect(200);
      expect(row(first.body, 'Erin').partialAverage).toBe(8);
      expect(row(first.body, 'Erin').finalGrade).toBeNull();

      await post(exam, [{ enrollmentId: enrollment.Erin, value: 9 }]).expect(200);
      await post(project, [
        { enrollmentId: enrollment.Erin, value: 15 },
        { enrollmentId: enrollment.Ivan, value: 20 },
        { enrollmentId: enrollment.Judy, value: 8 },
      ]).expect(200);

      const body = await sheet();
      // Erin: (9*3 + 7.5*1)/4 = 8.625, rounded half up to 8.63
      expect(row(body, 'Erin')).toMatchObject({ finalGrade: 8.63, result: 'approved' });
      expect(row(body, 'Judy')).toMatchObject({ finalGrade: 4, result: 'failed_grade' });
      expect(row(body, 'Heidi')).toMatchObject({ finalGrade: null, result: 'in_progress' });
    });

    it('hides the grade sheet from other teachers and students', async () => {
      await request(server()).get(`/classes/${classId}/grades`).set(frank).expect(403);
      await request(server()).get(`/classes/${classId}/grades`).set(students.Erin).expect(403);
      await request(server()).get(`/classes/${classId}/grades`).set(secretary).expect(200);
    });

    it('uses the institution\'s minimum passing grade (RN07)', async () => {
      await request(server()).put('/settings').set(admin).send({ minPassingGrade: 9 }).expect(200);
      expect(row(await sheet(), 'Erin').result).toBe('failed_grade');
      await request(server()).put('/settings').set(admin).send({ minPassingGrade: 6 }).expect(200);
      expect(row(await sheet(), 'Erin').result).toBe('approved');
    });
  });

  describe('attendance (REQ12, UC11, RN08, RN09, RN13)', () => {
    const everyone = (present: Record<string, boolean>) =>
      Object.entries(present).map(([name, value]) => ({ enrollmentId: enrollment[name], present: value }));

    it('refuses future dates (E01)', async () => {
      const res = await record('2026-04-06', everyone({ Erin: true })).expect(400);
      expect(res.body.code).toBe('FUTURE_DATE');
    });

    it('refuses a date on which the class does not meet', async () => {
      const res = await record('2026-03-03', everyone({ Erin: true })).expect(400);
      expect(res.body.code).toBe('NOT_A_CLASS_DAY');
      await record('2026-01-05', everyone({ Erin: true })).expect(400);
      await record('2026-02-30', everyone({ Erin: true })).expect(400);
    });

    it('is exclusive to the teacher in charge (RN09)', async () => {
      const records = everyone({ Erin: true });
      await record(MONDAYS[0], records, frank).expect(403);
      await record(MONDAYS[0], records, secretary).expect(403);
      await record(MONDAYS[0], records, admin).expect(403);
      await record(MONDAYS[0], records, students.Erin).expect(403);
    });

    it('rejects foreign enrollments', async () => {
      await record(MONDAYS[0], [{ enrollmentId: 99999, present: true }]).expect(400);
    });

    it('records the roll calls and computes absence percentages', async () => {
      await record(MONDAYS[0], everyone({ Erin: true, Ivan: true, Judy: true, Heidi: true })).expect(200);
      await record(MONDAYS[1], everyone({ Erin: false, Ivan: false, Judy: true, Heidi: true })).expect(200);
      await record(MONDAYS[2], everyone({ Erin: true, Ivan: false, Judy: true, Heidi: true })).expect(200);
      const res = await record(MONDAYS[3], everyone({ Erin: true, Ivan: true, Judy: true, Heidi: true })).expect(200);
      expect(res.body.lessonDates).toEqual(MONDAYS);
      const erin = res.body.students.find((s: { name: string }) => s.name.startsWith('Erin'));
      expect(erin).toMatchObject({ absences: 1, absencePercent: 25, present: true });
    });

    it('lets the teacher correct a past date (A01)', async () => {
      await record(MONDAYS[3], everyone({ Ivan: false })).expect(200);
      await record(MONDAYS[3], everyone({ Ivan: true })).expect(200);
      const roll = await request(server()).get(`/classes/${classId}/attendance?date=${MONDAYS[1]}`).set(carol).expect(200);
      expect(roll.body.students.find((s: { name: string }) => s.name.startsWith('Ivan')).present).toBe(false);
    });

    it('shows the roll to the Administration but not to other teachers', async () => {
      await request(server()).get(`/classes/${classId}/attendance`).set(secretary).expect(200);
      await request(server()).get(`/classes/${classId}/attendance`).set(frank).expect(403);
      await request(server()).get(`/classes/${classId}/attendance`).set(students.Erin).expect(403);
    });

    it('treats exactly 25 % as allowed and more as failing, whatever the grades (RN08)', async () => {
      const body = await sheet();
      expect(row(body, 'Erin')).toMatchObject({ absencePercent: 25, result: 'approved' });
      // Ivan: 2 absences out of 4 = 50 %, with perfect grades.
      expect(row(body, 'Ivan')).toMatchObject({ absencePercent: 50, finalGrade: 10, result: 'failed_attendance' });
    });
  });

  describe('grade deadline and reopening (RN14, UC10 E01)', () => {
    it('blocks posting after the calendar deadline', async () => {
      clock.setNow('2026-07-20T12:00:00Z');
      const res = await post(exam, [{ enrollmentId: enrollment.Heidi, value: 7 }]).expect(403);
      expect(res.body.code).toBe('GRADES_DEADLINE_PASSED');
      expect((await sheet()).gradesOpen).toBe(false);
    });

    it('needs a justification and is analysed by the Administration', async () => {
      await request(server()).post(`/classes/${classId}/grade-reopenings`).set(carol).send({ justification: 'curta' }).expect(400);
      await request(server()).post(`/classes/${classId}/grade-reopenings`).set(frank).send({ justification: 'Atestado médico do professor' }).expect(403);
      const pending = await request(server())
        .post(`/classes/${classId}/grade-reopenings`)
        .set(carol)
        .send({ justification: 'Atestado médico do professor' })
        .expect(201);
      expect(pending.body.status).toBe('pending');
      // Still closed while pending.
      await post(exam, [{ enrollmentId: enrollment.Heidi, value: 7 }]).expect(403);

      await request(server()).post(`/grade-reopenings/${pending.body.id}/approve`).set(carol).send({ openUntil: '2026-07-25' }).expect(403);
      await request(server()).post(`/grade-reopenings/${pending.body.id}/approve`).set(secretary).send({ openUntil: '2026-07-01' }).expect(400);
      await request(server()).post(`/grade-reopenings/${pending.body.id}/approve`).set(secretary).send({ openUntil: '2026-07-25' }).expect(200);
      await request(server()).post(`/grade-reopenings/${pending.body.id}/reject`).set(secretary).expect(409);

      await post(exam, [{ enrollmentId: enrollment.Heidi, value: 7 }]).expect(200);
      clock.setNow('2026-07-26T12:00:00Z');
      await post(exam, [{ enrollmentId: enrollment.Heidi, value: 7 }]).expect(403);
    });

    it('can be rejected, or opened directly by the Administration', async () => {
      const pending = await request(server())
        .post(`/classes/${classId}/grade-reopenings`)
        .set(carol)
        .send({ justification: 'Segundo pedido de liberação' })
        .expect(201);
      await request(server()).post(`/grade-reopenings/${pending.body.id}/reject`).set(secretary).expect(200);
      await post(exam, [{ enrollmentId: enrollment.Heidi, value: 7 }]).expect(403);

      await request(server()).post(`/classes/${classId}/grade-reopenings`).set(secretary).send({ justification: 'Liberação administrativa' }).expect(400);
      await request(server())
        .post(`/classes/${classId}/grade-reopenings`)
        .set(secretary)
        .send({ justification: 'Liberação administrativa', openUntil: '2026-08-01' })
        .expect(201);
      await post(exam, [{ enrollmentId: enrollment.Heidi, value: 7 }]).expect(200);

      const mine = await request(server()).get('/grade-reopenings').set(carol).expect(200);
      expect(mine.body.every((r: { requestedBy: number }) => r.requestedBy !== undefined)).toBe(true);
      const all = await request(server()).get('/grade-reopenings?status=pending').set(secretary).expect(200);
      expect(all.body).toEqual([]);
    });
  });

  describe('finalizing a class', () => {
    it('refuses while grades are missing', async () => {
      clock.setNow('2026-07-01T12:00:00Z');
      const res = await request(server()).post(`/classes/${classId}/finalize`).set(carol).expect(400);
      expect(res.body.message).toContain('Heidi');
    });

    it('stores the outcomes and closes the class', async () => {
      await post(project, [{ enrollmentId: enrollment.Heidi, value: 14 }]).expect(200);
      await request(server()).post(`/classes/${classId}/finalize`).set(frank).expect(403);
      const res = await request(server()).post(`/classes/${classId}/finalize`).set(carol).expect(200);
      expect(row(res.body, 'Erin').enrollmentStatus).toBe('approved');
      expect(row(res.body, 'Ivan').enrollmentStatus).toBe('failed_attendance');
      expect(row(res.body, 'Judy').enrollmentStatus).toBe('failed_grade');
      expect(row(res.body, 'Heidi').enrollmentStatus).toBe('approved');
      await request(server()).post(`/classes/${classId}/finalize`).set(carol).expect(409);

      const view = await request(server()).get(`/classes/${classId}`).set(secretary).expect(200);
      expect(view.body.status).toBe('closed');
      const stored = await ds.query('SELECT status, final_grade FROM enrollments WHERE id = ?', [enrollment.Ivan]);
      expect(stored[0]).toEqual({ status: 'failed_attendance', final_grade: 10 });
    });

    it('refreshes the outcome when a grade of a closed class is corrected', async () => {
      clock.setNow('2026-07-01T12:00:00Z');
      await post(exam, [{ enrollmentId: enrollment.Judy, value: 10 }]).expect(200);
      await post(project, [{ enrollmentId: enrollment.Judy, value: 20 }]).expect(200);
      const stored = await ds.query('SELECT status FROM enrollments WHERE id = ?', [enrollment.Judy]);
      expect(stored[0].status).toBe('approved');
    });

    it('feeds the prerequisite rule: an approved CC101 unlocks CC102 (RN04)', async () => {
      clock.setNow(IN_ENROLLMENT);
      const semesterId = (await request(server()).get('/semesters?status=active').set(secretary)).body[0].id;
      const cc102 = await makeClass(app, secretary, {
        semesterId,
        subjectId: await subjectIdOf(app, secretary, 'CC102'),
        teacherId: await userIdOf(ds, SEEDED.teacher),
        schedules: [{ weekday: 3, startTime: '08:00', endTime: '10:00' }],
      });
      // Erin passed CC101; Ivan failed by attendance; both study Computer Science.
      await request(server()).post('/enrollments').set(students.Erin).send({ classId: cc102.id }).expect(201);
      const denied = await request(server()).post('/enrollments').set(students.Ivan).send({ classId: cc102.id }).expect(400);
      expect(denied.body.code).toBe('MSG01');
    });
  });
});

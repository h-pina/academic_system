import { INestApplication } from '@nestjs/common';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { ClockService } from '../src/common/clock/clock.service';
import { EnrollmentsService } from '../src/features/enrollments/enrollments.service';
import {
  AFTER_ENROLLMENT,
  Auth,
  IN_ENROLLMENT,
  SEEDED,
  TERM,
  bootstrapApp,
  loginAs,
  makeClass,
  openSemester,
  subjectIdOf,
  userIdOf,
} from './helpers';

const IVAN = '44455566619';

/** The seats are decided by themselves when the enrollment period ends. */
describe('Automatic allocation (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let clock: ClockService;
  let admin: Auth;
  let secretary: Auth;
  let erin: Auth;
  let ivan: Auth;
  let frankId: number;
  let sta101: number;
  const server = () => app.getHttpServer();

  /** A fresh semester with one class of one seat, requested by Ivan and then Erin. */
  async function semesterWithRequests(year: number) {
    clock.setNow(IN_ENROLLMENT);
    const semesterId = await openSemester(app, secretary, year);
    const cls = await makeClass(app, secretary, { semesterId, subjectId: sta101, teacherId: frankId, seats: 1 });
    clock.setNow('2026-02-10T09:00:00Z');
    await request(server()).post('/enrollments').set(ivan).send({ classId: cls.id }).expect(201);
    clock.setNow('2026-02-10T10:00:00Z');
    await request(server()).post('/enrollments').set(erin).send({ classId: cls.id }).expect(201);
    return { semesterId, classId: cls.id };
  }
  const statuses = async (classId: number) =>
    (await ds.query('SELECT s.status FROM enrollments s WHERE s.class_id = ? ORDER BY s.id', [classId])).map(
      (row: { status: string }) => row.status,
    );

  beforeAll(async () => {
    ({ app, ds } = await bootstrapApp());
    process.env.AUTO_ALLOCATE = 'true';
    clock = app.get(ClockService);
    admin = await loginAs(app, SEEDED.admin);
    secretary = await loginAs(app, SEEDED.secretary);
    erin = await loginAs(app, SEEDED.student);
    ivan = await loginAs(app, IVAN);
    frankId = await userIdOf(ds, '12121212108');
    sta101 = await subjectIdOf(app, secretary, 'STA101');
  });
  afterEach(() => {
    clock.reset();
  });
  afterAll(async () => {
    delete process.env.AUTO_ALLOCATE;
    await app.close();
  });

  it('does nothing while the enrollment period is open', async () => {
    const { classId } = await semesterWithRequests(2026);
    clock.setNow('2026-02-20T23:00:00Z'); // the last day is still inside the period
    expect(await app.get(EnrollmentsService).allocateDueSemesters()).toEqual([]);
    expect(await statuses(classId)).toEqual(['requested', 'requested']);
  });

  it('decides the seats as soon as the clock passes the end of the period (time travel)', async () => {
    clock.setNow(null);
    await request(server()).put('/clock').set(admin).send({ date: TERM.enrollmentEnd }).expect(200);
    expect(await ds.query(`SELECT COUNT(*) AS n FROM enrollments WHERE status = 'requested'`)).toEqual([{ n: 2 }]);

    await request(server()).put('/clock').set(admin).send({ days: 1 }).expect(200);
    // No student looked at anything and nobody clicked: the results already exist.
    expect(await ds.query(`SELECT COUNT(*) AS n FROM enrollments WHERE status = 'requested'`)).toEqual([{ n: 0 }]);
  });

  it('gave the seat by priority and recorded the rest', async () => {
    // Ivan (2025) before Erin (2026), whatever the request order.
    const rows = await ds.query(
      `SELECT u.name, e.status FROM enrollments e JOIN users u ON u.id = e.student_id ORDER BY e.id`,
    );
    expect(rows).toEqual([
      { name: 'Ivan Student', status: 'confirmed' },
      { name: 'Erin Student', status: 'not_allocated' },
    ]);
    const mine = await request(server()).get('/enrollments/me').set(erin).expect(200);
    expect(mine.body[0].status).toBe('not_allocated');
  });

  it('is recorded as automatic in the audit trail, and the manual action finds nothing left', async () => {
    const audit = await request(server()).get('/audit?action=enrollment.allocate').set(admin).expect(200);
    expect(JSON.parse(audit.body.items[0].details)).toEqual({ allocated: 1, notAllocated: 1, automatic: true });
    const semesterId = (await request(server()).get('/semesters').set(admin)).body[0].id;
    clock.setNow(AFTER_ENROLLMENT);
    const again = await request(server()).post(`/semesters/${semesterId}/allocate`).set(secretary).expect(200);
    expect(again.body).toMatchObject({ allocated: 0, notAllocated: 0 });
  });

  it('also catches up when a student looks at their enrollments (no timer, no travel)', async () => {
    const { classId } = await semesterWithRequests(2027);
    clock.setNow(AFTER_ENROLLMENT); // the clock moved by itself, nobody was told
    expect(await statuses(classId)).toEqual(['requested', 'requested']);
    const mine = await request(server()).get('/enrollments/me').set(erin).expect(200);
    const current = mine.body.find((e: { class: { id: number } }) => e.class.id === classId);
    expect(current.status).toBe('not_allocated');
    expect(await statuses(classId)).toEqual(['confirmed', 'not_allocated']);
  });

  it('can be switched off, and then the Administration allocates by hand', async () => {
    const { semesterId, classId } = await semesterWithRequests(2028);
    process.env.AUTO_ALLOCATE = 'false';
    clock.setNow(AFTER_ENROLLMENT);
    await request(server()).get('/enrollments/me').set(erin).expect(200);
    await request(server()).put('/clock').set(admin).send({ date: '2026-03-01' }).expect(200);
    expect(await statuses(classId)).toEqual(['requested', 'requested']);

    const manual = await request(server()).post(`/semesters/${semesterId}/allocate`).set(secretary).expect(200);
    expect(manual.body).toMatchObject({ allocated: 1, notAllocated: 1 });
    process.env.AUTO_ALLOCATE = 'true';
  });

  it('leaves closed or draft semesters alone', async () => {
    clock.setNow(IN_ENROLLMENT);
    const semesterId = await openSemester(app, secretary, 2029);
    const cls = await makeClass(app, secretary, { semesterId, subjectId: sta101, teacherId: frankId, seats: 1 });
    await request(server()).post('/enrollments').set(ivan).send({ classId: cls.id }).expect(201);
    await request(server()).post(`/semesters/${semesterId}/close`).set(secretary).expect(200);
    clock.setNow(AFTER_ENROLLMENT);
    expect(await app.get(EnrollmentsService).allocateDueSemesters()).toEqual([]);
    expect(await statuses(cls.id)).toEqual(['requested']);
  });
});

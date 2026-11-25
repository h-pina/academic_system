import { INestApplication } from '@nestjs/common';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { ClockService } from '../src/common/clock/clock.service';
import { Auth, SEEDED, TERM, bootstrapApp, loginAs, makeClass, openSemester, subjectIdOf, userIdOf } from './helpers';

describe('Time travel (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let clock: ClockService;
  let admin: Auth;
  let secretary: Auth;
  let erin: Auth;
  const server = () => app.getHttpServer();

  beforeAll(async () => {
    ({ app, ds } = await bootstrapApp());
    clock = app.get(ClockService);
    admin = await loginAs(app, SEEDED.admin);
    secretary = await loginAs(app, SEEDED.secretary);
    erin = await loginAs(app, SEEDED.student);
  });
  afterEach(() => {
    clock.reset();
    delete process.env.TIME_TRAVEL;
  });
  afterAll(async () => app.close());

  it('tells every signed-in user the server date', async () => {
    const res = await request(server()).get('/clock').set(erin).expect(200);
    expect(res.body).toMatchObject({ simulated: false, canTravel: true });
    expect(res.body.today).toBe(new Date().toISOString().slice(0, 10));
    await request(server()).get('/clock').expect(401);
  });

  it('lets any signed-in user travel, whatever the profile, but not an anonymous caller', async () => {
    const teacher = await loginAs(app, SEEDED.teacher);
    for (const who of [secretary, erin, teacher]) {
      await request(server()).put('/clock').set(who).send({ date: '2026-03-01' }).expect(200);
      expect((await request(server()).get('/clock').set(admin)).body).toMatchObject({ today: '2026-03-01', simulated: true });
      await request(server()).delete('/clock').set(who).expect(200);
    }
    await request(server()).put('/clock').send({ date: '2026-03-01' }).expect(401);
    await request(server()).delete('/clock').expect(401);
  });

  it('lets a user without a profile travel too', async () => {
    await request(server()).put('/auth/password/reset').send({ identifier: SEEDED.noProfile, newPassword: 'password123' }).expect(200);
    const orphan = await loginAs(app, SEEDED.noProfile);
    await request(server()).put('/clock').set(orphan).send({ days: 1 }).expect(200);
  });

  it('jumps to a date, moves by days and returns to the real time', async () => {
    const jumped = await request(server()).put('/clock').set(admin).send({ date: '2026-03-01' }).expect(200);
    expect(jumped.body).toMatchObject({ today: '2026-03-01', simulated: true });
    const moved = await request(server()).put('/clock').set(admin).send({ days: 10 }).expect(200);
    expect(moved.body.today).toBe('2026-03-11');
    const back = await request(server()).put('/clock').set(admin).send({ days: -11 }).expect(200);
    expect(back.body.today).toBe('2026-02-28');
    const reset = await request(server()).delete('/clock').set(admin).expect(200);
    expect(reset.body.simulated).toBe(false);
  });

  it('validates the request', async () => {
    await request(server()).put('/clock').set(admin).send({}).expect(400);
    await request(server()).put('/clock').set(admin).send({ date: '2026-03-01', days: 1 }).expect(400);
    await request(server()).put('/clock').set(admin).send({ date: '2026-02-30' }).expect(400);
    await request(server()).put('/clock').set(admin).send({ date: '1999-01-01' }).expect(400);
    await request(server()).put('/clock').set(admin).send({ days: 99999 }).expect(400);
  });

  it('can be switched off (as in production)', async () => {
    process.env.TIME_TRAVEL = 'false';
    const res = await request(server()).put('/clock').set(admin).send({ date: '2026-03-01' }).expect(403);
    expect(res.body.code).toBe('TIME_TRAVEL_DISABLED');
    await request(server()).delete('/clock').set(admin).expect(403);
    expect((await request(server()).get('/clock').set(admin)).body.canTravel).toBe(false);
  });

  it('records the trips in the audit trail', async () => {
    await request(server()).put('/clock').set(admin).send({ date: '2026-03-01' }).expect(200);
    const audit = await request(server()).get('/audit?action=clock.travel').set(admin).expect(200);
    expect(audit.body.total).toBeGreaterThan(0);
  });

  it('changes what the rules see: the enrollment period ends and the seats can be allocated', async () => {
    const semesterId = await openSemester(app, secretary);
    const cls = await makeClass(app, secretary, {
      semesterId,
      subjectId: await subjectIdOf(app, secretary, 'CC101'),
      teacherId: await userIdOf(ds, SEEDED.teacher),
    });
    const enroll = () => request(server()).post('/enrollments').set(erin).send({ classId: cls.id });
    const allocate = () => request(server()).post(`/semesters/${semesterId}/allocate`).set(secretary);

    await request(server()).put('/clock').set(admin).send({ date: TERM.enrollmentStart }).expect(200);
    await enroll().expect(201);
    expect((await allocate().expect(400)).body.code).toBe('ENROLLMENT_STILL_OPEN');

    // The last day of the period is still inside it; the next day it is over.
    await request(server()).put('/clock').set(admin).send({ date: TERM.enrollmentEnd }).expect(200);
    await allocate().expect(400);
    await request(server()).put('/clock').set(admin).send({ days: 1 }).expect(200);
    expect((await enroll().expect(400)).body.code).toBe('ENROLLMENT_CLOSED');
    const result = await allocate().expect(200);
    expect(result.body).toMatchObject({ allocated: 1, notAllocated: 0 });
  });
});

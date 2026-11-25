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
const HEIDI = '33344455508';

/**
 * Seat allocation after the enrollment period (RN03): requests are collected
 * during the period and the seats are decided when it ends.
 */
describe('Seat allocation (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let clock: ClockService;
  let secretary: Auth;
  let carol: Auth;
  let erin: Auth;
  let ivan: Auth;
  let judy: Auth;
  let heidi: Auth;
  let semesterId: number;
  let mat104: number; // 1 seat; Heidi (2025) and Ivan (2025) before Erin (2026)
  let cc101: number; // 1 seat; mandatory for Erin, optional for Heidi
  let sta101: number; // 2 seats, nobody competes
  const server = () => app.getHttpServer();

  const requestAt = (when: string, who: Auth, classId: number) => {
    clock.setNow(when);
    return request(server()).post('/enrollments').set(who).send({ classId });
  };
  const statusOf = async (who: Auth, classId: number) =>
    (await request(server()).get('/enrollments/me').set(who)).body.find(
      (e: { class: { id: number } }) => e.class.id === classId,
    )?.status;
  const allocate = (who = secretary) => request(server()).post(`/semesters/${semesterId}/allocate`).set(who);

  beforeAll(async () => {
    ({ app, ds } = await bootstrapApp());
    clock = app.get(ClockService);
    clock.setNow(IN_ENROLLMENT);
    secretary = await loginAs(app, SEEDED.secretary);
    carol = await loginAs(app, SEEDED.teacher);
    erin = await loginAs(app, SEEDED.student);
    ivan = await loginAs(app, IVAN);
    judy = await loginAs(app, JUDY);
    heidi = await loginAs(app, HEIDI);
    const carolId = await userIdOf(ds, SEEDED.teacher);
    const frankId = await userIdOf(ds, '12121212108');
    const graceId = await userIdOf(ds, '22233344405');
    semesterId = await openSemester(app, secretary);
    const slot = (weekday: number) => [{ weekday, startTime: '08:00', endTime: '10:00' }];
    mat104 = (await makeClass(app, secretary, { semesterId, subjectId: await subjectIdOf(app, secretary, 'MAT104'), teacherId: frankId, seats: 1, schedules: slot(1) })).id;
    cc101 = (await makeClass(app, secretary, { semesterId, subjectId: await subjectIdOf(app, secretary, 'CC101'), teacherId: carolId, seats: 1, schedules: slot(2) })).id;
    sta101 = (await makeClass(app, secretary, { semesterId, subjectId: await subjectIdOf(app, secretary, 'STA101'), teacherId: graceId, seats: 2, schedules: slot(3) })).id;
  });
  afterAll(async () => {
    clock.setNow(null);
    await app.close();
  });

  it('collects the requests during the period without deciding anything', async () => {
    // Same cohort (2025) for Heidi and Ivan: the earlier request wins. Erin is 2026.
    await requestAt('2026-02-10T09:00:00Z', erin, mat104).expect(201);
    await requestAt('2026-02-10T11:00:00Z', ivan, mat104).expect(201);
    await requestAt('2026-02-10T10:00:00Z', heidi, mat104).expect(201);
    await requestAt('2026-02-10T08:00:00Z', judy, mat104).expect(201); // Judy: 2026

    // CC101: mandatory for the CC students, optional in Mathematics.
    await requestAt('2026-02-10T08:00:00Z', heidi, cc101).expect(201); // earlier, but optional for her
    await requestAt('2026-02-11T08:00:00Z', erin, cc101).expect(201);

    await requestAt('2026-02-12T08:00:00Z', judy, sta101).expect(201);

    const view = (await request(server()).get(`/classes/${mat104}`).set(secretary)).body;
    expect(view).toMatchObject({ seats: 1, enrolledCount: 0, requestedCount: 4 });
    expect(await statusOf(erin, mat104)).toBe('requested');
  });

  it('cannot run while the enrollment period is still open', async () => {
    clock.setNow('2026-02-15T12:00:00Z');
    const res = await allocate().expect(400);
    expect(res.body.code).toBe('ENROLLMENT_STILL_OPEN');
    expect(res.body.message).toContain('20/02/2026');
  });

  it('is an Administration action', async () => {
    clock.setNow('2026-02-25T12:00:00Z');
    await allocate(carol).expect(403);
    await allocate(erin).expect(403);
    await request(server()).post(`/semesters/${semesterId}/allocate`).expect(401);
    await request(server()).post('/semesters/99999/allocate').set(secretary).expect(404);
  });

  it('lets a request be withdrawn right up to the allocation', async () => {
    const mine = (await request(server()).get('/enrollments/me').set(judy)).body;
    const judysMat104 = mine.find((e: { class: { id: number } }) => e.class.id === mat104);
    await request(server()).delete(`/enrollments/${judysMat104.id}`).set(judy).expect(200);
  });

  it('gives the seats by priority and records who got none', async () => {
    const res = await allocate().expect(200);
    expect(res.body).toMatchObject({ allocated: 3, notAllocated: 3 });
    expect(res.body.classes.find((c: { classId: number }) => c.classId === mat104)).toMatchObject({
      requested: 3, allocated: 1, notAllocated: 2,
    });

    // MAT104: Heidi (2025, 10:00) beats Ivan (2025, 11:00) and Erin (2026).
    expect(await statusOf(heidi, mat104)).toBe('confirmed');
    expect(await statusOf(ivan, mat104)).toBe('not_allocated');
    expect(await statusOf(erin, mat104)).toBe('not_allocated');
    // CC101: mandatory for Erin beats the earlier request of Heidi, for whom it is optional.
    expect(await statusOf(erin, cc101)).toBe('confirmed');
    expect(await statusOf(heidi, cc101)).toBe('not_allocated');
    // No competition: everybody is confirmed.
    expect(await statusOf(judy, sta101)).toBe('confirmed');
  });

  it('now counts only the allocated students in the class and its roll', async () => {
    const view = (await request(server()).get(`/classes/${mat104}`).set(secretary)).body;
    expect(view).toMatchObject({ enrolledCount: 1, requestedCount: 0, availableSeats: 0 });
    const roster = await request(server()).get(`/classes/${mat104}/enrollments`).set(secretary).expect(200);
    expect(roster.body.map((r: { name: string }) => r.name)).toEqual(['Heidi Both']);
    const panel = await request(server()).get('/me/academic-panel').set(ivan).expect(200);
    expect(panel.body.classes).toEqual([]);
  });

  it('is safe to run again and leaves nothing pending', async () => {
    const again = await allocate().expect(200);
    expect(again.body).toMatchObject({ allocated: 0, notAllocated: 0, classes: [] });
  });

  it('no longer takes requests after the period', async () => {
    const res = await request(server()).post('/enrollments').set(ivan).send({ classId: sta101 }).expect(400);
    expect(res.body.code).toBe('ENROLLMENT_CLOSED');
  });

  it('keeps the decision in the audit trail', async () => {
    const admin = await loginAs(app, SEEDED.admin);
    const audit = await request(server()).get('/audit?action=enrollment.allocate').set(admin).expect(200);
    // Newest first: the second run did nothing, the first one decided the seats.
    expect(audit.body.items.map((i: { details: string }) => JSON.parse(i.details))).toEqual([
      { allocated: 0, notAllocated: 0 },
      { allocated: 3, notAllocated: 3 },
    ]);
  });

  describe('after the allocation (RN06)', () => {
    it('lets an allocated student cancel until the withdrawal deadline, freeing the seat', async () => {
      clock.setNow('2026-03-10T12:00:00Z');
      const enrollment = (await request(server()).get('/enrollments/me').set(heidi)).body.find(
        (e: { class: { id: number } }) => e.class.id === mat104,
      );
      const res = await request(server()).delete(`/enrollments/${enrollment.id}`).set(heidi).expect(200);
      expect(res.body).toMatchObject({ status: 'cancelled', class: { availableSeats: 1 } });
    });

    it('lets an allocated student lock, and refuses after the deadline', async () => {
      const judys = (await request(server()).get('/enrollments/me').set(judy)).body.find(
        (e: { class: { id: number } }) => e.class.id === sta101,
      );
      clock.setNow('2026-04-16T12:00:00Z');
      const late = await request(server()).post(`/enrollments/${judys.id}/lock`).set(judy).expect(400);
      expect(late.body.code).toBe('WITHDRAWAL_DEADLINE_PASSED');
      clock.setNow('2026-04-10T12:00:00Z');
      const locked = await request(server()).post(`/enrollments/${judys.id}/lock`).set(judy).expect(200);
      expect(locked.body.status).toBe('locked');
    });

    it('does not offer a "not allocated" result for cancellation', async () => {
      const ivans = (await request(server()).get('/enrollments/me').set(ivan)).body.find(
        (e: { class: { id: number } }) => e.class.id === mat104,
      );
      expect(ivans.status).toBe('not_allocated');
      await request(server()).delete(`/enrollments/${ivans.id}`).set(ivan).expect(409);
    });
  });
});

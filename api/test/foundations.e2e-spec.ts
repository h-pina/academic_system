import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ClockService } from '../src/common/clock/clock.service';
import {
  MESSAGES,
  noSeatsAvailable,
  prerequisiteNotMet,
  scheduleConflict,
} from '../src/common/errors/coded-exceptions';
import { SEEDED, bootstrapApp, loginAs } from './helpers';

describe('Foundations: settings, audit, clock, coded errors (e2e)', () => {
  let app: INestApplication;
  let admin: { Authorization: string };
  let secretary: { Authorization: string };
  let student: { Authorization: string };
  const server = () => app.getHttpServer();

  beforeAll(async () => {
    ({ app } = await bootstrapApp());
    admin = await loginAs(app, SEEDED.admin);
    secretary = await loginAs(app, SEEDED.secretary);
    student = await loginAs(app, SEEDED.student);
  });
  afterAll(async () => app.close());

  it('exposes the default settings to any user with a profile', async () => {
    const res = await request(server()).get('/settings').set(student).expect(200);
    expect(res.body).toEqual({ minPassingGrade: 6, maxAbsencePercent: 25 });
  });

  it('lets only the admin change the minimum passing grade, and audits it', async () => {
    await request(server())
      .put('/settings')
      .set(secretary)
      .send({ minPassingGrade: 7 })
      .expect(403);
    await request(server())
      .put('/settings')
      .set(admin)
      .send({ minPassingGrade: 11 })
      .expect(400);
    const res = await request(server())
      .put('/settings')
      .set(admin)
      .send({ minPassingGrade: 7 })
      .expect(200);
    expect(res.body.minPassingGrade).toBe(7);

    const audit = await request(server())
      .get('/audit?action=settings.update')
      .set(admin)
      .expect(200);
    expect(audit.body.total).toBe(1);
    expect(JSON.parse(audit.body.items[0].details)).toEqual({ minPassingGrade: 7 });

    await request(server()).put('/settings').set(admin).send({ minPassingGrade: 6 });
  });

  it('keeps the audit log admin-only', async () => {
    await request(server()).get('/audit').set(secretary).expect(403);
    await request(server()).get('/audit').set(student).expect(403);
    await request(server()).get('/audit').expect(401);
  });

  it('pins and releases the clock', () => {
    const clock = app.get(ClockService);
    clock.setNow('2026-03-02T10:00:00Z');
    expect(clock.today()).toBe('2026-03-02');
    clock.setNow(null);
    expect(clock.today()).not.toBe('2026-03-02');
  });

  it('builds coded errors with the specified messages', () => {
    expect(prerequisiteNotMet().getResponse()).toMatchObject({
      code: 'MSG01',
      statusCode: 400,
    });
    expect(noSeatsAvailable().getResponse()).toMatchObject({
      code: 'MSG02',
      message: MESSAGES.MSG02,
      statusCode: 409,
    });
    expect(scheduleConflict('Algoritmos').getResponse()).toMatchObject({
      code: 'MSG03',
      message: `${MESSAGES.MSG03} Algoritmos`,
    });
  });
});

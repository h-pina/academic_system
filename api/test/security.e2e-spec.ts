import { INestApplication } from '@nestjs/common';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { PASSWORD, SEEDED, bootstrapApp, loginAs } from './helpers';

describe('Security hardening and health (e2e)', () => {
  let app: INestApplication;
  let admin: { Authorization: string };
  let student: { Authorization: string };
  const server = () => app.getHttpServer();

  beforeAll(async () => {
    ({ app } = await bootstrapApp());
    admin = await loginAs(app, SEEDED.admin);
    student = await loginAs(app, SEEDED.student);
  });
  afterEach(() => {
    delete process.env.LOGIN_RATE_LIMIT;
  });
  afterAll(async () => app.close());

  it('reports health without authentication', async () => {
    const res = await request(server()).get('/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('sends security headers and hides the framework', async () => {
    const res = await request(server()).get('/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('limits repeated failed logins per identifier (RNF04)', async () => {
    process.env.LOGIN_RATE_LIMIT = '3';
    const attempt = () =>
      request(server()).post('/auth/login').send({ identifier: SEEDED.teacher, password: 'wrong-password' });
    for (let i = 0; i < 3; i++) await attempt().expect(401);
    const blocked = await attempt().expect(429);
    expect(blocked.body.code).toBe('TOO_MANY_ATTEMPTS');
    // Another identifier is not affected.
    await request(server())
      .post('/auth/login')
      .send({ identifier: SEEDED.student, password: PASSWORD })
      .expect(201);
  });

  it('records failed sign-ins in the audit log without the full identifier', async () => {
    await request(server()).post('/auth/login').send({ identifier: SEEDED.secretary, password: 'wrong-password' }).expect(401);
    const audit = await request(server()).get('/audit?action=auth.login-failed&pageSize=100').set(admin).expect(200);
    expect(audit.body.total).toBeGreaterThan(0);
    const details = audit.body.items.map((i: { details: string }) => i.details).join(' ');
    expect(details).not.toContain(SEEDED.secretary);
    expect(details).toContain('***100');
  });

  describe('first-access password route', () => {
    it('no longer overwrites the password of an account that already has one', async () => {
      const res = await request(server())
        .put('/auth/password/reset')
        .send({ identifier: SEEDED.student, newPassword: 'attacker-pass1' })
        .expect(403);
      expect(res.body.message).toContain('já possui senha');
      await request(server()).post('/auth/login').send({ identifier: SEEDED.student, password: PASSWORD }).expect(201);
    });

    it('still defines the password of a pending account (first access)', async () => {
      await request(server())
        .put('/auth/password/reset')
        .send({ identifier: SEEDED.noProfile, newPassword: 'first-access-1' })
        .expect(200);
      await request(server())
        .put('/auth/password/reset')
        .send({ identifier: SEEDED.noProfile, newPassword: 'second-try-12' })
        .expect(403);
    });
  });

  it('keeps a person\'s e-mail private (LGPD, RNF05)', async () => {
    await request(server()).get(`/users/${SEEDED.student}/email`).expect(401);
    await request(server()).get(`/users/${SEEDED.student}/email`).set(student).expect(403);
    const res = await request(server()).get(`/users/${SEEDED.student}/email`).set(admin).expect(200);
    expect(res.body.email).toBe('erin@example.com');
  });
});

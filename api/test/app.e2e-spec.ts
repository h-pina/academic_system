// Test environment: set before the app modules are loaded.
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.BCRYPT_SALT_ROUNDS = '4';
process.env.SEED_ON_STARTUP = 'true';

import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';

const ADMIN_CPF = '12345678909';
const PASSWORD = 'password123';
const NEW_USER_CPF = '32165498791';
const UNREGISTERED_CPF = '52998224725';

describe('Academic System API (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ identifier: ADMIN_CPF, password: PASSWORD });
    token = login.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  const auth = () => ({ Authorization: `Bearer ${token}` });

  describe('authentication', () => {
    it('logs in a seeded user and returns an access token', () => {
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('logs in with a formatted CPF', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ identifier: '123.456.789-09', password: PASSWORD })
        .expect(201);
    });

    it('logs in with the registration number (matrícula)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ identifier: '2026000001', password: PASSWORD })
        .expect(201);

      const me = await request(app.getHttpServer())
        .get('/auth/me')
        .set({ Authorization: `Bearer ${res.body.accessToken}` })
        .expect(200);
      expect(me.body).toMatchObject({
        name: 'Erin Student',
        registrationNumber: '2026000001',
        roles: ['student'],
      });
    });

    it('rejects an unknown registration number with 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ identifier: '2026999999', password: PASSWORD })
        .expect(401);
    });

    it('rejects a wrong password with 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ identifier: ADMIN_CPF, password: 'wrong-password' })
        .expect(401);
    });

    it('rejects an unknown CPF with 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ identifier: UNREGISTERED_CPF, password: PASSWORD })
        .expect(401);
    });

    it('rejects an invalid CPF payload with 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ identifier: '123', password: PASSWORD })
        .expect(400);
    });

    it('returns the profile of the logged-in user', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set(auth())
        .expect(200);

      expect(res.body).toEqual({
        cpf: ADMIN_CPF,
        name: 'Alice Admin',
        registrationNumber: null,
        roles: ['admin'],
      });
    });

    it('requires a token for /auth/me', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('reports a user without password via access check', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/access/45678912364')
        .expect(200);

      expect(res.body).toEqual({ hasPassword: false, name: 'Dave Pending' });
    });

    it('does not allow login for a user without password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ identifier: '45678912364', password: PASSWORD })
        .expect(401);
    });
  });

  describe('users', () => {
    it('requires a token to list users', async () => {
      await request(app.getHttpServer()).get('/users').expect(401);
    });

    it('lists seeded users without exposing password hashes', async () => {
      const res = await request(app.getHttpServer())
        .get('/users')
        .set(auth())
        .expect(200);

      expect(res.body).toHaveLength(13);
      for (const user of res.body) {
        expect(user).not.toHaveProperty('passwordHash');
      }
    });

    it('creates a user and lets them log in', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set(auth())
        .send({
          cpf: NEW_USER_CPF,
          name: 'Test Person',
          email: 'test.person@example.com',
          password: 'secret-pass-1',
        })
        .expect(201);

      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ identifier: NEW_USER_CPF, password: 'secret-pass-1' })
        .expect(201);

      expect(typeof login.body.accessToken).toBe('string');
    });

    it('rejects a duplicate CPF with 409', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set(auth())
        .send({
          cpf: ADMIN_CPF,
          name: 'Duplicate Person',
          email: 'duplicate@example.com',
        })
        .expect(409);
    });

    it('rejects an invalid payload with 400', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .set(auth())
        .send({ cpf: NEW_USER_CPF, name: 'A', email: 'not-an-email' })
        .expect(400);
    });

    it('returns 404 when updating an unknown user', async () => {
      await request(app.getHttpServer())
        .put(`/users/${UNREGISTERED_CPF}`)
        .set(auth())
        .send({ name: 'Nobody Here', email: 'nobody@example.com' })
        .expect(404);
    });
  });

  describe('removed requisition and position features', () => {
    it.each(['/positions', '/requisitions'])(
      '%s is no longer served',
      async (route) => {
        await request(app.getHttpServer())
          .get(route)
          .set(auth())
          .expect(404);
      },
    );

    it('has no positions or requisition tables in the database', async () => {
      const dataSource = app.get(DataSource);
      const rows: { name: string }[] = await dataSource.query(
        "SELECT name FROM sqlite_master WHERE type = 'table'",
      );
      const names = rows.map((row) => row.name);

      expect(names).toContain('users');
      expect(names).not.toContain('positions');
      expect(names.filter((name) => name.includes('requisition'))).toEqual([]);
    });
  });
});

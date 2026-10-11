// Test environment: set before the app modules are loaded.
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.BCRYPT_SALT_ROUNDS = '4';
process.env.SEED_ON_STARTUP = 'true';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { User } from '../src/features/users/entities/user.entity';
import { Staff } from '../src/features/staff/entities/staff.entity';
import { Teacher } from '../src/features/teachers/entities/teacher.entity';
import { Student } from '../src/features/students/entities/student.entity';
import { Department } from '../src/features/departments/entities/department.entity';
import { Course } from '../src/features/courses/entities/course.entity';

const PASSWORD = 'password123';

/** Builds a CPF with valid check digits from 9 base digits. */
function cpfFromBase(base: string): string {
  const digits = base.split('').map(Number);
  const check = (length: number): number => {
    const sum = digits
      .slice(0, length)
      .reduce((total, digit, index) => total + digit * (length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  digits.push(check(9));
  digits.push(check(10));
  return digits.join('');
}

describe('Roles and permissions (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let counter = 0;

  // Seeded accounts (see src/seed/seed-data.ts).
  const ADMIN = '12345678909';
  const SECRETARY = '98765432100';
  const TEACHER = '11122233396';
  const STUDENT = '11144477735';
  const NO_PROFILE = '45678912364';

  const server = () => app.getHttpServer();

  const login = async (identifier: string): Promise<string> => {
    const res = await request(server())
      .post('/auth/login')
      .send({ identifier, password: PASSWORD })
      .expect(201);
    return res.body.accessToken;
  };

  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  /** Creates a user with a password; returns its CPF and id. */
  const createUser = async (): Promise<{ cpf: string; id: number }> => {
    const n = ++counter;
    const cpf = cpfFromBase(String(200_000_000 + n));
    const user = await ds.getRepository(User).save({
      cpf,
      name: `Extra Person ${n}`,
      email: `extra${n}@example.com`,
      passwordHash: await bcrypt.hash(PASSWORD, 4),
    } as User);
    return { cpf, id: user.id };
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    ds = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('roles derived from profile tables', () => {
    it.each([
      ['admin', ADMIN, ['admin']],
      ['secretary', SECRETARY, ['secretary']],
      ['teacher', TEACHER, ['teacher']],
      ['student', STUDENT, ['student']],
      ['a user without profile', NO_PROFILE, []],
    ])('%s gets the expected roles', async (_label, cpf, roles) => {
      // The user without a password cannot log in; give them one.
      if (cpf === NO_PROFILE) {
        await ds
          .getRepository(User)
          .update({ cpf }, { passwordHash: await bcrypt.hash(PASSWORD, 4) });
      }
      const token = await login(cpf);

      const me = await request(server())
        .get('/auth/me')
        .set(bearer(token))
        .expect(200);

      expect(me.body.roles).toEqual(roles);
    });

    it('gives the union of profiles to a user with several', async () => {
      const { cpf, id } = await createUser();
      const department = await ds.getRepository(Department).findOneByOrFail({
        code: 'DCC',
      });
      const course = await ds.getRepository(Course).findOneByOrFail({ code: 'CC' });
      await ds.getRepository(Teacher).insert({
        userId: id,
        departmentId: department.id,
        title: 'master',
      });
      await ds.getRepository(Student).insert({
        userId: id,
        courseId: course.id,
        entryYear: 2026,
      });

      const token = await login(cpf);
      const me = await request(server())
        .get('/auth/me')
        .set(bearer(token))
        .expect(200);

      expect([...me.body.roles].sort()).toEqual(['student', 'teacher']);
    });
  });

  describe('route permissions', () => {
    it('rejects requests without a token with 401', async () => {
      await request(server()).get('/users').expect(401);
    });

    it('lets admin list users, with their roles', async () => {
      const token = await login(ADMIN);
      const res = await request(server())
        .get('/users')
        .set(bearer(token))
        .expect(200);

      const alice = res.body.find((u: { cpf: string }) => u.cpf === ADMIN);
      const erin = res.body.find((u: { cpf: string }) => u.cpf === STUDENT);
      expect(alice.roles).toEqual(['admin']);
      expect(erin.roles).toEqual(['student']);
    });

    it.each([
      ['secretary', SECRETARY],
      ['teacher', TEACHER],
      ['student', STUDENT],
    ])('forbids %s from listing users (403)', async (_label, cpf) => {
      const token = await login(cpf);
      await request(server()).get('/users').set(bearer(token)).expect(403);
    });

    it('lets admin and secretary check if a CPF exists, but not teacher or student', async () => {
      const path = `/users/${ADMIN}/exists`;
      const tokens = {
        admin: await login(ADMIN),
        secretary: await login(SECRETARY),
        teacher: await login(TEACHER),
        student: await login(STUDENT),
      };

      await request(server()).get(path).set(bearer(tokens.admin)).expect(200);
      await request(server()).get(path).set(bearer(tokens.secretary)).expect(200);
      await request(server()).get(path).set(bearer(tokens.teacher)).expect(403);
      await request(server()).get(path).set(bearer(tokens.student)).expect(403);
    });

    it('forbids a secretary from creating or deleting users', async () => {
      const token = await login(SECRETARY);

      await request(server())
        .post('/users')
        .set(bearer(token))
        .send({ cpf: '39053344705', name: 'New Person', email: 'new@example.com' })
        .expect(403);
      await request(server())
        .delete(`/users/${STUDENT}`)
        .set(bearer(token))
        .expect(403);
    });
  });

  describe('user without a profile', () => {
    it('can read its own profile and update its own data', async () => {
      const token = await login(NO_PROFILE);

      await request(server()).get('/auth/me').set(bearer(token)).expect(200);
      await request(server())
        .put('/users/me')
        .set(bearer(token))
        .send({ name: 'Dave Updated', email: 'dave@example.com' })
        .expect(200);
    });

    it('is forbidden everywhere else (403)', async () => {
      const token = await login(NO_PROFILE);

      await request(server()).get('/users').set(bearer(token)).expect(403);
      await request(server())
        .get(`/users/${ADMIN}/exists`)
        .set(bearer(token))
        .expect(403);
    });
  });

  describe('changes take effect immediately', () => {
    it('removes access when the admin profile is deactivated', async () => {
      const { cpf, id } = await createUser();
      await ds.getRepository(Staff).insert({ userId: id, role: 'admin' });
      const token = await login(cpf);

      await request(server()).get('/users').set(bearer(token)).expect(200);

      await ds.getRepository(Staff).update({ userId: id }, { status: 'inactive' });

      await request(server()).get('/users').set(bearer(token)).expect(403);
    });

    it('rejects an existing token once the user is deactivated (401)', async () => {
      const { cpf, id } = await createUser();
      await ds.getRepository(Staff).insert({ userId: id, role: 'secretary' });
      const token = await login(cpf);

      await ds.getRepository(User).update({ id }, { active: false });

      await request(server()).get('/auth/me').set(bearer(token)).expect(401);
      await request(server())
        .post('/auth/login')
        .send({ identifier: cpf, password: PASSWORD })
        .expect(401);
    });

    it('stops granting the student role once the student dropped out', async () => {
      const { cpf, id } = await createUser();
      const course = await ds.getRepository(Course).findOneByOrFail({ code: 'CC' });
      await ds.getRepository(Student).insert({
        userId: id,
        courseId: course.id,
        entryYear: 2026,
      });
      const token = await login(cpf);

      await ds.getRepository(Student).update({ userId: id }, { status: 'dropped' });

      const me = await request(server()).get('/auth/me').set(bearer(token)).expect(200);
      expect(me.body.roles).toEqual([]);
    });
  });
});

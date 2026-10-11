import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';

export const PASSWORD = 'password123';

/** Seeded accounts (see src/seed/seed-data.ts). */
export const SEEDED = {
  admin: '12345678909',
  secretary: '98765432100',
  teacher: '11122233396',
  student: '11144477735',
  noProfile: '45678912364',
};

/** Builds a CPF with valid check digits from 9 base digits. */
export function cpfFromBase(base: string | number): string {
  const digits = String(base).padStart(9, '0').split('').map(Number);
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

/** Boots the whole application on an in-memory database with seeded data. */
export async function bootstrapApp(): Promise<{
  app: INestApplication;
  ds: DataSource;
}> {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_PATH = ':memory:';
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.BCRYPT_SALT_ROUNDS = '4';
  process.env.SEED_ON_STARTUP = 'true';

  const { AppModule } = await import('../src/app.module');
  const { configureApp } = await import('../src/app.setup');

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return { app, ds: app.get(DataSource) };
}

/** Logs in and returns an `Authorization` header object. */
export async function loginAs(
  app: INestApplication,
  identifier: string,
): Promise<{ Authorization: string }> {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ identifier, password: PASSWORD })
    .expect(201);
  return { Authorization: `Bearer ${res.body.accessToken}` };
}

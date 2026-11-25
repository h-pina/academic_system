import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
export async function bootstrapApp(options: { academicDemo?: boolean } = {}): Promise<{
  app: INestApplication;
  ds: DataSource;
}> {
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_PATH = ':memory:';
  process.env.JWT_SECRET = 'test-secret';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.BCRYPT_SALT_ROUNDS = '4';
  process.env.SEED_ON_STARTUP = 'true';
  process.env.SEED_ACADEMIC_DEMO = options.academicDemo ? 'true' : 'false';
  process.env.UPLOAD_DIR = mkdtempSync(join(tmpdir(), 'academic-uploads-'));

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

// ---------------------------------------------------------------------------
// Academic-operations fixtures (calendar, semester, classes)
// ---------------------------------------------------------------------------

export type Auth = { Authorization: string };

/** Dates used by the fixtures; 2026-02-02 is a Monday. */
export const TERM = {
  startDate: '2026-02-02',
  endDate: '2026-06-30',
  enrollmentStart: '2026-02-02',
  enrollmentEnd: '2026-02-20',
  withdrawalDeadline: '2026-04-15',
  gradesDeadline: '2026-07-10',
};
/** A moment inside the enrollment window. */
export const IN_ENROLLMENT = '2026-02-10T12:00:00Z';
/** After the window (it ends 2026-02-20), when the seats can be allocated. */
export const AFTER_ENROLLMENT = '2026-02-25T12:00:00Z';

export async function userIdOf(ds: DataSource, cpf: string): Promise<number> {
  const rows = await ds.query('SELECT id FROM users WHERE cpf = ?', [cpf]);
  return rows[0].id as number;
}

export async function subjectIdOf(
  app: INestApplication,
  token: Auth,
  code: string,
): Promise<number> {
  const res = await request(app.getHttpServer())
    .get(`/subjects?q=${code}`)
    .set(token)
    .expect(200);
  const found = res.body.items.find((s: { code: string }) => s.code === code);
  return found.id as number;
}

/** Creates a calendar and a deployed semester; returns the semester id. */
export async function openSemester(
  app: INestApplication,
  staff: Auth,
  year = 2026,
  term = 1,
): Promise<number> {
  const calendar = await request(app.getHttpServer())
    .post('/calendars')
    .set(staff)
    .send({ description: `Calendário ${year}/${term}`, ...TERM })
    .expect(201);
  const semester = await request(app.getHttpServer())
    .post('/semesters')
    .set(staff)
    .send({
      calendarId: calendar.body.id,
      year,
      term,
      startDate: TERM.startDate,
      endDate: TERM.endDate,
    })
    .expect(201);
  await request(app.getHttpServer())
    .post(`/semesters/${semester.body.id}/deploy`)
    .set(staff)
    .expect(200);
  return semester.body.id as number;
}

export interface ClassOptions {
  semesterId: number;
  subjectId: number;
  teacherId: number;
  seats?: number;
  schedules?: { weekday: number; startTime: string; endTime: string }[];
  approve?: boolean;
}

/** Creates a class (approved by default) and returns its view. */
export async function makeClass(
  app: INestApplication,
  staff: Auth,
  options: ClassOptions,
): Promise<{ id: number; code: string; seats: number }> {
  const server = app.getHttpServer();
  const created = await request(server)
    .post('/classes')
    .set(staff)
    .send({
      semesterId: options.semesterId,
      subjectId: options.subjectId,
      teacherId: options.teacherId,
      seats: options.seats ?? 30,
      schedules: options.schedules ?? [
        { weekday: 1, startTime: '08:00', endTime: '10:00' },
      ],
    })
    .expect(201);
  if (options.approve !== false) {
    await request(server).post(`/classes/${created.body.id}/approve`).set(staff).expect(200);
  }
  return created.body;
}

/**
 * Closes the enrollment period and allocates the requested seats, as the
 * Administration does. Leaves the clock after the window; pin it again as needed.
 */
export async function allocateSemester(
  app: INestApplication,
  staff: Auth,
  semesterId: number,
): Promise<{ allocated: number; notAllocated: number }> {
  const { ClockService } = await import('../src/common/clock/clock.service');
  app.get(ClockService).setNow(AFTER_ENROLLMENT);
  const res = await request(app.getHttpServer())
    .post(`/semesters/${semesterId}/allocate`)
    .set(staff)
    .expect(200);
  return res.body;
}

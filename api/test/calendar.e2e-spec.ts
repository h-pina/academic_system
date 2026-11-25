import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { SEEDED, bootstrapApp, loginAs } from './helpers';

type Auth = { Authorization: string };

export const CALENDAR_2026 = {
  description: 'Calendário 2026',
  startDate: '2026-02-02',
  endDate: '2026-06-30',
  enrollmentStart: '2026-01-15',
  enrollmentEnd: '2026-02-20',
  withdrawalDeadline: '2026-04-15',
  gradesDeadline: '2026-07-10',
};

describe('Academic calendar and semesters (e2e)', () => {
  let app: INestApplication;
  let admin: Auth;
  let secretary: Auth;
  let teacher: Auth;
  let student: Auth;
  const server = () => app.getHttpServer();

  // enrollmentStart before startDate is invalid, so tests use a valid shape.
  const valid = { ...CALENDAR_2026, enrollmentStart: '2026-02-02' };

  beforeAll(async () => {
    ({ app } = await bootstrapApp());
    admin = await loginAs(app, SEEDED.admin);
    secretary = await loginAs(app, SEEDED.secretary);
    teacher = await loginAs(app, SEEDED.teacher);
    student = await loginAs(app, SEEDED.student);
  });
  afterAll(async () => app.close());

  describe('calendars', () => {
    it('lets the secretariat create a calendar and every profile read it', async () => {
      const created = await request(server()).post('/calendars').set(secretary).send(valid).expect(201);
      expect(created.body.id).toBeGreaterThan(0);

      for (const who of [teacher, student, admin]) {
        const list = await request(server()).get('/calendars').set(who).expect(200);
        expect(list.body.some((c: { id: number }) => c.id === created.body.id)).toBe(true);
      }
      await request(server()).get(`/calendars/${created.body.id}`).set(student).expect(200);
    });

    it('forbids students and teachers from writing', async () => {
      await request(server()).post('/calendars').set(student).send(valid).expect(403);
      await request(server()).post('/calendars').set(teacher).send(valid).expect(403);
      await request(server()).post('/calendars').send(valid).expect(401);
    });

    it('rejects inconsistent dates with the list of problems (UC05 E01)', async () => {
      const res = await request(server())
        .post('/calendars')
        .set(secretary)
        .send({ ...valid, startDate: '2026-07-01' })
        .expect(400);
      expect(JSON.stringify(res.body.message)).toContain('anterior à data de término');
    });

    it('rejects invalid and missing fields', async () => {
      await request(server())
        .post('/calendars')
        .set(secretary)
        .send({ ...valid, endDate: '2026-02-30' })
        .expect(400);
      await request(server()).post('/calendars').set(secretary).send({ description: 'x' }).expect(400);
    });

    it('updates a calendar and revalidates the merged dates (A01)', async () => {
      const { body } = await request(server()).post('/calendars').set(secretary).send(valid).expect(201);
      const ok = await request(server())
        .patch(`/calendars/${body.id}`)
        .set(secretary)
        .send({ gradesDeadline: '2026-07-20' })
        .expect(200);
      expect(ok.body.gradesDeadline).toBe('2026-07-20');
      await request(server())
        .patch(`/calendars/${body.id}`)
        .set(secretary)
        .send({ endDate: '2026-01-01' })
        .expect(400);
      await request(server()).patch('/calendars/99999').set(secretary).send({}).expect(404);
    });

    it('deletes only unused calendars and only as admin', async () => {
      const { body } = await request(server()).post('/calendars').set(secretary).send(valid).expect(201);
      await request(server()).delete(`/calendars/${body.id}`).set(secretary).expect(403);
      await request(server()).delete(`/calendars/${body.id}`).set(admin).expect(204);
      await request(server()).get(`/calendars/${body.id}`).set(admin).expect(404);
    });
  });

  describe('semesters', () => {
    let calendarId: number;
    beforeAll(async () => {
      const res = await request(server()).post('/calendars').set(secretary).send(valid).expect(201);
      calendarId = res.body.id;
    });

    const semester = (overrides = {}) => ({
      calendarId,
      year: 2030,
      term: 1,
      startDate: '2026-02-02',
      endDate: '2026-06-30',
      ...overrides,
    });

    it('creates a draft semester and deploys it (REQ05)', async () => {
      const created = await request(server()).post('/semesters').set(secretary).send(semester()).expect(201);
      expect(created.body.status).toBe('draft');
      expect(created.body.calendar.id).toBe(calendarId);

      const deployed = await request(server()).post(`/semesters/${created.body.id}/deploy`).set(secretary).expect(200);
      expect(deployed.body.status).toBe('active');
    });

    it('blocks a duplicated year/term (E01)', async () => {
      await request(server()).post('/semesters').set(secretary).send(semester()).expect(409);
    });

    it('refuses to deploy twice or to close a draft', async () => {
      const draft = await request(server())
        .post('/semesters')
        .set(secretary)
        .send(semester({ year: 2031 }))
        .expect(201);
      await request(server()).post(`/semesters/${draft.body.id}/close`).set(secretary).expect(409);
      await request(server()).post(`/semesters/${draft.body.id}/deploy`).set(secretary).expect(200);
      await request(server()).post(`/semesters/${draft.body.id}/deploy`).set(secretary).expect(409);
      const closed = await request(server()).post(`/semesters/${draft.body.id}/close`).set(secretary).expect(200);
      expect(closed.body.status).toBe('closed');
      await request(server()).post(`/semesters/${draft.body.id}/deploy`).set(secretary).expect(409);
    });

    it('requires an existing calendar and dates inside it', async () => {
      await request(server())
        .post('/semesters')
        .set(secretary)
        .send(semester({ year: 2032, calendarId: 99999 }))
        .expect(400);
      await request(server())
        .post('/semesters')
        .set(secretary)
        .send(semester({ year: 2032, startDate: '2026-01-01' }))
        .expect(400);
      await request(server())
        .post('/semesters')
        .set(secretary)
        .send(semester({ year: 2032, term: 3 }))
        .expect(400);
    });

    it('does not let a calendar change leave a semester outside', async () => {
      await request(server())
        .patch(`/calendars/${calendarId}`)
        .set(secretary)
        .send({ endDate: '2026-05-01', withdrawalDeadline: '2026-04-15' })
        .expect(400);
    });

    it('blocks deleting a calendar that has semesters', async () => {
      await request(server()).delete(`/calendars/${calendarId}`).set(admin).expect(409);
    });

    it('filters by status and restricts writes', async () => {
      const active = await request(server()).get('/semesters?status=active').set(student).expect(200);
      expect(active.body.every((s: { status: string }) => s.status === 'active')).toBe(true);
      await request(server()).post('/semesters').set(teacher).send(semester({ year: 2040 })).expect(403);
      await request(server()).get('/semesters?status=bogus').set(student).expect(400);
    });
  });
});

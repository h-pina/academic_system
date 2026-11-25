import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ClockService } from '../src/common/clock/clock.service';
import {
  Auth,
  IN_ENROLLMENT,
  allocateSemester,
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
const FRANK = '12121212108';

describe('Activities, news and the student panel (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let clock: ClockService;
  let secretary: Auth;
  let carol: Auth;
  let frank: Auth;
  let erin: Auth;
  let ivan: Auth;
  let judy: Auth;
  let classId: number; // Carol's CC101: Erin and Ivan
  let otherClassId: number; // Frank's MAT101: Judy
  let erinEnrollment: number;
  const server = () => app.getHttpServer();
  const pdf = Buffer.from('%PDF-1.4 test');

  beforeAll(async () => {
    ({ app, ds } = await bootstrapApp());
    clock = app.get(ClockService);
    clock.setNow(IN_ENROLLMENT);
    secretary = await loginAs(app, SEEDED.secretary);
    carol = await loginAs(app, SEEDED.teacher);
    frank = await loginAs(app, FRANK);
    erin = await loginAs(app, SEEDED.student);
    ivan = await loginAs(app, IVAN);
    judy = await loginAs(app, JUDY);

    const semesterId = await openSemester(app, secretary);
    const mine = await makeClass(app, secretary, {
      semesterId,
      subjectId: await subjectIdOf(app, secretary, 'CC101'),
      teacherId: await userIdOf(ds, SEEDED.teacher),
      schedules: [{ weekday: 1, startTime: '08:00', endTime: '10:00' }],
    });
    const other = await makeClass(app, secretary, {
      semesterId,
      subjectId: await subjectIdOf(app, secretary, 'MAT101'),
      teacherId: await userIdOf(ds, FRANK),
      schedules: [{ weekday: 2, startTime: '08:00', endTime: '10:00' }],
    });
    classId = mine.id;
    otherClassId = other.id;
    erinEnrollment = (await request(server()).post('/enrollments').set(erin).send({ classId })).body.id;
    await request(server()).post('/enrollments').set(ivan).send({ classId }).expect(201);
    await request(server()).post('/enrollments').set(judy).send({ classId: otherClassId }).expect(201);
    await allocateSemester(app, secretary, semesterId);
    clock.setNow('2026-03-10T12:00:00Z');
  });
  afterAll(async () => {
    clock.setNow(null);
    await app.close();
  });

  describe('activities (REQ13, UC12, RN10)', () => {
    let activityId: number;
    let lateActivityId: number;
    const body = (overrides = {}) => ({
      title: 'Lista 1',
      description: 'Resolver os exercícios do capítulo 2',
      dueAt: '2026-03-20T23:59:00Z',
      ...overrides,
    });

    it('lets only the responsible teacher publish, with a valid deadline', async () => {
      const created = await request(server()).post(`/classes/${classId}/activities`).set(carol).send(body()).expect(201);
      activityId = created.body.id;
      const late = await request(server())
        .post(`/classes/${classId}/activities`)
        .set(carol)
        .send(body({ title: 'Lista 2', dueAt: '2026-03-12T12:00:00Z', allowLateUntil: '2026-03-14T12:00:00Z' }))
        .expect(201);
      lateActivityId = late.body.id;

      await request(server()).post(`/classes/${classId}/activities`).set(frank).send(body()).expect(403);
      await request(server()).post(`/classes/${classId}/activities`).set(erin).send(body()).expect(403);
      await request(server()).post(`/classes/${classId}/activities`).set(secretary).send(body()).expect(403);
      await request(server()).post(`/classes/${classId}/activities`).set(carol).send(body({ dueAt: '2026-03-01T00:00:00Z' })).expect(400);
      await request(server()).post(`/classes/${classId}/activities`).set(carol).send(body({ allowLateUntil: '2026-03-19T00:00:00Z' })).expect(400);
      await request(server()).post(`/classes/${classId}/activities`).set(carol).send({ title: 'x' }).expect(400);
    });

    it('shows activities to the class only (RN13)', async () => {
      const own = await request(server()).get(`/classes/${classId}/activities`).set(erin).expect(200);
      expect(own.body).toHaveLength(2);
      expect(own.body[0]).toMatchObject({ title: 'Lista 2', state: 'pending', submittedAt: null });
      await request(server()).get(`/classes/${classId}/activities`).set(judy).expect(403);
      await request(server()).get(`/classes/${classId}/activities`).set(frank).expect(403);
      await request(server()).get(`/classes/${classId}/activities`).set(carol).expect(200);
      await request(server()).get(`/classes/${classId}/activities`).set(secretary).expect(200);
    });

    it('accepts a text answer and requires some content', async () => {
      await request(server()).post(`/activities/${activityId}/submissions`).set(erin).field('answerText', '   ').expect(400);
      const res = await request(server())
        .post(`/activities/${activityId}/submissions`)
        .set(erin)
        .field('answerText', 'Minha resposta')
        .expect(201);
      expect(res.body).toMatchObject({ answerText: 'Minha resposta', late: false, hasFile: false });
    });

    it('stores a file, replaces it on resubmission (A01) and serves it to authorised people', async () => {
      const first = await request(server())
        .post(`/activities/${activityId}/submissions`)
        .set(ivan)
        .attach('file', pdf, 'trabalho.pdf')
        .expect(201);
      expect(first.body).toMatchObject({ fileName: 'trabalho.pdf', hasFile: true });

      const [{ file_path: firstPath }] = await ds.query('SELECT file_path FROM submissions WHERE id = ?', [first.body.id]);
      const dir = process.env.UPLOAD_DIR as string;
      expect(existsSync(join(dir, firstPath))).toBe(true);

      const second = await request(server())
        .post(`/activities/${activityId}/submissions`)
        .set(ivan)
        .attach('file', Buffer.from('%PDF-1.4 v2'), 'versao2.pdf')
        .expect(201);
      expect(second.body.id).toBe(first.body.id);
      expect(second.body.fileName).toBe('versao2.pdf');
      expect(existsSync(join(dir, firstPath))).toBe(false);

      const owner = await request(server()).get(`/submissions/${second.body.id}/file`).set(ivan).expect(200);
      expect(owner.headers['content-disposition']).toContain('versao2.pdf');
      await request(server()).get(`/submissions/${second.body.id}/file`).set(carol).expect(200);
      await request(server()).get(`/submissions/${second.body.id}/file`).set(erin).expect(403);
      await request(server()).get(`/submissions/${second.body.id}/file`).set(frank).expect(403);
      await request(server()).get(`/submissions/${second.body.id}/file`).expect(401);
    });

    it('rejects disallowed or oversized files', async () => {
      const exe = await request(server())
        .post(`/activities/${activityId}/submissions`)
        .set(erin)
        .attach('file', Buffer.from('MZ'), { filename: 'virus.exe', contentType: 'application/x-msdownload' })
        .expect(400);
      expect(exe.body.code).toBe('FILE_TYPE_NOT_ALLOWED');
      await request(server())
        .post(`/activities/${activityId}/submissions`)
        .set(erin)
        .attach('file', Buffer.alloc(6 * 1024 * 1024), { filename: 'big.pdf', contentType: 'application/pdf' })
        .expect(413);
    });

    it('is restricted to enrolled students', async () => {
      await request(server()).post(`/activities/${activityId}/submissions`).set(judy).field('answerText', 'oi').expect(403);
      await request(server()).post(`/activities/${activityId}/submissions`).set(carol).field('answerText', 'oi').expect(403);
      await request(server()).post('/activities/99999/submissions').set(erin).field('answerText', 'oi').expect(404);
    });

    it('refuses after the deadline unless the teacher allows late delivery (RN10, E01)', async () => {
      clock.setNow('2026-03-21T12:00:00Z');
      const res = await request(server()).post(`/activities/${activityId}/submissions`).set(erin).field('answerText', 'tarde').expect(400);
      expect(res.body.code).toBe('DEADLINE_PASSED');
      const overdue = await request(server()).get(`/classes/${classId}/activities`).set(ivan).expect(200);
      expect(overdue.body.find((a: { id: number }) => a.id === activityId).state).toBe('submitted');

      clock.setNow('2026-03-13T12:00:00Z');
      const late = await request(server()).post(`/activities/${lateActivityId}/submissions`).set(erin).field('answerText', 'atrasado').expect(201);
      expect(late.body.late).toBe(true);
      clock.setNow('2026-03-15T12:00:00Z');
      await request(server()).post(`/activities/${lateActivityId}/submissions`).set(ivan).field('answerText', 'muito tarde').expect(400);
      const states = await request(server()).get(`/classes/${classId}/activities`).set(ivan).expect(200);
      expect(states.body.find((a: { id: number }) => a.id === lateActivityId).state).toBe('overdue');
      clock.setNow('2026-03-10T12:00:00Z');
    });

    it('lists submissions for the teacher and the Administration only', async () => {
      const res = await request(server()).get(`/activities/${activityId}/submissions`).set(carol).expect(200);
      expect(res.body.map((s: { studentName: string }) => s.studentName).sort()).toEqual(['Erin Student', 'Ivan Student']);
      await request(server()).get(`/activities/${activityId}/submissions`).set(secretary).expect(200);
      await request(server()).get(`/activities/${activityId}/submissions`).set(erin).expect(403);
      await request(server()).get(`/activities/${activityId}/submissions`).set(frank).expect(403);
      await request(server()).get(`/activities/${activityId}/submissions/me`).set(erin).expect(200);
      await request(server()).get(`/activities/${lateActivityId}/submissions/me`).set(ivan).expect(404);
    });

    it('edits and removes activities (only without submissions)', async () => {
      const updated = await request(server()).patch(`/activities/${activityId}`).set(carol).send({ title: 'Lista 1 (revisada)' }).expect(200);
      expect(updated.body.title).toBe('Lista 1 (revisada)');
      await request(server()).patch(`/activities/${activityId}`).set(frank).send({ title: 'xx' }).expect(403);
      await request(server()).delete(`/activities/${activityId}`).set(carol).expect(409);
      const empty = await request(server()).post(`/classes/${classId}/activities`).set(carol).send(body({ title: 'Vazia' })).expect(201);
      await request(server()).delete(`/activities/${empty.body.id}`).set(carol).expect(204);
      await request(server()).delete(`/activities/${empty.body.id}`).set(carol).expect(404);
    });
  });

  describe('news (REQ14, UC13, RN11, RN12)', () => {
    const titles = async (who: Auth) =>
      (await request(server()).get('/news?pageSize=100').set(who).expect(200)).body.items.map((n: { title: string }) => n.title);

    it('shows a teacher\'s class news only to enrolled students (RN11)', async () => {
      await request(server()).post('/news').set(carol).send({ title: 'Aviso CC101', body: 'Prova na próxima semana', classId }).expect(201);
      expect(await titles(erin)).toContain('Aviso CC101');
      expect(await titles(ivan)).toContain('Aviso CC101');
      expect(await titles(judy)).not.toContain('Aviso CC101');
      expect(await titles(frank)).not.toContain('Aviso CC101');
      expect(await titles(carol)).toContain('Aviso CC101');
      expect(await titles(secretary)).toContain('Aviso CC101');
    });

    it('limits teachers to their own classes and the Administration to general notices (E01)', async () => {
      await request(server()).post('/news').set(frank).send({ title: 'x1', body: 'texto', classId }).expect(403);
      await request(server()).post('/news').set(carol).send({ title: 'x2', body: 'texto' }).expect(403);
      await request(server()).post('/news').set(erin).send({ title: 'x3', body: 'texto', classId }).expect(403);
      await request(server()).post('/news').set(carol).send({ title: 'x4', body: 'texto', classId: 99999 }).expect(400);
      await request(server()).post('/news').set(carol).send({ title: 'x', body: '' }).expect(400);
    });

    it('lets the Administration reach everyone or a single class', async () => {
      await request(server()).post('/news').set(secretary).send({ title: 'Feriado', body: 'Sem aula na sexta' }).expect(201);
      await request(server()).post('/news').set(secretary).send({ title: 'Aviso MAT101', body: 'Sala trocada', classId: otherClassId }).expect(201);
      for (const who of [erin, judy, frank, carol]) expect(await titles(who)).toContain('Feriado');
      expect(await titles(judy)).toContain('Aviso MAT101');
      expect(await titles(erin)).not.toContain('Aviso MAT101');
    });

    it('filters by class', async () => {
      const res = await request(server()).get(`/news?classId=${classId}`).set(erin).expect(200);
      expect(res.body.items.map((n: { title: string }) => n.title)).toEqual(['Aviso CC101']);
    });

    it('lets the author and the Administration edit or delete (A01)', async () => {
      const post = await request(server()).post('/news').set(carol).send({ title: 'Rascunho', body: 'texto', classId }).expect(201);
      await request(server()).patch(`/news/${post.body.id}`).set(frank).send({ title: 'Hack' }).expect(403);
      await request(server()).patch(`/news/${post.body.id}`).set(erin).send({ title: 'Hack' }).expect(403);
      const edited = await request(server()).patch(`/news/${post.body.id}`).set(carol).send({ title: 'Final' }).expect(200);
      expect(edited.body.title).toBe('Final');
      await request(server()).patch(`/news/${post.body.id}`).set(secretary).send({ body: 'moderado' }).expect(200);
      await request(server()).delete(`/news/${post.body.id}`).set(frank).expect(403);
      await request(server()).delete(`/news/${post.body.id}`).set(carol).expect(204);
      await request(server()).delete(`/news/${post.body.id}`).set(carol).expect(404);
    });
  });

  describe('student panel (REQ15, UC03, RN13, RD01)', () => {
    beforeAll(async () => {
      const assessment = await request(server()).post(`/classes/${classId}/assessments`).set(carol).send({ name: 'Prova 1', weight: 1 }).expect(201);
      await request(server())
        .put(`/assessments/${assessment.body.id}/grades`)
        .set(carol)
        .send({ entries: [{ enrollmentId: erinEnrollment, value: 7.5 }] })
        .expect(200);
      await request(server())
        .put(`/classes/${classId}/attendance`)
        .set(carol)
        .send({ date: '2026-03-02', records: [{ enrollmentId: erinEnrollment, present: false }] })
        .expect(200);
    });

    it('gathers grades, attendance, activities and news of the student\'s classes', async () => {
      const started = Date.now();
      const res = await request(server()).get('/me/academic-panel').set(erin).expect(200);
      expect(Date.now() - started).toBeLessThan(3000);

      expect(res.body.minPassingGrade).toBe(6);
      expect(res.body.classes).toHaveLength(1);
      const panel = res.body.classes[0];
      expect(panel.class.subject.code).toBe('CC101');
      expect(panel.grades).toEqual([
        expect.objectContaining({ name: 'Prova 1', value: 7.5, maxScore: 10 }),
      ]);
      expect(panel).toMatchObject({
        partialAverage: 7.5,
        finalGrade: 7.5,
        attendance: { lessons: 1, absences: 1, absencePercent: 100 },
        result: 'failed_attendance',
      });
      expect(panel.activities.map((a: { title: string; state: string }) => [a.title, a.state])).toEqual(
        expect.arrayContaining([['Lista 2', 'late']]),
      );
      expect(panel.news.map((n: { title: string }) => n.title)).toEqual(['Aviso CC101']);
    });

    it('never mixes in other students\' or other classes\' data (RN13)', async () => {
      const ivansView = (await request(server()).get('/me/academic-panel').set(ivan).expect(200)).body.classes[0];
      expect(ivansView.grades[0].value).toBeNull();
      expect(ivansView.attendance.absences).toBe(0);

      const judys = (await request(server()).get('/me/academic-panel').set(judy).expect(200)).body;
      expect(judys.classes).toHaveLength(1);
      expect(judys.classes[0].class.subject.code).toBe('MAT101');
      expect(judys.classes[0].news.map((n: { title: string }) => n.title)).toEqual(['Aviso MAT101']);
    });

    it('returns empty categories instead of failing, and is student-only', async () => {
      const heidi = await loginAs(app, '33344455508');
      const empty = await request(server()).get('/me/academic-panel').set(heidi).expect(200);
      expect(empty.body.classes).toEqual([]);
      await request(server()).get('/me/academic-panel').set(carol).expect(403);
      await request(server()).get('/me/academic-panel').set(secretary).expect(403);
      await request(server()).get('/me/academic-panel').expect(401);
    });
  });
});

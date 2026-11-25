import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { ClockService } from '../src/common/clock/clock.service';
import {
  Auth,
  IN_ENROLLMENT,
  SEEDED,
  allocateSemester,
  bootstrapApp,
  loginAs,
  makeClass,
  openSemester,
  subjectIdOf,
  userIdOf,
} from './helpers';

describe('Grade and attendance reports (e2e)', () => {
  let app: INestApplication;
  let clock: ClockService;
  let secretary: Auth;
  let carol: Auth;
  let frank: Auth;
  let erin: Auth;
  let classId: number;
  const server = () => app.getHttpServer();

  beforeAll(async () => {
    let ds;
    ({ app, ds } = await bootstrapApp());
    clock = app.get(ClockService);
    clock.setNow(IN_ENROLLMENT);
    secretary = await loginAs(app, SEEDED.secretary);
    carol = await loginAs(app, SEEDED.teacher);
    frank = await loginAs(app, '12121212108');
    erin = await loginAs(app, SEEDED.student);
    const semesterId = await openSemester(app, secretary);
    classId = (
      await makeClass(app, secretary, {
        semesterId,
        subjectId: await subjectIdOf(app, secretary, 'CC101'),
        teacherId: await userIdOf(ds, SEEDED.teacher),
      })
    ).id;
    const enrollment = await request(server()).post('/enrollments').set(erin).send({ classId }).expect(201);
    await allocateSemester(app, secretary, semesterId);
    clock.setNow('2026-03-10T12:00:00Z');
    const assessment = await request(server()).post(`/classes/${classId}/assessments`).set(carol).send({ name: 'Prova', weight: 1 }).expect(201);
    await request(server())
      .put(`/assessments/${assessment.body.id}/grades`)
      .set(carol)
      .send({ entries: [{ enrollmentId: enrollment.body.id, value: 8.5 }] })
      .expect(200);
    await request(server())
      .put(`/classes/${classId}/attendance`)
      .set(carol)
      .send({ date: '2026-03-02', records: [{ enrollmentId: enrollment.body.id, present: true }] })
      .expect(200);
  });
  afterAll(async () => {
    clock.setNow(null);
    await app.close();
  });

  it('exports the grade sheet as CSV for Excel', async () => {
    const res = await request(server()).get(`/classes/${classId}/reports/grades`).set(carol).expect(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('notas-CC101-T01.csv');
    expect(res.text.charCodeAt(0)).toBe(0xfeff);
    const lines = res.text.slice(1).trim().split('\r\n');
    expect(lines[0]).toBe('Matrícula;Aluno;Prova (peso 1);Média parcial;Média final;Resultado');
    expect(lines[1]).toBe('2026000001;Erin Student;8.5;8.5;8.5;Aprovado');
  });

  it('exports attendance as CSV', async () => {
    const res = await request(server()).get(`/classes/${classId}/reports/attendance?format=csv`).set(secretary).expect(200);
    expect(res.text).toContain('2026000001;Erin Student;1;0;0');
  });

  it('exports both reports as PDF', async () => {
    for (const kind of ['grades', 'attendance']) {
      const res = await request(server())
        .get(`/classes/${classId}/reports/${kind}?format=pdf`)
        .set(carol)
        .buffer(true)
        .parse((r, cb) => {
          const chunks: Buffer[] = [];
          r.on('data', (c: Buffer) => chunks.push(c));
          r.on('end', () => cb(null, Buffer.concat(chunks)));
        })
        .expect(200);
      expect(res.headers['content-type']).toBe('application/pdf');
      expect((res.body as Buffer).subarray(0, 8).toString()).toBe('%PDF-1.4');
      expect((res.body as Buffer).toString('latin1')).toContain('Erin Student');
    }
  });

  it('restricts reports to the responsible teacher and the Administration', async () => {
    await request(server()).get(`/classes/${classId}/reports/grades`).set(frank).expect(403);
    await request(server()).get(`/classes/${classId}/reports/grades`).set(erin).expect(403);
    await request(server()).get(`/classes/${classId}/reports/grades`).expect(401);
    await request(server()).get('/classes/99999/reports/grades').set(secretary).expect(404);
  });

  it('rejects unknown formats and audits exports', async () => {
    await request(server()).get(`/classes/${classId}/reports/grades?format=xls`).set(carol).expect(400);
    const admin = await loginAs(app, SEEDED.admin);
    const audit = await request(server()).get('/audit?action=report.export').set(admin).expect(200);
    expect(audit.body.total).toBeGreaterThanOrEqual(3);
  });
});

import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Course } from '../src/features/courses/entities/course.entity';
import { SubjectPrerequisite } from '../src/features/subjects/entities/subject-prerequisite.entity';
import { SEEDED, bootstrapApp, loginAs } from './helpers';

describe('Subjects, curriculum and prerequisites API (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let courseId: number;
  let seq = 0;

  let admin: { Authorization: string };
  let secretary: { Authorization: string };
  let teacher: { Authorization: string };
  let student: { Authorization: string };

  const server = () => app.getHttpServer();

  const newSubject = async (overrides: Record<string, unknown> = {}) => {
    const n = ++seq;
    const res = await request(server())
      .post('/subjects')
      .set(secretary)
      .send({
        code: `sub${n}`,
        name: `Subject Number ${n}`,
        workloadHours: 60,
        ...overrides,
      })
      .expect(201);
    return res.body as {
      id: number;
      code: string;
      name: string;
      prerequisites: { id: number }[];
    };
  };

  const setPrerequisites = (subjectId: number, prerequisiteIds: number[]) =>
    request(server())
      .put(`/subjects/${subjectId}/prerequisites`)
      .set(secretary)
      .send({ prerequisiteIds });

  const addToCurriculum = (
    subjectId: number,
    semester: number,
    extra: Record<string, unknown> = {},
    course = courseId,
  ) =>
    request(server())
      .post(`/courses/${course}/curriculum`)
      .set(secretary)
      .send({ subjectId, semester, ...extra });

  beforeAll(async () => {
    ({ app, ds } = await bootstrapApp());
    courseId = (await ds.getRepository(Course).findOneByOrFail({ code: 'CC' })).id;
    admin = await loginAs(app, SEEDED.admin);
    secretary = await loginAs(app, SEEDED.secretary);
    teacher = await loginAs(app, SEEDED.teacher);
    student = await loginAs(app, SEEDED.student);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('subjects', () => {
    it('creates a subject with an upper-cased code', async () => {
      const res = await request(server())
        .post('/subjects')
        .set(secretary)
        .send({
          code: 'mat101',
          name: ' Calculus I ',
          workloadHours: 90,
          description: 'Limits and derivatives',
        })
        .expect(201);

      expect(res.body).toMatchObject({
        code: 'MAT101',
        name: 'Calculus I',
        workloadHours: 90,
        description: 'Limits and derivatives',
        prerequisites: [],
        courseCount: 0,
      });
    });

    it('rejects a duplicate code (409), ignoring case', async () => {
      await newSubject({ code: 'dupe1' });
      await request(server())
        .post('/subjects')
        .set(secretary)
        .send({ code: 'DUPE1', name: 'Duplicated', workloadHours: 30 })
        .expect(409);
    });

    it.each([
      ['zero workload', { workloadHours: 0 }],
      ['excessive workload', { workloadHours: 5000 }],
      ['an invalid code', { code: 'a b' }],
      ['a short name', { name: 'ab' }],
      ['an unknown property', { credits: 4 }],
    ])('rejects %s (400)', async (_label, override) => {
      await request(server())
        .post('/subjects')
        .set(secretary)
        .send({ code: 'OKCODE', name: 'Valid name', workloadHours: 60, ...override })
        .expect(400);
    });

    it('lists with search and pagination for any profile', async () => {
      await newSubject({ name: 'Quantum Mechanics' });
      await newSubject({ name: 'Quantum Optics' });

      const res = await request(server())
        .get('/subjects?q=quantum&pageSize=1')
        .set(student)
        .expect(200);
      expect(res.body.total).toBe(2);
      expect(res.body.items).toHaveLength(1);

      const all = await request(server()).get('/subjects').set(teacher).expect(200);
      expect(all.body.items.length).toBeGreaterThan(0);
    });

    it('updates a subject and rejects a code clash', async () => {
      const first = await newSubject();
      const second = await newSubject();

      const res = await request(server())
        .patch(`/subjects/${first.id}`)
        .set(secretary)
        .send({ name: 'Renamed Subject', workloadHours: 45 })
        .expect(200);
      expect(res.body).toMatchObject({ name: 'Renamed Subject', workloadHours: 45 });

      await request(server())
        .patch(`/subjects/${first.id}`)
        .set(secretary)
        .send({ code: second.code })
        .expect(409);
      await request(server())
        .patch('/subjects/999999')
        .set(secretary)
        .send({ name: 'Missing Subject' })
        .expect(404);
    });

    it('enforces permissions', async () => {
      await request(server()).get('/subjects').expect(401);
      for (const token of [teacher, student]) {
        await request(server())
          .post('/subjects')
          .set(token)
          .send({ code: 'NOPE', name: 'Not Allowed', workloadHours: 30 })
          .expect(403);
        await request(server())
          .put('/subjects/1/prerequisites')
          .set(token)
          .send({ prerequisiteIds: [] })
          .expect(403);
      }
      await request(server()).delete('/subjects/1').set(secretary).expect(403);
    });

    it('deletes an unused subject (admin) and 404s afterwards', async () => {
      const subject = await newSubject();
      await request(server()).delete(`/subjects/${subject.id}`).set(admin).expect(204);
      await request(server()).get(`/subjects/${subject.id}`).set(admin).expect(404);
      await request(server()).delete(`/subjects/${subject.id}`).set(admin).expect(404);
    });
  });

  describe('curriculum', () => {
    it('places subjects and returns them grouped by semester', async () => {
      const calculus = await newSubject({ code: 'cur-calc', workloadHours: 90 });
      const algebra = await newSubject({ code: 'cur-alg', workloadHours: 60 });
      const physics = await newSubject({ code: 'cur-phy', workloadHours: 30 });
      await setPrerequisites(physics.id, [calculus.id]).expect(200);

      await addToCurriculum(physics.id, 3).expect(201);
      await addToCurriculum(calculus.id, 1).expect(201);
      const res = await addToCurriculum(algebra.id, 1, { mandatory: false }).expect(201);

      expect(res.body.courseId).toBe(courseId);
      const semesters = res.body.semesters as {
        semester: number;
        workloadHours: number;
        items: { code: string; mandatory: boolean; prerequisites: { code: string }[] }[];
      }[];
      expect(semesters.map((s) => s.semester)).toEqual([1, 3]);
      expect(semesters[0].items.map((i) => i.code)).toEqual(['CUR-ALG', 'CUR-CALC']);
      expect(semesters[0].workloadHours).toBe(150);
      expect(semesters[0].items[0].mandatory).toBe(false);
      expect(semesters[1].items[0].prerequisites.map((p) => p.code)).toEqual([
        'CUR-CALC',
      ]);
      expect(res.body.totalWorkloadHours).toBe(180);
    });

    it('is readable by any profile', async () => {
      for (const token of [admin, teacher, student]) {
        const res = await request(server())
          .get(`/courses/${courseId}/curriculum`)
          .set(token)
          .expect(200);
        expect(res.body).toHaveProperty('semesters');
      }
    });

    it('rejects a duplicated subject in the same curriculum (409)', async () => {
      const subject = await newSubject();
      await addToCurriculum(subject.id, 2).expect(201);
      await addToCurriculum(subject.id, 4).expect(409);
    });

    it('rejects a semester outside the course range (400)', async () => {
      const subject = await newSubject();
      await addToCurriculum(subject.id, 9).expect(400); // CC has 8 semesters
      await addToCurriculum(subject.id, 0).expect(400);
      await addToCurriculum(subject.id, 8).expect(201);
    });

    it('rejects an unknown subject (400) and an unknown course (404)', async () => {
      await addToCurriculum(999_999, 1).expect(400);
      const subject = await newSubject();
      await addToCurriculum(subject.id, 1, {}, 999_999).expect(404);
    });

    it('moves a subject to another semester and toggles mandatory', async () => {
      const subject = await newSubject();
      await addToCurriculum(subject.id, 2).expect(201);

      const res = await request(server())
        .patch(`/courses/${courseId}/curriculum/${subject.id}`)
        .set(secretary)
        .send({ semester: 5, mandatory: false })
        .expect(200);
      const item = res.body.semesters
        .flatMap((s: { items: { subjectId: number }[] }) => s.items)
        .find((i: { subjectId: number }) => i.subjectId === subject.id);
      expect(item.mandatory).toBe(false);
      expect(
        res.body.semesters.find((s: { items: { subjectId: number }[] }) =>
          s.items.some((i) => i.subjectId === subject.id),
        ).semester,
      ).toBe(5);

      await request(server())
        .patch(`/courses/${courseId}/curriculum/${subject.id}`)
        .set(secretary)
        .send({ semester: 20 })
        .expect(400);
      await request(server())
        .patch(`/courses/${courseId}/curriculum/999999`)
        .set(secretary)
        .send({ semester: 3 })
        .expect(404);
    });

    it('removes a subject from the curriculum', async () => {
      const subject = await newSubject();
      await addToCurriculum(subject.id, 2).expect(201);

      await request(server())
        .delete(`/courses/${courseId}/curriculum/${subject.id}`)
        .set(secretary)
        .expect(204);
      await request(server())
        .delete(`/courses/${courseId}/curriculum/${subject.id}`)
        .set(secretary)
        .expect(404);
    });

    it('does not let teachers or students change the curriculum (403)', async () => {
      const subject = await newSubject();
      for (const token of [teacher, student]) {
        await request(server())
          .post(`/courses/${courseId}/curriculum`)
          .set(token)
          .send({ subjectId: subject.id, semester: 1 })
          .expect(403);
        await request(server())
          .delete(`/courses/${courseId}/curriculum/${subject.id}`)
          .set(token)
          .expect(403);
      }
    });

    it('blocks deleting a subject that is in a curriculum (409)', async () => {
      const subject = await newSubject();
      await addToCurriculum(subject.id, 2).expect(201);

      const res = await request(server())
        .delete(`/subjects/${subject.id}`)
        .set(admin)
        .expect(409);
      expect(res.body.message).toMatch(/curriculum/);

      await request(server())
        .delete(`/courses/${courseId}/curriculum/${subject.id}`)
        .set(secretary)
        .expect(204);
      await request(server()).delete(`/subjects/${subject.id}`).set(admin).expect(204);
    });

    it('filters subjects by course', async () => {
      const inCourse = await newSubject({ name: 'Filtered In Course' });
      await newSubject({ name: 'Filtered Out Course' });
      await addToCurriculum(inCourse.id, 4).expect(201);

      const res = await request(server())
        .get(`/subjects?courseId=${courseId}&q=Filtered`)
        .set(admin)
        .expect(200);
      expect(res.body.items.map((s: { id: number }) => s.id)).toEqual([inCourse.id]);
    });
  });

  describe('prerequisites', () => {
    it('sets and replaces the prerequisites of a subject', async () => {
      const a = await newSubject();
      const b = await newSubject();
      const c = await newSubject();

      const first = await setPrerequisites(c.id, [a.id, b.id]).expect(200);
      expect(first.body.prerequisites.map((p: { id: number }) => p.id).sort()).toEqual(
        [a.id, b.id].sort(),
      );

      const second = await setPrerequisites(c.id, [a.id]).expect(200);
      expect(second.body.prerequisites.map((p: { id: number }) => p.id)).toEqual([a.id]);

      const cleared = await setPrerequisites(c.id, []).expect(200);
      expect(cleared.body.prerequisites).toEqual([]);
    });

    it('rejects a subject being its own prerequisite (400)', async () => {
      const subject = await newSubject();
      const res = await setPrerequisites(subject.id, [subject.id]).expect(400);
      expect(res.body.message).toMatch(/own prerequisite/);
    });

    it('rejects a direct cycle (400) and leaves the data unchanged', async () => {
      const a = await newSubject();
      const b = await newSubject();
      await setPrerequisites(b.id, [a.id]).expect(200);

      const res = await setPrerequisites(a.id, [b.id]).expect(400);
      expect(res.body.message).toMatch(/cycle/);

      const stored = await ds
        .getRepository(SubjectPrerequisite)
        .countBy({ subjectId: a.id });
      expect(stored).toBe(0);
    });

    it('rejects a transitive cycle (400)', async () => {
      const a = await newSubject();
      const b = await newSubject();
      const c = await newSubject();
      await setPrerequisites(b.id, [a.id]).expect(200); // b requires a
      await setPrerequisites(c.id, [b.id]).expect(200); // c requires b

      await setPrerequisites(a.id, [c.id]).expect(400); // a requires c: cycle
    });

    it('keeps the previous prerequisites when the replacement is rejected', async () => {
      const a = await newSubject();
      const b = await newSubject();
      const c = await newSubject();
      await setPrerequisites(c.id, [a.id]).expect(200);
      await setPrerequisites(a.id, [b.id]).expect(200);

      // c -> a -> b; making b require c would close a loop.
      await setPrerequisites(b.id, [c.id]).expect(400);
      const unchanged = await request(server())
        .get(`/subjects/${c.id}`)
        .set(admin)
        .expect(200);
      expect(unchanged.body.prerequisites.map((p: { id: number }) => p.id)).toEqual([
        a.id,
      ]);
    });

    it('rejects unknown subjects (400), duplicates (400) and a missing subject (404)', async () => {
      const subject = await newSubject();
      await setPrerequisites(subject.id, [999_999]).expect(400);
      const other = await newSubject();
      await setPrerequisites(subject.id, [other.id, other.id]).expect(400);
      await setPrerequisites(999_999, []).expect(404);
    });

    it('blocks deleting a subject used as a prerequisite (409)', async () => {
      const base = await newSubject();
      const dependent = await newSubject();
      await setPrerequisites(dependent.id, [base.id]).expect(200);

      const res = await request(server())
        .delete(`/subjects/${base.id}`)
        .set(admin)
        .expect(409);
      expect(res.body.message).toMatch(/prerequisite/);

      // Deleting the dependent frees the base.
      await request(server()).delete(`/subjects/${dependent.id}`).set(admin).expect(204);
      await request(server()).delete(`/subjects/${base.id}`).set(admin).expect(204);
    });
  });
});

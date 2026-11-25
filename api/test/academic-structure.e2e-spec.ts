import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Course } from '../src/features/courses/entities/course.entity';
import { CurriculumItem } from '../src/features/courses/entities/curriculum-item.entity';
import { Subject } from '../src/features/subjects/entities/subject.entity';
import { SEEDED, bootstrapApp, loginAs } from './helpers';

describe('Departments and courses API (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;

  let admin: { Authorization: string };
  let secretary: { Authorization: string };
  let teacher: { Authorization: string };
  let student: { Authorization: string };
  let noProfile: { Authorization: string };

  const server = () => app.getHttpServer();
  let seq = 0;

  const newDepartment = async (token = secretary) => {
    const n = ++seq;
    const res = await request(server())
      .post('/departments')
      .set(token)
      .send({ name: `Department ${n}`, code: `dep${n}` })
      .expect(201);
    return res.body as { id: number; name: string; code: string };
  };

  const newCourse = async (departmentId: number, overrides = {}) => {
    const n = ++seq;
    const res = await request(server())
      .post('/courses')
      .set(secretary)
      .send({
        name: `Course ${n}`,
        code: `crs${n}`,
        departmentId,
        totalSemesters: 8,
        ...overrides,
      })
      .expect(201);
    return res.body as { id: number; code: string; status: string };
  };

  beforeAll(async () => {
    ({ app, ds } = await bootstrapApp());
    admin = await loginAs(app, SEEDED.admin);
    secretary = await loginAs(app, SEEDED.secretary);
    teacher = await loginAs(app, SEEDED.teacher);
    student = await loginAs(app, SEEDED.student);

    // The seeded user without profile has no password yet.
    await request(server())
      .put('/auth/password/reset')
      .send({ identifier: SEEDED.noProfile, newPassword: 'password123' })
      .expect(200);
    noProfile = await loginAs(app, SEEDED.noProfile);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('departments', () => {
    it('creates a department with an upper-cased code and counts', async () => {
      const res = await request(server())
        .post('/departments')
        .set(secretary)
        .send({ name: '  Physics  ', code: 'fis' })
        .expect(201);

      expect(res.body).toMatchObject({
        name: 'Physics',
        code: 'FIS',
        courseCount: 0,
        teacherCount: 0,
      });
    });

    it('lists departments for any user with a profile, with counts', async () => {
      for (const token of [admin, secretary, teacher, student]) {
        const res = await request(server()).get('/departments').set(token).expect(200);
        const dcc = res.body.find((d: { code: string }) => d.code === 'DCC');
        // Courses: CC. Teachers: Carol, Grace and Heidi.
        expect(dcc).toMatchObject({ courseCount: 1, teacherCount: 3 });
      }
    });

    it('rejects duplicate name or code (409), ignoring case', async () => {
      await request(server())
        .post('/departments')
        .set(secretary)
        .send({ name: 'Computer Science', code: 'NEWCODE' })
        .expect(409);
      await request(server())
        .post('/departments')
        .set(secretary)
        .send({ name: 'Another Name', code: 'dcc' })
        .expect(409);
    });

    it.each([
      ['a short name', { name: 'Ab', code: 'OK1' }],
      ['an invalid code', { name: 'Valid Name', code: 'a b' }],
      ['an unknown property', { name: 'Valid Name', code: 'OK2', extra: 1 }],
    ])('rejects %s (400)', async (_label, body) => {
      await request(server()).post('/departments').set(secretary).send(body).expect(400);
    });

    it('updates a department and rejects a clash', async () => {
      const first = await newDepartment();
      const second = await newDepartment();

      const res = await request(server())
        .patch(`/departments/${first.id}`)
        .set(secretary)
        .send({ name: 'Renamed Department' })
        .expect(200);
      expect(res.body.name).toBe('Renamed Department');

      await request(server())
        .patch(`/departments/${first.id}`)
        .set(secretary)
        .send({ code: second.code })
        .expect(409);
      // Keeping its own values is not a conflict.
      await request(server())
        .patch(`/departments/${first.id}`)
        .set(secretary)
        .send({ code: first.code })
        .expect(200);
    });

    it('blocks deleting a department with courses or teachers (409)', async () => {
      const dcc = (
        await request(server()).get('/departments').set(admin)
      ).body.find((d: { code: string }) => d.code === 'DCC');

      const res = await request(server())
        .delete(`/departments/${dcc.id}`)
        .set(admin)
        .expect(409);
      expect(res.body.message).toMatch(/curso/);
    });

    it('deletes an empty department (admin only)', async () => {
      const department = await newDepartment();

      await request(server())
        .delete(`/departments/${department.id}`)
        .set(secretary)
        .expect(403);
      await request(server())
        .delete(`/departments/${department.id}`)
        .set(admin)
        .expect(204);
      await request(server())
        .get(`/departments/${department.id}`)
        .set(admin)
        .expect(404);
    });

    it('enforces permissions', async () => {
      await request(server()).get('/departments').expect(401);
      await request(server()).get('/departments').set(noProfile).expect(403);
      for (const token of [teacher, student]) {
        await request(server())
          .post('/departments')
          .set(token)
          .send({ name: 'Not Allowed', code: 'NOPE' })
          .expect(403);
      }
    });
  });

  describe('courses', () => {
    it('creates a course in a department (default status active)', async () => {
      const department = await newDepartment();
      const res = await request(server())
        .post('/courses')
        .set(secretary)
        .send({
          name: 'Physics',
          code: 'fis-b',
          departmentId: department.id,
          totalSemesters: 8,
        })
        .expect(201);

      expect(res.body).toMatchObject({
        name: 'Physics',
        code: 'FIS-B',
        departmentName: department.name,
        totalSemesters: 8,
        status: 'active',
        studentCount: 0,
      });
    });

    it('rejects duplicate code (409) and unknown department (400)', async () => {
      const department = await newDepartment();
      await request(server())
        .post('/courses')
        .set(secretary)
        .send({ name: 'Dup', code: 'cc', departmentId: department.id, totalSemesters: 4 })
        .expect(409);
      await request(server())
        .post('/courses')
        .set(secretary)
        .send({ name: 'Orphan', code: 'ORPH', departmentId: 999_999, totalSemesters: 4 })
        .expect(400);
    });

    it.each([
      ['zero semesters', { totalSemesters: 0 }],
      ['too many semesters', { totalSemesters: 21 }],
      ['an invalid status', { status: 'archived' }],
      ['a short name', { name: 'Hi' }],
    ])('rejects %s (400)', async (_label, override) => {
      const department = await newDepartment();
      await request(server())
        .post('/courses')
        .set(secretary)
        .send({
          name: 'Valid Course',
          code: 'VALID1',
          departmentId: department.id,
          totalSemesters: 8,
          ...override,
        })
        .expect(400);
    });

    it('lists with filters, search and pagination for any profile', async () => {
      const department = await newDepartment();
      const active = await newCourse(department.id, { name: 'Astronomy Basics' });
      await newCourse(department.id, { name: 'Closed Astronomy', status: 'inactive' });

      const byDepartment = await request(server())
        .get(`/courses?departmentId=${department.id}`)
        .set(student)
        .expect(200);
      expect(byDepartment.body.total).toBe(2);

      const activeOnly = await request(server())
        .get(`/courses?departmentId=${department.id}&status=active`)
        .set(teacher)
        .expect(200);
      expect(activeOnly.body.items.map((c: { id: number }) => c.id)).toEqual([
        active.id,
      ]);

      const search = await request(server())
        .get('/courses?q=astronomy&pageSize=1')
        .set(admin)
        .expect(200);
      expect(search.body.total).toBe(2);
      expect(search.body.items).toHaveLength(1);
    });

    it('reports the number of students of a course', async () => {
      const res = await request(server())
        .get('/courses?q=CC')
        .set(admin)
        .expect(200);
      const cc = res.body.items.find((c: { code: string }) => c.code === 'CC');
      // Erin, Ivan and Karl are Computer Science students.
      expect(cc.studentCount).toBe(4);
    });

    it('updates a course and can inactivate it', async () => {
      const department = await newDepartment();
      const other = await newDepartment();
      const course = await newCourse(department.id);

      const res = await request(server())
        .patch(`/courses/${course.id}`)
        .set(secretary)
        .send({ departmentId: other.id, status: 'inactive', name: 'Moved Course' })
        .expect(200);

      expect(res.body).toMatchObject({
        departmentId: other.id,
        status: 'inactive',
        name: 'Moved Course',
      });
    });

    it('rejects updates with an unknown department or a taken code', async () => {
      const department = await newDepartment();
      const first = await newCourse(department.id);
      const second = await newCourse(department.id);

      await request(server())
        .patch(`/courses/${first.id}`)
        .set(secretary)
        .send({ departmentId: 999_999 })
        .expect(400);
      await request(server())
        .patch(`/courses/${first.id}`)
        .set(secretary)
        .send({ code: second.code })
        .expect(409);
      await request(server())
        .patch('/courses/999999')
        .set(secretary)
        .send({ name: 'Missing Course' })
        .expect(404);
    });

    it('does not shrink the semesters below placed curriculum items', async () => {
      const department = await newDepartment();
      const course = await newCourse(department.id, { totalSemesters: 8 });
      const subject = await ds.getRepository(Subject).save({
        code: `SUBJ${++seq}`,
        name: 'Placed Subject',
        workloadHours: 60,
      } as Subject);
      await ds.getRepository(CurriculumItem).insert({
        courseId: course.id,
        subjectId: subject.id,
        semester: 6,
      });

      await request(server())
        .patch(`/courses/${course.id}`)
        .set(secretary)
        .send({ totalSemesters: 4 })
        .expect(409);
      await request(server())
        .patch(`/courses/${course.id}`)
        .set(secretary)
        .send({ totalSemesters: 6 })
        .expect(200);
    });

    it('blocks deleting a course with students and deletes an empty one', async () => {
      const cc = await ds.getRepository(Course).findOneByOrFail({ code: 'CC' });
      const res = await request(server())
        .delete(`/courses/${cc.id}`)
        .set(admin)
        .expect(409);
      expect(res.body.message).toMatch(/inative/);

      const department = await newDepartment();
      const empty = await newCourse(department.id);
      await request(server()).delete(`/courses/${empty.id}`).set(secretary).expect(403);
      await request(server()).delete(`/courses/${empty.id}`).set(admin).expect(204);
      await request(server()).get(`/courses/${empty.id}`).set(admin).expect(404);
    });

    it('enforces permissions', async () => {
      const department = await newDepartment();
      await request(server()).get('/courses').expect(401);
      await request(server()).get('/courses').set(noProfile).expect(403);
      for (const token of [teacher, student]) {
        await request(server())
          .post('/courses')
          .set(token)
          .send({ name: 'Not Allowed', code: 'NOPE', departmentId: department.id, totalSemesters: 4 })
          .expect(403);
      }
    });
  });
});

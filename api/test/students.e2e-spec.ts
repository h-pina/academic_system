import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Course } from '../src/features/courses/entities/course.entity';
import { Student } from '../src/features/students/entities/student.entity';
import { Teacher } from '../src/features/teachers/entities/teacher.entity';
import { User } from '../src/features/users/entities/user.entity';
import { RegistrationSequence } from '../src/features/users/entities/registration-sequence.entity';
import { RolesService } from '../src/features/roles/roles.service';
import { SEEDED, bootstrapApp, cpfFromBase, loginAs } from './helpers';

describe('Students API (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let courseId: number;
  let departmentId: number;
  let seq = 0;

  let admin: { Authorization: string };
  let secretary: { Authorization: string };
  let teacher: { Authorization: string };
  let student: { Authorization: string };

  const server = () => app.getHttpServer();
  const nextCpf = () => cpfFromBase(300_000_000 + ++seq);

  const newStudent = (overrides: Record<string, unknown> = {}) => {
    const n = ++seq;
    return {
      cpf: cpfFromBase(400_000_000 + n),
      name: `Student Number ${n}`,
      email: `student${n}@example.com`,
      courseId,
      entryYear: 2026,
      ...overrides,
    };
  };

  beforeAll(async () => {
    ({ app, ds } = await bootstrapApp());
    const course = await ds.getRepository(Course).findOneByOrFail({ code: 'CC' });
    courseId = course.id;
    departmentId = course.departmentId;
    admin = await loginAs(app, SEEDED.admin);
    secretary = await loginAs(app, SEEDED.secretary);
    teacher = await loginAs(app, SEEDED.teacher);
    student = await loginAs(app, SEEDED.student);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('create', () => {
    it('creates a user without password, a matrícula and the student', async () => {
      const body = newStudent();
      const res = await request(server())
        .post('/students')
        .set(secretary)
        .send(body)
        .expect(201);

      expect(res.body).toMatchObject({
        cpf: body.cpf,
        name: body.name,
        email: body.email,
        courseId,
        courseName: 'Computer Science',
        entryYear: 2026,
        status: 'active',
      });
      expect(res.body.registrationNumber).toMatch(/^2026\d{6}$/);

      const user = await ds.getRepository(User).findOneByOrFail({ cpf: body.cpf });
      expect(user.passwordHash).toBeNull();
      expect(user.active).toBe(true);

      // The matrícula is usable at the login screen (first access flow).
      const access = await request(server())
        .get(`/auth/access/${res.body.registrationNumber}`)
        .expect(200);
      expect(access.body).toEqual({ hasPassword: false, name: body.name });
    });

    it('issues sequential matrículas per year', async () => {
      const first = await request(server())
        .post('/students')
        .set(secretary)
        .send(newStudent({ entryYear: 2031 }))
        .expect(201);
      const second = await request(server())
        .post('/students')
        .set(secretary)
        .send(newStudent({ entryYear: 2031 }))
        .expect(201);
      const otherYear = await request(server())
        .post('/students')
        .set(secretary)
        .send(newStudent({ entryYear: 2032 }))
        .expect(201);

      expect(first.body.registrationNumber).toBe('2031000001');
      expect(second.body.registrationNumber).toBe('2031000002');
      expect(otherYear.body.registrationNumber).toBe('2032000001');
    });

    it('continues the sequence after the seeded matrícula', async () => {
      const res = await request(server())
        .post('/students')
        .set(secretary)
        .send(newStudent({ entryYear: 2026 }))
        .expect(201);

      const number = Number(res.body.registrationNumber.slice(4));
      expect(number).toBeGreaterThanOrEqual(2);
    });

    it('never reuses a matrícula, even after the student is removed', async () => {
      const created = await request(server())
        .post('/students')
        .set(secretary)
        .send(newStudent({ entryYear: 2033 }))
        .expect(201);
      expect(created.body.registrationNumber).toBe('2033000001');

      await ds.getRepository(User).delete({ id: created.body.userId });

      const next = await request(server())
        .post('/students')
        .set(secretary)
        .send(newStudent({ entryYear: 2033 }))
        .expect(201);
      expect(next.body.registrationNumber).toBe('2033000002');
    });

    it('reuses the user of a teacher and keeps their matrícula', async () => {
      const cpf = nextCpf();
      const user = await ds.getRepository(User).save({
        cpf,
        name: 'Prof Student',
        email: `prof${seq}@example.com`,
        registrationNumber: '2020000777',
        passwordHash: null,
      } as User);
      await ds.getRepository(Teacher).insert({
        userId: user.id,
        departmentId,
        title: 'master',
      });
      const usersBefore = await ds.getRepository(User).count();

      const res = await request(server())
        .post('/students')
        .set(secretary)
        .send({ cpf, courseId, entryYear: 2026 })
        .expect(201);

      expect(res.body.userId).toBe(user.id);
      expect(res.body.registrationNumber).toBe('2020000777');
      expect(await ds.getRepository(User).count()).toBe(usersBefore);
      expect(await ds.getRepository(Teacher).countBy({ userId: user.id })).toBe(1);
    });

    it('rejects a person that is already a student (409)', async () => {
      await request(server())
        .post('/students')
        .set(secretary)
        .send({ cpf: SEEDED.student, courseId, entryYear: 2026 })
        .expect(409);
    });

    it('rejects a new CPF without name and e-mail (400)', async () => {
      await request(server())
        .post('/students')
        .set(secretary)
        .send({ cpf: nextCpf(), courseId, entryYear: 2026 })
        .expect(400);
    });

    it('rejects an e-mail that already belongs to another user (409)', async () => {
      await request(server())
        .post('/students')
        .set(secretary)
        .send(newStudent({ email: 'alice@example.com' }))
        .expect(409);
    });

    it('rejects an unknown course (400)', async () => {
      const body = newStudent({ courseId: 999_999 });
      await request(server()).post('/students').set(secretary).send(body).expect(400);
      expect(await ds.getRepository(User).countBy({ cpf: body.cpf })).toBe(0);
    });

    it('rejects an inactive course (400)', async () => {
      const inactive = await ds.getRepository(Course).save({
        name: 'Closed Course',
        code: 'CLOSED',
        departmentId,
        totalSemesters: 8,
        status: 'inactive',
      } as Course);

      await request(server())
        .post('/students')
        .set(secretary)
        .send(newStudent({ courseId: inactive.id }))
        .expect(400);
    });

    it.each([
      ['an invalid CPF', { cpf: '12345678900' }],
      ['a year out of range', { entryYear: 1800 }],
      ['a short name', { name: 'Al' }],
      ['an invalid e-mail', { email: 'not-an-email' }],
      ['an unknown property', { registrationNumber: '2026000999' }],
    ])('rejects a payload with %s (400)', async (_label, override) => {
      await request(server())
        .post('/students')
        .set(secretary)
        .send(newStudent(override))
        .expect(400);
    });

    it('rolls the user back when the matrícula cannot be issued', async () => {
      await ds
        .getRepository(RegistrationSequence)
        .save({ year: 2040, lastNumber: 999_999 });
      const body = newStudent({ entryYear: 2040 });

      await request(server()).post('/students').set(secretary).send(body).expect(409);

      expect(await ds.getRepository(User).countBy({ cpf: body.cpf })).toBe(0);
      expect(await ds.getRepository(User).countBy({ email: body.email })).toBe(0);
    });

    it('handles concurrent creations without clashes', async () => {
      const bodies = Array.from({ length: 6 }, () =>
        newStudent({ entryYear: 2035 }),
      );

      const responses = await Promise.all(
        bodies.map((body) =>
          request(server()).post('/students').set(secretary).send(body),
        ),
      );

      expect(responses.map((res) => res.status)).toEqual(Array(6).fill(201));
      const numbers = responses
        .map((res) => res.body.registrationNumber as string)
        .sort();
      expect(numbers).toEqual([
        '2035000001',
        '2035000002',
        '2035000003',
        '2035000004',
        '2035000005',
        '2035000006',
      ]);
    });
  });

  describe('read', () => {
    it('lists students with their course (staff and teachers)', async () => {
      for (const token of [admin, secretary, teacher]) {
        const res = await request(server()).get('/students').set(token).expect(200);
        expect(res.body).toMatchObject({ page: 1, pageSize: 20 });
        expect(res.body.total).toBeGreaterThan(0);
        expect(res.body.items[0]).toHaveProperty('courseName');
      }
    });

    it('paginates and orders by name', async () => {
      const res = await request(server())
        .get('/students?page=1&pageSize=2')
        .set(admin)
        .expect(200);

      expect(res.body.items).toHaveLength(2);
      expect(res.body.pageSize).toBe(2);
      const names = res.body.items.map((item: { name: string }) => item.name);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    });

    it('filters by course, status and search term', async () => {
      const created = await request(server())
        .post('/students')
        .set(secretary)
        .send(newStudent({ name: 'Zelda Searchable' }))
        .expect(201);

      const byName = await request(server())
        .get('/students?q=searchable')
        .set(admin)
        .expect(200);
      expect(byName.body.items.map((i: { name: string }) => i.name)).toEqual([
        'Zelda Searchable',
      ]);

      const byNumber = await request(server())
        .get(`/students?q=${created.body.registrationNumber}`)
        .set(admin)
        .expect(200);
      expect(byNumber.body.total).toBe(1);

      const byCpf = await request(server())
        .get(`/students?q=${created.body.cpf}`)
        .set(admin)
        .expect(200);
      expect(byCpf.body.total).toBe(1);

      const none = await request(server())
        .get('/students?status=graduated')
        .set(admin)
        .expect(200);
      expect(none.body.total).toBe(0);

      const otherCourse = await request(server())
        .get('/students?courseId=999999')
        .set(admin)
        .expect(200);
      expect(otherCourse.body.total).toBe(0);
    });

    it('treats LIKE wildcards in the search term literally', async () => {
      const res = await request(server())
        .get('/students?q=%25')
        .set(admin)
        .expect(200);
      expect(res.body.total).toBe(0);
    });

    it('rejects invalid query parameters (400)', async () => {
      await request(server()).get('/students?pageSize=1000').set(admin).expect(400);
      await request(server()).get('/students?status=expelled').set(admin).expect(400);
    });

    it('returns a student by id', async () => {
      const seeded = await ds
        .getRepository(User)
        .findOneByOrFail({ cpf: SEEDED.student });

      const res = await request(server())
        .get(`/students/${seeded.id}`)
        .set(teacher)
        .expect(200);
      expect(res.body).toMatchObject({
        cpf: SEEDED.student,
        registrationNumber: '2026000001',
        name: 'Erin Student',
      });
    });

    it('returns 404 for an unknown student', async () => {
      await request(server()).get('/students/999999').set(admin).expect(404);
    });
  });

  describe('permissions', () => {
    it('requires a token (401)', async () => {
      await request(server()).get('/students').expect(401);
      await request(server()).post('/students').send(newStudent()).expect(401);
    });

    it('does not let a student list students (403)', async () => {
      await request(server()).get('/students').set(student).expect(403);
    });

    it('lets a student see only their own record', async () => {
      const own = await ds.getRepository(User).findOneByOrFail({ cpf: SEEDED.student });
      const other = await ds
        .getRepository(Student)
        .createQueryBuilder('s')
        .where('s.userId <> :id', { id: own.id })
        .getOneOrFail();

      await request(server()).get(`/students/${own.id}`).set(student).expect(200);
      await request(server())
        .get(`/students/${other.userId}`)
        .set(student)
        .expect(403);
    });

    it('does not let a teacher create, update or delete students (403)', async () => {
      await request(server()).post('/students').set(teacher).send(newStudent()).expect(403);
      await request(server()).patch('/students/1').set(teacher).send({}).expect(403);
      await request(server()).delete('/students/1').set(teacher).expect(403);
    });

    it('does not let a secretary delete students (403)', async () => {
      await request(server()).delete('/students/1').set(secretary).expect(403);
    });
  });

  describe('update and delete', () => {
    it('updates status and entry year', async () => {
      const created = await request(server())
        .post('/students')
        .set(secretary)
        .send(newStudent())
        .expect(201);

      const res = await request(server())
        .patch(`/students/${created.body.userId}`)
        .set(secretary)
        .send({ status: 'locked', entryYear: 2025 })
        .expect(200);

      expect(res.body).toMatchObject({ status: 'locked', entryYear: 2025 });
      // The matrícula issued at creation does not change.
      expect(res.body.registrationNumber).toBe(created.body.registrationNumber);
    });

    it('moves a student to another active course', async () => {
      const other = await ds.getRepository(Course).save({
        name: 'Another Course',
        code: 'ANOTHER',
        departmentId,
        totalSemesters: 6,
      } as Course);
      const created = await request(server())
        .post('/students')
        .set(secretary)
        .send(newStudent())
        .expect(201);

      const res = await request(server())
        .patch(`/students/${created.body.userId}`)
        .set(secretary)
        .send({ courseId: other.id })
        .expect(200);
      expect(res.body.courseName).toBe('Another Course');

      await request(server())
        .patch(`/students/${created.body.userId}`)
        .set(secretary)
        .send({ courseId: 999_999 })
        .expect(400);
    });

    it('rejects an invalid status (400) and an unknown student (404)', async () => {
      const created = await request(server())
        .post('/students')
        .set(secretary)
        .send(newStudent())
        .expect(201);

      await request(server())
        .patch(`/students/${created.body.userId}`)
        .set(secretary)
        .send({ status: 'expelled' })
        .expect(400);
      await request(server())
        .patch('/students/999999')
        .set(secretary)
        .send({ status: 'locked' })
        .expect(404);
    });

    it('deletes only the student profile, never the user', async () => {
      const created = await request(server())
        .post('/students')
        .set(secretary)
        .send(newStudent())
        .expect(201);

      await request(server())
        .delete(`/students/${created.body.userId}`)
        .set(admin)
        .expect(204);

      expect(
        await ds.getRepository(Student).countBy({ userId: created.body.userId }),
      ).toBe(0);
      expect(
        await ds.getRepository(User).countBy({ id: created.body.userId }),
      ).toBe(1);
      await request(server())
        .delete(`/students/${created.body.userId}`)
        .set(admin)
        .expect(404);
    });

    it('stops granting the student role once the profile is removed', async () => {
      const created = await request(server())
        .post('/students')
        .set(secretary)
        .send(newStudent())
        .expect(201);
      const roles = app.get(RolesService);
      expect(await roles.resolveRoles(created.body.userId)).toEqual(['student']);

      await request(server())
        .delete(`/students/${created.body.userId}`)
        .set(admin)
        .expect(204);

      expect(await roles.resolveRoles(created.body.userId)).toEqual([]);
    });
  });
});

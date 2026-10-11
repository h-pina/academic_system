import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Course } from '../src/features/courses/entities/course.entity';
import { Department } from '../src/features/departments/entities/department.entity';
import { Student } from '../src/features/students/entities/student.entity';
import { Teacher } from '../src/features/teachers/entities/teacher.entity';
import { User } from '../src/features/users/entities/user.entity';
import { RolesService } from '../src/features/roles/roles.service';
import { PASSWORD, SEEDED, bootstrapApp, cpfFromBase, loginAs } from './helpers';

describe('Teachers API (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let departmentId: number;
  let otherDepartmentId: number;
  let seq = 0;

  let admin: { Authorization: string };
  let secretary: { Authorization: string };
  let teacher: { Authorization: string };
  let student: { Authorization: string };

  const server = () => app.getHttpServer();

  const newTeacher = (overrides: Record<string, unknown> = {}) => {
    const n = ++seq;
    return {
      cpf: cpfFromBase(800_000_000 + n),
      name: `Teacher Number ${n}`,
      email: `teacher${n}@example.com`,
      departmentId,
      title: 'master',
      ...overrides,
    };
  };

  beforeAll(async () => {
    ({ app, ds } = await bootstrapApp());
    const department = await ds
      .getRepository(Department)
      .findOneByOrFail({ code: 'DCC' });
    departmentId = department.id;
    otherDepartmentId = (
      await ds.getRepository(Department).findOneByOrFail({ code: 'DMAT' })
    ).id;
    admin = await loginAs(app, SEEDED.admin);
    secretary = await loginAs(app, SEEDED.secretary);
    teacher = await loginAs(app, SEEDED.teacher);

    // A student-only user (the seeded student becomes a teacher in a test).
    const course = await ds.getRepository(Course).findOneByOrFail({ code: 'CC' });
    const cpf = cpfFromBase(900_000_001);
    const user = await ds.getRepository(User).save({
      cpf,
      name: 'Only Student',
      email: 'only.student@example.com',
      passwordHash: await bcrypt.hash(PASSWORD, 4),
    } as User);
    await ds
      .getRepository(Student)
      .insert({ userId: user.id, courseId: course.id, entryYear: 2026 });
    student = await loginAs(app, cpf);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('create', () => {
    it('creates the user without password and the teacher profile', async () => {
      const body = newTeacher();
      const res = await request(server())
        .post('/teachers')
        .set(secretary)
        .send(body)
        .expect(201);

      expect(res.body).toMatchObject({
        cpf: body.cpf,
        name: body.name,
        departmentId,
        departmentName: 'Computer Science',
        title: 'master',
        status: 'active',
        registrationNumber: null,
      });
      const user = await ds.getRepository(User).findOneByOrFail({ cpf: body.cpf });
      expect(user.passwordHash).toBeNull();
      expect(await app.get(RolesService).resolveRoles(user.id)).toEqual([
        'teacher',
      ]);
    });

    it('reuses an existing user (a student becomes also teacher)', async () => {
      const studentUser = await ds
        .getRepository(User)
        .findOneByOrFail({ cpf: SEEDED.student });
      const before = await ds.getRepository(User).count();

      const res = await request(server())
        .post('/teachers')
        .set(admin)
        .send({ cpf: SEEDED.student, departmentId, title: 'doctor' })
        .expect(201);

      expect(res.body.userId).toBe(studentUser.id);
      // The existing matrícula is kept; no duplicate user is created.
      expect(res.body.registrationNumber).toBe('2026000001');
      expect(await ds.getRepository(User).count()).toBe(before);
      expect(await ds.getRepository(Student).countBy({ userId: studentUser.id })).toBe(1);
      expect(
        [...(await app.get(RolesService).resolveRoles(studentUser.id))].sort(),
      ).toEqual(['student', 'teacher']);
    });

    it('rejects a CPF that is already a teacher (409)', async () => {
      await request(server())
        .post('/teachers')
        .set(admin)
        .send({ cpf: SEEDED.teacher, departmentId, title: 'doctor' })
        .expect(409);
    });

    it('rejects an e-mail that belongs to another user (409)', async () => {
      await request(server())
        .post('/teachers')
        .set(admin)
        .send(newTeacher({ email: 'alice@example.com' }))
        .expect(409);
    });

    it('rejects an unknown department (400) without leaving a user behind', async () => {
      const body = newTeacher({ departmentId: 999_999 });
      await request(server()).post('/teachers').set(admin).send(body).expect(400);
      expect(await ds.getRepository(User).countBy({ cpf: body.cpf })).toBe(0);
    });

    it.each([
      ['a new CPF without name and e-mail', { name: undefined, email: undefined }],
      ['an invalid CPF', { cpf: '12345678900' }],
      ['an invalid title', { title: 'professor' }],
      ['a missing department', { departmentId: undefined }],
      ['an unknown property', { registrationNumber: '2026000999' }],
    ])('rejects %s (400)', async (_label, override) => {
      await request(server())
        .post('/teachers')
        .set(admin)
        .send(newTeacher(override))
        .expect(400);
    });

    it('does not leave a user behind when the profile cannot be created', async () => {
      // Concurrent duplicates: only one succeeds, the other is a clean 409.
      const body = newTeacher();
      const [first, second] = await Promise.all([
        request(server()).post('/teachers').set(admin).send(body),
        request(server()).post('/teachers').set(admin).send(body),
      ]);

      expect([first.status, second.status].sort()).toEqual([201, 409]);
      expect(await ds.getRepository(User).countBy({ cpf: body.cpf })).toBe(1);
      const user = await ds.getRepository(User).findOneByOrFail({ cpf: body.cpf });
      expect(await ds.getRepository(Teacher).countBy({ userId: user.id })).toBe(1);
    });
  });

  describe('read', () => {
    it('lists teachers for staff and teachers', async () => {
      for (const token of [admin, secretary, teacher]) {
        const res = await request(server()).get('/teachers').set(token).expect(200);
        expect(res.body.total).toBeGreaterThan(0);
        expect(res.body.items[0]).toHaveProperty('departmentName');
      }
    });

    it('filters by department, status and search term', async () => {
      const inOther = await request(server())
        .post('/teachers')
        .set(admin)
        .send(newTeacher({ name: 'Ada Mathematician', departmentId: otherDepartmentId }))
        .expect(201);

      const byDepartment = await request(server())
        .get(`/teachers?departmentId=${otherDepartmentId}`)
        .set(admin)
        .expect(200);
      // Seeded: Frank Teacher teaches in Mathematics.
      expect(byDepartment.body.items.map((i: { name: string }) => i.name)).toEqual([
        'Ada Mathematician',
        'Frank Teacher',
      ]);

      const bySearch = await request(server())
        .get('/teachers?q=mathematician')
        .set(admin)
        .expect(200);
      expect(bySearch.body.total).toBe(1);

      await request(server())
        .patch(`/teachers/${inOther.body.userId}`)
        .set(admin)
        .send({ status: 'inactive' })
        .expect(200);
      const inactive = await request(server())
        .get('/teachers?status=inactive')
        .set(admin)
        .expect(200);
      expect(inactive.body.items.map((i: { userId: number }) => i.userId)).toEqual([
        inOther.body.userId,
      ]);
    });

    it('paginates', async () => {
      const res = await request(server())
        .get('/teachers?pageSize=1&page=2')
        .set(admin)
        .expect(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.page).toBe(2);
    });

    it('returns 404 for an unknown teacher and 400 for invalid filters', async () => {
      await request(server()).get('/teachers/999999').set(admin).expect(404);
      await request(server()).get('/teachers?status=retired').set(admin).expect(400);
    });
  });

  describe('permissions', () => {
    it('requires a token (401) and a profile with access (403)', async () => {
      await request(server()).get('/teachers').expect(401);
      await request(server()).get('/teachers').set(student).expect(403);
    });

    it('does not let a teacher change teachers (403)', async () => {
      await request(server()).post('/teachers').set(teacher).send(newTeacher()).expect(403);
      await request(server()).patch('/teachers/1').set(teacher).send({}).expect(403);
      await request(server()).delete('/teachers/1').set(teacher).expect(403);
    });

    it('does not let a secretary delete teachers (403)', async () => {
      await request(server()).delete('/teachers/1').set(secretary).expect(403);
    });
  });

  describe('update and delete', () => {
    it('updates title, department and status', async () => {
      const created = await request(server())
        .post('/teachers')
        .set(secretary)
        .send(newTeacher())
        .expect(201);

      const res = await request(server())
        .patch(`/teachers/${created.body.userId}`)
        .set(secretary)
        .send({ title: 'doctor', departmentId: otherDepartmentId, status: 'inactive' })
        .expect(200);

      expect(res.body).toMatchObject({
        title: 'doctor',
        departmentName: 'Mathematics',
        status: 'inactive',
      });
    });

    it('rejects an unknown department or invalid status', async () => {
      const created = await request(server())
        .post('/teachers')
        .set(secretary)
        .send(newTeacher())
        .expect(201);

      await request(server())
        .patch(`/teachers/${created.body.userId}`)
        .set(secretary)
        .send({ departmentId: 999_999 })
        .expect(400);
      await request(server())
        .patch(`/teachers/${created.body.userId}`)
        .set(secretary)
        .send({ status: 'retired' })
        .expect(400);
      await request(server())
        .patch('/teachers/999999')
        .set(secretary)
        .send({ title: 'doctor' })
        .expect(404);
    });

    it('an inactive teacher loses the teacher role immediately', async () => {
      const created = await request(server())
        .post('/teachers')
        .set(secretary)
        .send(newTeacher())
        .expect(201);
      const roles = app.get(RolesService);
      expect(await roles.resolveRoles(created.body.userId)).toEqual(['teacher']);

      await request(server())
        .patch(`/teachers/${created.body.userId}`)
        .set(secretary)
        .send({ status: 'inactive' })
        .expect(200);

      expect(await roles.resolveRoles(created.body.userId)).toEqual([]);
    });

    it('deletes only the teacher profile, never the user', async () => {
      const created = await request(server())
        .post('/teachers')
        .set(secretary)
        .send(newTeacher())
        .expect(201);

      await request(server())
        .delete(`/teachers/${created.body.userId}`)
        .set(admin)
        .expect(204);

      expect(
        await ds.getRepository(Teacher).countBy({ userId: created.body.userId }),
      ).toBe(0);
      expect(
        await ds.getRepository(User).countBy({ id: created.body.userId }),
      ).toBe(1);
      await request(server())
        .delete(`/teachers/${created.body.userId}`)
        .set(admin)
        .expect(404);
    });
  });
});

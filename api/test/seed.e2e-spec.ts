import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Course } from '../src/features/courses/entities/course.entity';
import { CurriculumItem } from '../src/features/courses/entities/curriculum-item.entity';
import { Department } from '../src/features/departments/entities/department.entity';
import { Staff } from '../src/features/staff/entities/staff.entity';
import { Student } from '../src/features/students/entities/student.entity';
import { Subject } from '../src/features/subjects/entities/subject.entity';
import { SubjectPrerequisite } from '../src/features/subjects/entities/subject-prerequisite.entity';
import { Teacher } from '../src/features/teachers/entities/teacher.entity';
import { User } from '../src/features/users/entities/user.entity';
import { RolesService } from '../src/features/roles/roles.service';
import { SeederService } from '../src/seed/seeder.service';
import {
  SEED_CURRICULUM,
  SEED_PASSWORD,
  SEED_USERS,
} from '../src/seed/seed-data';
import { buildGraph, wouldCreateCycle } from '../src/features/subjects/prerequisite-graph';
import { SEEDED, bootstrapApp, loginAs } from './helpers';

describe('Seed data (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;

  const server = () => app.getHttpServer();

  beforeAll(async () => {
    ({ app, ds } = await bootstrapApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('seeds the academic structure', async () => {
    expect(await ds.getRepository(Department).count()).toBe(2);
    expect(await ds.getRepository(Course).count()).toBe(2);
    expect(await ds.getRepository(Subject).count()).toBe(12);
    expect(await ds.getRepository(CurriculumItem).count()).toBe(
      SEED_CURRICULUM.length,
    );
    expect(await ds.getRepository(SubjectPrerequisite).count()).toBe(8);
  });

  it('seeds people with every kind of profile', async () => {
    expect(await ds.getRepository(Staff).count()).toBe(2);
    expect(await ds.getRepository(Teacher).count()).toBe(4);
    expect(await ds.getRepository(Student).count()).toBe(6);
    expect(await ds.getRepository(User).count()).toBe(SEED_USERS.length);
  });

  it('derives the expected roles for each seeded person', async () => {
    const roles = app.get(RolesService);
    const rolesOf = async (name: string): Promise<string[]> => {
      const user = await ds.getRepository(User).findOneByOrFail({ name });
      return [...(await roles.resolveRoles(user.id))].sort();
    };

    // `admin` includes `secretary` in the guard, not in the stored roles.
    expect(await rolesOf('Alice Admin')).toEqual(['admin']);
    expect(await rolesOf('Bob Secretary')).toEqual(['secretary']);
    expect(await rolesOf('Carol Teacher')).toEqual(['teacher']);
    expect(await rolesOf('Erin Student')).toEqual(['student']);
    expect(await rolesOf('Heidi Both')).toEqual(['student', 'teacher']);
    expect(await rolesOf('Mallory Unlinked')).toEqual([]);
    expect(await rolesOf('Dave Pending')).toEqual([]);
  });

  it('lets every seeded user with a password sign in', async () => {
    for (const seed of SEED_USERS.filter((user) => user.password)) {
      const res = await request(server())
        .post('/auth/login')
        .send({ identifier: seed.cpf, password: SEED_PASSWORD });
      expect(res.status, seed.name).toBe(201);
    }
  });

  it('lets students sign in with their matrícula', async () => {
    const withNumber = SEED_USERS.filter((user) => user.registrationNumber);
    expect(withNumber.length).toBeGreaterThanOrEqual(5);

    for (const seed of withNumber) {
      const res = await request(server())
        .post('/auth/login')
        .send({ identifier: seed.registrationNumber, password: SEED_PASSWORD });
      expect(res.status, seed.name).toBe(201);
    }
  });

  it('has a user for the first-access flow and a user without link', async () => {
    const access = await request(server())
      .get(`/auth/access/${SEEDED.noProfile}`)
      .expect(200);
    expect(access.body).toEqual({ hasPassword: false, name: 'Dave Pending' });

    const admin = await loginAs(app, SEEDED.admin);
    const orphans = await request(server())
      .get('/users/orphans')
      .set(admin)
      .expect(200);
    expect(orphans.body.map((u: { name: string }) => u.name).sort()).toEqual([
      'Dave Pending',
      'Mallory Unlinked',
    ]);
  });

  it('keeps the prerequisite graph acyclic', async () => {
    const rows = await ds.getRepository(SubjectPrerequisite).find();
    for (const row of rows) {
      const others = rows.filter(
        (other) =>
          !(
            other.subjectId === row.subjectId &&
            other.prerequisiteId === row.prerequisiteId
          ),
      );
      expect(
        wouldCreateCycle(buildGraph(others), row.subjectId, [row.prerequisiteId]),
      ).toBe(false);
    }
  });

  it('places prerequisites in earlier semesters than their dependents', async () => {
    const items = await ds.getRepository(CurriculumItem).find();
    const links = await ds.getRepository(SubjectPrerequisite).find();

    for (const link of links) {
      for (const item of items.filter((i) => i.subjectId === link.subjectId)) {
        const prerequisite = items.find(
          (i) => i.courseId === item.courseId && i.subjectId === link.prerequisiteId,
        );
        if (prerequisite) {
          expect(prerequisite.semester).toBeLessThan(item.semester);
        }
      }
    }
  });

  it('keeps the matrícula sequence ahead of the seeded numbers', async () => {
    const admin = await loginAs(app, SEEDED.admin);
    const course = await ds.getRepository(Course).findOneByOrFail({ code: 'CC' });

    const res = await request(server())
      .post('/students')
      .set(admin)
      .send({
        cpf: '39053344705',
        name: 'Newcomer Student',
        email: 'newcomer@example.com',
        courseId: course.id,
        entryYear: 2025,
      })
      .expect(201);

    // 2025000001 and 2025000002 are seeded.
    expect(res.body.registrationNumber).toBe('2025000003');
  });

  it('is idempotent: running the seed again changes nothing', async () => {
    const seeder = app.get(SeederService);
    const counts = async () => ({
      users: await ds.getRepository(User).count(),
      subjects: await ds.getRepository(Subject).count(),
      items: await ds.getRepository(CurriculumItem).count(),
      links: await ds.getRepository(SubjectPrerequisite).count(),
      students: await ds.getRepository(Student).count(),
    });

    const before = await counts();
    await seeder.run();
    await seeder.run({ force: true });

    expect(await counts()).toEqual(before);
  });
});

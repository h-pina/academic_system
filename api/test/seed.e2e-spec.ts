import { ClockService } from '../src/common/clock/clock.service';
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
    expect(await ds.getRepository(Student).count()).toBe(7);
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

    // 2025000001 to 2025000003 are seeded.
    expect(res.body.registrationNumber).toBe('2025000004');
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

describe('Academic demo seed (e2e)', () => {
  let app: INestApplication;
  const server = () => app.getHttpServer();

  beforeAll(async () => {
    ({ app } = await bootstrapApp({ academicDemo: true }));
  });
  afterAll(async () => {
    await app.close();
  });

  it('opens a running semester whose enrollment window includes today', async () => {
    const student = await loginAs(app, SEEDED.student);
    const semesters = await request(server()).get('/semesters?status=active').set(student).expect(200);
    expect(semesters.body).toHaveLength(1);
    const { calendar } = semesters.body[0];
    const today = new Date().toISOString().slice(0, 10);
    expect(calendar.enrollmentStart <= today && today <= calendar.enrollmentEnd).toBe(true);
  });

  it('offers approved classes and keeps the pending one out of the catalogue', async () => {
    const student = await loginAs(app, SEEDED.student);
    const res = await request(server()).get('/classes/available?pageSize=100').set(student).expect(200);
    const codes = res.body.items.map((c: { subject: { code: string } }) => c.subject.code).sort();
    expect(codes).toEqual(['CC101', 'CC102', 'MAT101', 'MAT102', 'MAT103', 'MAT104', 'STA101']);
  });

  it('lets a student with an approved prerequisite enroll, and blocks one without it', async () => {
    const ivan = await loginAs(app, '44455566619');
    const erin = await loginAs(app, SEEDED.student);
    const catalogue = await request(server()).get('/classes/available?q=CC102').set(ivan).expect(200);
    const cc102 = catalogue.body.items[0].id;
    await request(server()).post('/enrollments').set(ivan).send({ classId: cc102 }).expect(201);
    const denied = await request(server()).post('/enrollments').set(erin).send({ classId: cc102 }).expect(400);
    expect(denied.body.code).toBe('MSG01');
  });

  it('feeds the student panel and the Administration\'s pending approvals', async () => {
    const erin = await loginAs(app, SEEDED.student);
    const panel = await request(server()).get('/me/academic-panel').set(erin).expect(200);
    const cc101 = panel.body.classes.find((c: { class: { subject: { code: string } } }) => c.class.subject.code === 'CC101');
    expect(cc101.grades.map((g: { value: number }) => g.value)).toEqual([8, 9.5]);
    expect(cc101.finalGrade).toBe(8.6);
    expect(cc101.news).toHaveLength(1);
    expect(cc101.activities).toHaveLength(1);

    // A finished class shows the stored outcome, not a recomputation (the demo
    // class has no assessments, so recomputing would say "in progress").
    const past = panel.body.classes.find((c: { class: { status: string } }) => c.class.status === 'closed');
    expect(past).toMatchObject({ result: 'failed_grade', finalGrade: 4.5, enrollmentStatus: 'failed_grade' });

    const secretary = await loginAs(app, SEEDED.secretary);
    const pending = await request(server()).get('/classes?status=pending').set(secretary).expect(200);
    expect(pending.body.items.map((c: { subject: { code: string } }) => c.subject.code)).toEqual(['CC201']);
  });

  it('gives Nina every enrollment case: prerequisites met and unmet, cancelling, won and lost seats', async () => {
    const nina = await loginAs(app, '10020030088');
    const secretary = await loginAs(app, SEEDED.secretary);
    const find = async (code: string) =>
      (await request(server()).get(`/classes/available?q=${code}`).set(nina).expect(200)).body.items[0];

    // CC101 is hidden: she passed it.
    const catalogue = await request(server()).get('/classes/available?pageSize=100').set(nina).expect(200);
    expect(catalogue.body.items.map((c: { subject: { code: string } }) => c.subject.code)).not.toContain('CC101');

    // Prerequisite met (CC101 -> CC102) and unmet (MAT101 -> MAT102).
    const cc102 = await find('CC102');
    const request102 = await request(server()).post('/enrollments').set(nina).send({ classId: cc102.id }).expect(201);
    const mat102 = await find('MAT102');
    const blocked = await request(server()).post('/enrollments').set(nina).send({ classId: mat102.id }).expect(400);
    expect(blocked.body.code).toBe('MSG01');

    // Cancelling a request.
    await request(server()).delete(`/enrollments/${request102.body.id}`).set(nina).expect(200);

    // Two contested single-seat classes.
    const mat104 = await find('MAT104');
    const sta101 = await find('STA101');
    await request(server()).post('/enrollments').set(nina).send({ classId: mat104.id }).expect(201);
    await request(server()).post('/enrollments').set(nina).send({ classId: sta101.id }).expect(201);

    app.get(ClockService).advanceDays(31);
    const semester = (await request(server()).get('/semesters?status=active').set(secretary).expect(200)).body[0];
    await request(server()).post(`/semesters/${semester.id}/allocate`).set(secretary);
    const mine = await request(server()).get('/enrollments/me').set(nina).expect(200);
    const statusOf = (code: string) =>
      mine.body.find((e: { class: { subject: { code: string } } }) => e.class.subject.code === code)?.status;
    expect(statusOf('MAT104')).toBe('confirmed'); // 2025 entry beats Erin's 2026
    expect(statusOf('STA101')).toBe('not_allocated'); // Ivan (2025) asked first
    app.get(ClockService).reset();
  });
});

import { INestApplication } from '@nestjs/common';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { Course } from '../src/features/courses/entities/course.entity';
import { Student } from '../src/features/students/entities/student.entity';
import { Teacher } from '../src/features/teachers/entities/teacher.entity';
import { User } from '../src/features/users/entities/user.entity';
import { PASSWORD, SEEDED, bootstrapApp, loginAs } from './helpers';

describe('Dashboard (e2e)', () => {
  let app: INestApplication;
  let ds: DataSource;
  const server = () => app.getHttpServer();

  beforeAll(async () => {
    ({ app, ds } = await bootstrapApp());
  });

  afterAll(async () => {
    await app.close();
  });

  it('requires a token (401) and a profile (403)', async () => {
    await request(server()).get('/dashboard').expect(401);

    await request(server())
      .put('/auth/password/reset')
      .send({ identifier: SEEDED.noProfile, newPassword: PASSWORD })
      .expect(200);
    const noProfile = await loginAs(app, SEEDED.noProfile);
    await request(server()).get('/dashboard').set(noProfile).expect(403);
  });

  it('gives admin and secretary the institution overview, matching the database', async () => {
    for (const cpf of [SEEDED.admin, SEEDED.secretary]) {
      const token = await loginAs(app, cpf);
      const res = await request(server()).get('/dashboard').set(token).expect(200);

      expect(res.body.teacher).toBeUndefined();
      expect(res.body.student).toBeUndefined();
      expect(res.body.institution).toMatchObject({
        activeStudents: await ds.getRepository(Student).countBy({ status: 'active' }),
        activeTeachers: await ds.getRepository(Teacher).countBy({ status: 'active' }),
        activeCourses: 2,
        subjects: 12,
        departments: 2,
      });
    }
  });

  it('counts only active students per course', async () => {
    const token = await loginAs(app, SEEDED.admin);
    const res = await request(server()).get('/dashboard').set(token).expect(200);

    const byCode = Object.fromEntries(
      res.body.institution.studentsByCourse.map(
        (row: { courseCode: string; activeStudents: number }) => [
          row.courseCode,
          row.activeStudents,
        ],
      ),
    );
    // CC: Erin and Ivan are active (Karl is locked). MAT: Judy and Heidi are
    // active (Liam is graduated).
    expect(byCode).toEqual({ CC: 2, MAT: 2 });
  });

  it('gives a teacher the overview of their department', async () => {
    const token = await loginAs(app, SEEDED.teacher);
    const res = await request(server()).get('/dashboard').set(token).expect(200);

    expect(res.body.institution).toBeUndefined();
    expect(res.body.teacher.department).toMatchObject({
      code: 'DCC',
      name: 'Computer Science',
      activeTeachers: 3,
      activeStudents: 2,
    });
    expect(res.body.teacher.courses).toEqual([
      expect.objectContaining({ code: 'CC', activeStudents: 2 }),
    ]);
  });

  it('gives a student their own course and curriculum workload', async () => {
    const token = await loginAs(app, SEEDED.student);
    const res = await request(server()).get('/dashboard').set(token).expect(200);

    expect(res.body.institution).toBeUndefined();
    expect(res.body.student).toMatchObject({
      registrationNumber: '2026000001',
      entryYear: 2026,
      status: 'active',
      course: {
        code: 'CC',
        name: 'Computer Science',
        departmentName: 'Computer Science',
        totalSemesters: 8,
        curriculumWorkloadHours: 840,
      },
    });
  });

  it('combines sections for a user with several profiles', async () => {
    // Heidi is both a teacher (DCC) and a student (MAT).
    const token = await loginAs(app, '33344455508');
    const res = await request(server()).get('/dashboard').set(token).expect(200);

    expect([...res.body.roles].sort()).toEqual(['student', 'teacher']);
    expect(res.body.teacher.department.code).toBe('DCC');
    expect(res.body.student.course.code).toBe('MAT');
    expect(res.body.institution).toBeUndefined();
  });

  it('follows changes in the data', async () => {
    const admin = await loginAs(app, SEEDED.admin);
    const before = await request(server()).get('/dashboard').set(admin);

    const erin = await ds.getRepository(User).findOneByOrFail({ cpf: SEEDED.student });
    await ds.getRepository(Student).update({ userId: erin.id }, { status: 'locked' });
    const course = await ds.getRepository(Course).findOneByOrFail({ code: 'CC' });
    await ds.getRepository(Course).update({ id: course.id }, { status: 'inactive' });

    const after = await request(server()).get('/dashboard').set(admin);
    expect(after.body.institution.activeStudents).toBe(
      before.body.institution.activeStudents - 1,
    );
    expect(after.body.institution.activeCourses).toBe(
      before.body.institution.activeCourses - 1,
    );
  });
});

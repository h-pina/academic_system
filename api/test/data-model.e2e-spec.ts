// Test environment: set before the app modules are loaded.
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret';
process.env.BCRYPT_SALT_ROUNDS = '4';
process.env.SEED_ON_STARTUP = 'false';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { User } from '../src/features/users/entities/user.entity';
import { RegistrationSequence } from '../src/features/users/entities/registration-sequence.entity';
import { UsersRepository } from '../src/features/users/users.repository';
import { Staff } from '../src/features/staff/entities/staff.entity';
import { Teacher } from '../src/features/teachers/entities/teacher.entity';
import { Student } from '../src/features/students/entities/student.entity';
import { Department } from '../src/features/departments/entities/department.entity';
import { Course } from '../src/features/courses/entities/course.entity';
import { CurriculumItem } from '../src/features/courses/entities/curriculum-item.entity';
import { Subject } from '../src/features/subjects/entities/subject.entity';
import { SubjectPrerequisite } from '../src/features/subjects/entities/subject-prerequisite.entity';

describe('Data model constraints', () => {
  let app: INestApplication;
  let ds: DataSource;

  let counter = 0;
  const nextCpf = () => String(10_000_000_000 + ++counter);

  const makeUser = async (overrides: Partial<User> = {}): Promise<User> => {
    const n = ++counter;
    const user = await ds.getRepository(User).save({
      cpf: nextCpf(),
      name: `Person ${n}`,
      email: `person${n}@example.com`,
      passwordHash: null,
      registrationNumber: null,
      ...overrides,
    } as User);
    return user;
  };

  const makeDepartment = () => {
    const n = ++counter;
    return ds
      .getRepository(Department)
      .save({ name: `Department ${n}`, code: `D${n}` });
  };

  const makeCourse = async (overrides: Partial<Course> = {}) => {
    const n = ++counter;
    const department = await makeDepartment();
    return ds.getRepository(Course).save({
      name: `Course ${n}`,
      code: `C${n}`,
      departmentId: department.id,
      totalSemesters: 8,
      ...overrides,
    } as Course);
  };

  const makeSubject = () => {
    const n = ++counter;
    return ds
      .getRepository(Subject)
      .save({ code: `S${n}`, name: `Subject ${n}`, workloadHours: 60 } as Subject);
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    ds = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  it('creates every table of the model', async () => {
    const rows: { name: string }[] = await ds.query(
      "SELECT name FROM sqlite_master WHERE type = 'table'",
    );
    const names = rows.map((row) => row.name);

    expect(names).toEqual(
      expect.arrayContaining([
        'users',
        'staff',
        'teachers',
        'students',
        'departments',
        'courses',
        'subjects',
        'curriculum_items',
        'subject_prerequisites',
        'registration_sequences',
      ]),
    );
  });

  describe('users', () => {
    it('uses a surrogate id and defaults to active', async () => {
      const user = await makeUser();

      expect(typeof user.id).toBe('number');
      const stored = await ds.getRepository(User).findOneByOrFail({ id: user.id });
      expect(stored.active).toBe(true);
    });

    it.each([
      ['too short', '1234567890'],
      ['too long', '123456789012'],
      ['non-numeric', '1234567890a'],
    ])('rejects a CPF that is %s', async (_label, cpf) => {
      await expect(makeUser({ cpf })).rejects.toThrow();
    });

    it('rejects a duplicate CPF', async () => {
      const first = await makeUser();
      await expect(makeUser({ cpf: first.cpf })).rejects.toThrow();
    });

    it('rejects a duplicate e-mail', async () => {
      const first = await makeUser();
      await expect(makeUser({ email: first.email })).rejects.toThrow();
    });

    it('accepts a 10-digit registration number', async () => {
      const user = await makeUser({ registrationNumber: '2026000001' });
      expect(user.registrationNumber).toBe('2026000001');
    });

    it.each([
      ['9 digits', '202600001'],
      ['11 digits (would collide with a CPF)', '20260000012'],
      ['non-numeric', '2026ABC001'],
    ])('rejects a registration number with %s', async (_label, value) => {
      await expect(makeUser({ registrationNumber: value })).rejects.toThrow();
    });

    it('rejects a duplicate registration number', async () => {
      await makeUser({ registrationNumber: '2026000002' });
      await expect(
        makeUser({ registrationNumber: '2026000002' }),
      ).rejects.toThrow();
    });

    it('allows many users without a registration number', async () => {
      await makeUser();
      await expect(makeUser()).resolves.toBeDefined();
    });
  });

  describe('registration sequences', () => {
    it('stores one counter per year', async () => {
      const repo = ds.getRepository(RegistrationSequence);
      await repo.save({ year: 2030, lastNumber: 5 });

      expect(await repo.findOneByOrFail({ year: 2030 })).toMatchObject({
        lastNumber: 5,
      });
      await expect(repo.insert({ year: 2030, lastNumber: 0 })).rejects.toThrow();
    });

    it('rejects a counter beyond 6 digits', async () => {
      await expect(
        ds.getRepository(RegistrationSequence).insert({
          year: 2031,
          lastNumber: 1_000_000,
        }),
      ).rejects.toThrow();
    });
  });

  describe('profiles', () => {
    it('rejects an invalid staff role', async () => {
      const user = await makeUser();
      await expect(
        ds.getRepository(Staff).insert({ userId: user.id, role: 'manager' as never }),
      ).rejects.toThrow();
    });

    it('allows only one staff row per user', async () => {
      const user = await makeUser();
      await ds.getRepository(Staff).insert({ userId: user.id, role: 'admin' });
      await expect(
        ds.getRepository(Staff).insert({ userId: user.id, role: 'secretary' }),
      ).rejects.toThrow();
    });

    it('rejects a profile for a user that does not exist', async () => {
      const department = await makeDepartment();
      await expect(
        ds.getRepository(Teacher).insert({
          userId: 999_999,
          departmentId: department.id,
          title: 'master',
        }),
      ).rejects.toThrow();
    });

    it('rejects a teacher with an invalid title or unknown department', async () => {
      const user = await makeUser();
      const department = await makeDepartment();

      await expect(
        ds.getRepository(Teacher).insert({
          userId: user.id,
          departmentId: department.id,
          title: 'professor' as never,
        }),
      ).rejects.toThrow();
      await expect(
        ds.getRepository(Teacher).insert({
          userId: user.id,
          departmentId: 999_999,
          title: 'master',
        }),
      ).rejects.toThrow();
    });

    it('rejects a student with an invalid status, year or unknown course', async () => {
      const user = await makeUser();
      const course = await makeCourse();
      const base = { userId: user.id, courseId: course.id, entryYear: 2026 };

      await expect(
        ds.getRepository(Student).insert({ ...base, status: 'expelled' as never }),
      ).rejects.toThrow();
      await expect(
        ds.getRepository(Student).insert({ ...base, entryYear: 1800 }),
      ).rejects.toThrow();
      await expect(
        ds.getRepository(Student).insert({ ...base, courseId: 999_999 }),
      ).rejects.toThrow();
    });

    it('lets one user be teacher and student at the same time', async () => {
      const user = await makeUser();
      const department = await makeDepartment();
      const course = await makeCourse();

      await ds.getRepository(Teacher).insert({
        userId: user.id,
        departmentId: department.id,
        title: 'master',
      });
      await expect(
        ds.getRepository(Student).insert({
          userId: user.id,
          courseId: course.id,
          entryYear: 2026,
        }),
      ).resolves.toBeDefined();
    });

    it('removes profile rows when the user is deleted', async () => {
      const user = await makeUser();
      await ds.getRepository(Staff).insert({ userId: user.id, role: 'secretary' });

      await ds.getRepository(User).delete({ id: user.id });

      expect(await ds.getRepository(Staff).countBy({ userId: user.id })).toBe(0);
    });
  });

  describe('users without a profile', () => {
    it('lists only users with no staff, teacher or student row', async () => {
      const orphan = await makeUser();
      const staffUser = await makeUser();
      const teacherUser = await makeUser();
      const studentUser = await makeUser();
      const department = await makeDepartment();
      const course = await makeCourse();

      await ds.getRepository(Staff).insert({ userId: staffUser.id, role: 'admin' });
      await ds.getRepository(Teacher).insert({
        userId: teacherUser.id,
        departmentId: department.id,
        title: 'doctor',
      });
      await ds.getRepository(Student).insert({
        userId: studentUser.id,
        courseId: course.id,
        entryYear: 2026,
      });

      const ids = (await app.get(UsersRepository).findWithoutProfile()).map(
        (user) => user.id,
      );

      expect(ids).toContain(orphan.id);
      expect(ids).not.toContain(staffUser.id);
      expect(ids).not.toContain(teacherUser.id);
      expect(ids).not.toContain(studentUser.id);
    });
  });

  describe('academic structure', () => {
    it('rejects a duplicate department name or code', async () => {
      const department = await makeDepartment();
      const repo = ds.getRepository(Department);

      await expect(
        repo.insert({ name: department.name, code: 'OTHER' }),
      ).rejects.toThrow();
      await expect(
        repo.insert({ name: 'Another name', code: department.code }),
      ).rejects.toThrow();
    });

    it('rejects a course with invalid status or zero semesters', async () => {
      await expect(
        makeCourse({ status: 'archived' as never }),
      ).rejects.toThrow();
      await expect(makeCourse({ totalSemesters: 0 })).rejects.toThrow();
    });

    it('blocks deleting a department that still has courses', async () => {
      const course = await makeCourse();
      await expect(
        ds.getRepository(Department).delete({ id: course.departmentId }),
      ).rejects.toThrow();
    });

    it('blocks deleting a course that still has students', async () => {
      const course = await makeCourse();
      const user = await makeUser();
      await ds.getRepository(Student).insert({
        userId: user.id,
        courseId: course.id,
        entryYear: 2026,
      });

      await expect(
        ds.getRepository(Course).delete({ id: course.id }),
      ).rejects.toThrow();
    });

    it('rejects a subject with a non-positive workload or duplicate code', async () => {
      const subject = await makeSubject();
      const repo = ds.getRepository(Subject);

      await expect(
        repo.insert({ code: 'ZERO', name: 'Zero', workloadHours: 0 }),
      ).rejects.toThrow();
      await expect(
        repo.insert({ code: subject.code, name: 'Dup', workloadHours: 30 }),
      ).rejects.toThrow();
    });
  });

  describe('curriculum', () => {
    it('places a subject in a course once', async () => {
      const course = await makeCourse();
      const subject = await makeSubject();
      const repo = ds.getRepository(CurriculumItem);

      await repo.insert({
        courseId: course.id,
        subjectId: subject.id,
        semester: 1,
      });
      await expect(
        repo.insert({ courseId: course.id, subjectId: subject.id, semester: 2 }),
      ).rejects.toThrow();
    });

    it('rejects semester below 1', async () => {
      const course = await makeCourse();
      const subject = await makeSubject();

      await expect(
        ds.getRepository(CurriculumItem).insert({
          courseId: course.id,
          subjectId: subject.id,
          semester: 0,
        }),
      ).rejects.toThrow();
    });

    it('blocks deleting a subject that is in a curriculum', async () => {
      const course = await makeCourse();
      const subject = await makeSubject();
      await ds.getRepository(CurriculumItem).insert({
        courseId: course.id,
        subjectId: subject.id,
        semester: 1,
      });

      await expect(
        ds.getRepository(Subject).delete({ id: subject.id }),
      ).rejects.toThrow();
    });
  });

  describe('prerequisites', () => {
    it('rejects a subject being its own prerequisite', async () => {
      const subject = await makeSubject();
      await expect(
        ds.getRepository(SubjectPrerequisite).insert({
          subjectId: subject.id,
          prerequisiteId: subject.id,
        }),
      ).rejects.toThrow();
    });

    it('rejects the same prerequisite twice', async () => {
      const subject = await makeSubject();
      const prerequisite = await makeSubject();
      const repo = ds.getRepository(SubjectPrerequisite);
      const row = { subjectId: subject.id, prerequisiteId: prerequisite.id };

      await repo.insert(row);
      await expect(repo.insert(row)).rejects.toThrow();
    });

    it('blocks deleting a subject used as a prerequisite', async () => {
      const subject = await makeSubject();
      const prerequisite = await makeSubject();
      await ds.getRepository(SubjectPrerequisite).insert({
        subjectId: subject.id,
        prerequisiteId: prerequisite.id,
      });

      await expect(
        ds.getRepository(Subject).delete({ id: prerequisite.id }),
      ).rejects.toThrow();
    });

    it('removes its own prerequisite rows when a subject is deleted', async () => {
      const subject = await makeSubject();
      const prerequisite = await makeSubject();
      const repo = ds.getRepository(SubjectPrerequisite);
      await repo.insert({
        subjectId: subject.id,
        prerequisiteId: prerequisite.id,
      });

      await ds.getRepository(Subject).delete({ id: subject.id });

      expect(await repo.countBy({ subjectId: subject.id })).toBe(0);
    });
  });
});

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../features/users/entities/user.entity';
import { RegistrationSequence } from '../features/users/entities/registration-sequence.entity';
import { Staff } from '../features/staff/entities/staff.entity';
import { Teacher } from '../features/teachers/entities/teacher.entity';
import { Student } from '../features/students/entities/student.entity';
import { Department } from '../features/departments/entities/department.entity';
import { Course } from '../features/courses/entities/course.entity';
import { CurriculumItem } from '../features/courses/entities/curriculum-item.entity';
import { Subject } from '../features/subjects/entities/subject.entity';
import { SubjectPrerequisite } from '../features/subjects/entities/subject-prerequisite.entity';
import { sanitizeCpf } from '../common/utils/cpf.util';
import {
  SEED_COURSES,
  SEED_CURRICULUM,
  SEED_DEPARTMENTS,
  SEED_PREREQUISITES,
  SEED_SUBJECTS,
  SEED_USERS,
  SeedProfile,
} from './seed-data';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeederService.name);
  private readonly saltRounds: number;

  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(RegistrationSequence)
    private readonly sequences: Repository<RegistrationSequence>,
    @InjectRepository(Staff)
    private readonly staff: Repository<Staff>,
    @InjectRepository(Teacher)
    private readonly teachers: Repository<Teacher>,
    @InjectRepository(Student)
    private readonly students: Repository<Student>,
    @InjectRepository(Department)
    private readonly departments: Repository<Department>,
    @InjectRepository(Course)
    private readonly courses: Repository<Course>,
    @InjectRepository(CurriculumItem)
    private readonly curriculum: Repository<CurriculumItem>,
    @InjectRepository(Subject)
    private readonly subjects: Repository<Subject>,
    @InjectRepository(SubjectPrerequisite)
    private readonly prerequisites: Repository<SubjectPrerequisite>,
    private readonly config: ConfigService,
  ) {
    this.saltRounds = Number(this.config.get('BCRYPT_SALT_ROUNDS') ?? 12);
  }

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.SEED_STANDALONE === 'true') {
      return;
    }

    const optOut = this.config.get<string>('SEED_ON_STARTUP') === 'false';
    const optIn = this.config.get<string>('SEED_ON_STARTUP') === 'true';
    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    if (optOut || (isProduction && !optIn)) {
      return;
    }

    await this.run();
  }

  async run({ force = false }: { force?: boolean } = {}): Promise<void> {
    await this.seedStructure(force);
    await this.seedUsers(force);
  }

  private async seedStructure(force: boolean): Promise<void> {
    if (!force && (await this.departments.count()) > 0) {
      this.logger.log('departments table is not empty - skipping structure');
      return;
    }

    for (const seed of SEED_DEPARTMENTS) {
      if (!(await this.departments.findOne({ where: { code: seed.code } }))) {
        await this.departments.insert(seed);
      }
    }

    for (const seed of SEED_COURSES) {
      if (await this.courses.findOne({ where: { code: seed.code } })) {
        continue;
      }
      const department = await this.departments.findOneByOrFail({
        code: seed.departmentCode,
      });
      await this.courses.insert({
        code: seed.code,
        name: seed.name,
        departmentId: department.id,
        totalSemesters: seed.totalSemesters,
      });
    }
    await this.seedSubjects();
    this.logger.log('seeded departments, courses, subjects and curriculum');
  }

  private async seedSubjects(): Promise<void> {
    for (const seed of SEED_SUBJECTS) {
      if (!(await this.subjects.existsBy({ code: seed.code }))) {
        await this.subjects.insert({
          code: seed.code,
          name: seed.name,
          workloadHours: seed.workloadHours,
          description: seed.description ?? null,
        });
      }
    }

    const subjectId = async (code: string): Promise<number> =>
      (await this.subjects.findOneByOrFail({ code })).id;

    for (const seed of SEED_PREREQUISITES) {
      const id = await subjectId(seed.subjectCode);
      for (const requiredCode of seed.requires) {
        const prerequisiteId = await subjectId(requiredCode);
        if (!(await this.prerequisites.existsBy({ subjectId: id, prerequisiteId }))) {
          await this.prerequisites.insert({ subjectId: id, prerequisiteId });
        }
      }
    }

    for (const seed of SEED_CURRICULUM) {
      const course = await this.courses.findOneByOrFail({ code: seed.courseCode });
      const id = await subjectId(seed.subjectCode);
      if (!(await this.curriculum.existsBy({ courseId: course.id, subjectId: id }))) {
        await this.curriculum.insert({
          courseId: course.id,
          subjectId: id,
          semester: seed.semester,
          mandatory: seed.mandatory ?? true,
        });
      }
    }
  }

  private async seedUsers(force: boolean): Promise<void> {
    if (!force && (await this.users.count()) > 0) {
      this.logger.log('users table is not empty - skipping');
      return;
    }

    let created = 0;
    let updated = 0;
    for (const seed of SEED_USERS) {
      const cpf = sanitizeCpf(seed.cpf);
      const passwordHash = seed.password
        ? await bcrypt.hash(seed.password, this.saltRounds)
        : null;
      const row = {
        cpf,
        name: seed.name,
        email: seed.email,
        registrationNumber: seed.registrationNumber ?? null,
        passwordHash,
      };

      let user = await this.users.findOne({ where: { cpf } });
      if (user) {
        if (!force) {
          continue;
        }
        await this.users.update({ cpf }, row);
        updated++;
      } else {
        user = await this.users.save(this.users.create(row));
        created++;
      }

      for (const profile of seed.profiles) {
        await this.seedProfile(user.id, profile);
      }
      if (seed.registrationNumber) {
        await this.reserveRegistrationNumber(seed.registrationNumber);
      }
    }
    this.logger.log(`seeded ${created} user(s), updated ${updated}`);
  }

  private async seedProfile(userId: number, profile: SeedProfile): Promise<void> {
    switch (profile.kind) {
      case 'staff':
        await this.staff.save({ userId, role: profile.role, status: 'active' });
        return;
      case 'teacher': {
        const department = await this.departments.findOneByOrFail({
          code: profile.departmentCode,
        });
        await this.teachers.save({
          userId,
          departmentId: department.id,
          title: profile.title,
          status: 'active',
        });
        return;
      }
      case 'student': {
        const course = await this.courses.findOneByOrFail({
          code: profile.courseCode,
        });
        await this.students.save({
          userId,
          courseId: course.id,
          entryYear: profile.entryYear,
          status: profile.status ?? 'active',
        });
        return;
      }
    }
  }

  /** Keeps the yearly counter ahead of any registration number seeded here. */
  private async reserveRegistrationNumber(value: string): Promise<void> {
    const year = Number(value.slice(0, 4));
    const sequence = Number(value.slice(4));
    const current = await this.sequences.findOneBy({ year });
    if (!current || current.lastNumber < sequence) {
      await this.sequences.save({ year, lastNumber: sequence });
    }
  }
}

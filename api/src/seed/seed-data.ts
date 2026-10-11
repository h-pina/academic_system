import {
  StaffRole,
  StudentStatus,
  TeacherTitle,
} from '../common/domain/domain.constants';

export interface SeedDepartment {
  code: string;
  name: string;
}

export interface SeedCourse {
  code: string;
  name: string;
  departmentCode: string;
  totalSemesters: number;
}

export type SeedProfile =
  | { kind: 'staff'; role: StaffRole }
  | { kind: 'teacher'; departmentCode: string; title: TeacherTitle }
  | {
      kind: 'student';
      courseCode: string;
      entryYear: number;
      status?: StudentStatus;
    };

export interface SeedUser {
  cpf: string;
  name: string;
  email: string;
  password: string | null;
  /** Matrícula (10 digits), only for people that log in with it. */
  registrationNumber?: string;
  /** A user may have several profiles, or none. */
  profiles: SeedProfile[];
}

export const SEED_DEPARTMENTS: readonly SeedDepartment[] = [
  { code: 'DCC', name: 'Computer Science' },
];

export const SEED_COURSES: readonly SeedCourse[] = [
  {
    code: 'CC',
    name: 'Computer Science',
    departmentCode: 'DCC',
    totalSemesters: 8,
  },
];

export const SEED_USERS: readonly SeedUser[] = [
  {
    cpf: '12345678909',
    name: 'Alice Admin',
    email: 'alice@example.com',
    password: 'password123',
    profiles: [{ kind: 'staff', role: 'admin' }],
  },
  {
    cpf: '98765432100',
    name: 'Bob Secretary',
    email: 'bob@example.com',
    password: 'password123',
    profiles: [{ kind: 'staff', role: 'secretary' }],
  },
  {
    cpf: '11122233396',
    name: 'Carol Teacher',
    email: 'carol@example.com',
    password: 'password123',
    profiles: [{ kind: 'teacher', departmentCode: 'DCC', title: 'doctor' }],
  },
  {
    cpf: '11144477735',
    name: 'Erin Student',
    email: 'erin@example.com',
    password: 'password123',
    registrationNumber: '2026000001',
    profiles: [{ kind: 'student', courseCode: 'CC', entryYear: 2026 }],
  },
  {
    // No password yet: exercises the "set your password" first-access flow,
    // and has no profile (a user without link).
    cpf: '45678912364',
    name: 'Dave Pending',
    email: 'dave@example.com',
    password: null,
    profiles: [],
  },
];

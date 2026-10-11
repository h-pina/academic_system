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

export interface SeedSubject {
  code: string;
  name: string;
  workloadHours: number;
  description?: string;
}

export interface SeedCurriculumItem {
  courseCode: string;
  subjectCode: string;
  semester: number;
  mandatory?: boolean;
}

/** `subjectCode` requires every code in `requires`. */
export interface SeedPrerequisite {
  subjectCode: string;
  requires: string[];
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

export const SEED_PASSWORD = 'password123';

export const SEED_DEPARTMENTS: readonly SeedDepartment[] = [
  { code: 'DCC', name: 'Computer Science' },
  { code: 'DMAT', name: 'Mathematics' },
];

export const SEED_COURSES: readonly SeedCourse[] = [
  {
    code: 'CC',
    name: 'Computer Science',
    departmentCode: 'DCC',
    totalSemesters: 8,
  },
  {
    code: 'MAT',
    name: 'Mathematics',
    departmentCode: 'DMAT',
    totalSemesters: 8,
  },
];

export const SEED_SUBJECTS: readonly SeedSubject[] = [
  { code: 'MAT101', name: 'Calculus I', workloadHours: 90 },
  { code: 'MAT102', name: 'Calculus II', workloadHours: 90 },
  { code: 'MAT103', name: 'Linear Algebra', workloadHours: 60 },
  { code: 'MAT104', name: 'Discrete Mathematics', workloadHours: 60 },
  { code: 'MAT201', name: 'Real Analysis', workloadHours: 60 },
  { code: 'STA101', name: 'Probability and Statistics', workloadHours: 60 },
  { code: 'CC101', name: 'Introduction to Programming', workloadHours: 90 },
  { code: 'CC102', name: 'Data Structures', workloadHours: 90 },
  { code: 'CC103', name: 'Algorithms', workloadHours: 60 },
  { code: 'CC201', name: 'Databases', workloadHours: 60 },
  { code: 'CC202', name: 'Operating Systems', workloadHours: 60 },
  { code: 'CC301', name: 'Software Engineering', workloadHours: 60 },
];

export const SEED_PREREQUISITES: readonly SeedPrerequisite[] = [
  { subjectCode: 'MAT102', requires: ['MAT101'] },
  { subjectCode: 'MAT201', requires: ['MAT102'] },
  { subjectCode: 'CC102', requires: ['CC101'] },
  { subjectCode: 'CC103', requires: ['CC102'] },
  { subjectCode: 'CC201', requires: ['CC102'] },
  { subjectCode: 'CC202', requires: ['CC102'] },
  { subjectCode: 'CC301', requires: ['CC103', 'CC201'] },
];

export const SEED_CURRICULUM: readonly SeedCurriculumItem[] = [
  // Computer Science
  { courseCode: 'CC', subjectCode: 'CC101', semester: 1 },
  { courseCode: 'CC', subjectCode: 'MAT101', semester: 1 },
  { courseCode: 'CC', subjectCode: 'MAT103', semester: 1 },
  { courseCode: 'CC', subjectCode: 'CC102', semester: 2 },
  { courseCode: 'CC', subjectCode: 'MAT102', semester: 2 },
  { courseCode: 'CC', subjectCode: 'MAT104', semester: 2 },
  { courseCode: 'CC', subjectCode: 'CC103', semester: 3 },
  { courseCode: 'CC', subjectCode: 'STA101', semester: 3 },
  { courseCode: 'CC', subjectCode: 'CC201', semester: 4 },
  { courseCode: 'CC', subjectCode: 'CC202', semester: 4 },
  { courseCode: 'CC', subjectCode: 'CC301', semester: 5 },
  { courseCode: 'CC', subjectCode: 'MAT201', semester: 5, mandatory: false },
  // Mathematics
  { courseCode: 'MAT', subjectCode: 'MAT101', semester: 1 },
  { courseCode: 'MAT', subjectCode: 'MAT103', semester: 1 },
  { courseCode: 'MAT', subjectCode: 'CC101', semester: 1, mandatory: false },
  { courseCode: 'MAT', subjectCode: 'MAT102', semester: 2 },
  { courseCode: 'MAT', subjectCode: 'MAT104', semester: 2 },
  { courseCode: 'MAT', subjectCode: 'STA101', semester: 3 },
  { courseCode: 'MAT', subjectCode: 'MAT201', semester: 4 },
];

export const SEED_USERS: readonly SeedUser[] = [
  // Administrative staff
  {
    cpf: '12345678909',
    name: 'Alice Admin',
    email: 'alice@example.com',
    password: SEED_PASSWORD,
    profiles: [{ kind: 'staff', role: 'admin' }],
  },
  {
    cpf: '98765432100',
    name: 'Bob Secretary',
    email: 'bob@example.com',
    password: SEED_PASSWORD,
    profiles: [{ kind: 'staff', role: 'secretary' }],
  },
  // Teachers
  {
    cpf: '11122233396',
    name: 'Carol Teacher',
    email: 'carol@example.com',
    password: SEED_PASSWORD,
    profiles: [{ kind: 'teacher', departmentCode: 'DCC', title: 'doctor' }],
  },
  {
    cpf: '12121212108',
    name: 'Frank Teacher',
    email: 'frank@example.com',
    password: SEED_PASSWORD,
    profiles: [{ kind: 'teacher', departmentCode: 'DMAT', title: 'master' }],
  },
  {
    cpf: '22233344405',
    name: 'Grace Teacher',
    email: 'grace@example.com',
    password: SEED_PASSWORD,
    profiles: [
      { kind: 'teacher', departmentCode: 'DCC', title: 'specialist' },
    ],
  },
  // Students
  {
    cpf: '11144477735',
    name: 'Erin Student',
    email: 'erin@example.com',
    password: SEED_PASSWORD,
    registrationNumber: '2026000001',
    profiles: [{ kind: 'student', courseCode: 'CC', entryYear: 2026 }],
  },
  {
    cpf: '44455566619',
    name: 'Ivan Student',
    email: 'ivan@example.com',
    password: SEED_PASSWORD,
    registrationNumber: '2025000002',
    profiles: [{ kind: 'student', courseCode: 'CC', entryYear: 2025 }],
  },
  {
    cpf: '55566677720',
    name: 'Judy Student',
    email: 'judy@example.com',
    password: SEED_PASSWORD,
    registrationNumber: '2026000002',
    profiles: [{ kind: 'student', courseCode: 'MAT', entryYear: 2026 }],
  },
  {
    cpf: '66677788830',
    name: 'Karl Locked',
    email: 'karl@example.com',
    password: SEED_PASSWORD,
    registrationNumber: '2024000001',
    profiles: [
      { kind: 'student', courseCode: 'CC', entryYear: 2024, status: 'locked' },
    ],
  },
  {
    cpf: '77788899941',
    name: 'Liam Graduated',
    email: 'liam@example.com',
    password: SEED_PASSWORD,
    registrationNumber: '2020000001',
    profiles: [
      {
        kind: 'student',
        courseCode: 'MAT',
        entryYear: 2020,
        status: 'graduated',
      },
    ],
  },
  // Two profiles: teaches in Computer Science and studies Mathematics.
  {
    cpf: '33344455508',
    name: 'Heidi Both',
    email: 'heidi@example.com',
    password: SEED_PASSWORD,
    registrationNumber: '2025000001',
    profiles: [
      { kind: 'teacher', departmentCode: 'DCC', title: 'master' },
      { kind: 'student', courseCode: 'MAT', entryYear: 2025 },
    ],
  },
  // No profile linked: sees only the "no link" notice after signing in.
  {
    cpf: '88899911193',
    name: 'Mallory Unlinked',
    email: 'mallory@example.com',
    password: SEED_PASSWORD,
    profiles: [],
  },
  {
    // No password yet (exercises the "set your password" first-access flow)
    // and no profile either.
    cpf: '45678912364',
    name: 'Dave Pending',
    email: 'dave@example.com',
    password: null,
    profiles: [],
  },
];

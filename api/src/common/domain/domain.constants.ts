/**
 * Value sets shared by entities. They are enforced in the database with CHECK
 * constraints (see `inList`) and typed here for use in services and DTOs.
 */

export const STAFF_ROLES = ['admin', 'secretary'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const PROFILE_STATUSES = ['active', 'inactive'] as const;
export type ProfileStatus = (typeof PROFILE_STATUSES)[number];

export const TEACHER_TITLES = [
  'bachelor',
  'specialist',
  'master',
  'doctor',
] as const;
export type TeacherTitle = (typeof TEACHER_TITLES)[number];

export const STUDENT_STATUSES = [
  'active',
  'locked',
  'graduated',
  'dropped',
] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export const COURSE_STATUSES = ['active', 'inactive'] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

/** Builds the body of a CHECK constraint: `"column" IN ('a', 'b')`. */
export function inList(column: string, values: readonly string[]): string {
  return `"${column}" IN (${values.map((value) => `'${value}'`).join(', ')})`;
}

/** The registration number (matrícula) is `YYYY` + 6 sequential digits. */
export const REGISTRATION_NUMBER_LENGTH = 10;
export const CPF_LENGTH = 11;

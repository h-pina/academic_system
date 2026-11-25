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

export const SEMESTER_STATUSES = ['draft', 'active', 'closed'] as const;
export type SemesterStatus = (typeof SEMESTER_STATUSES)[number];

export const CLASS_STATUSES = ['pending', 'approved', 'rejected', 'closed'] as const;
export type ClassStatus = (typeof CLASS_STATUSES)[number];

export const ENROLLMENT_STATUSES = [
  'requested',
  'not_allocated',
  'confirmed',
  'cancelled',
  'locked',
  'approved',
  'failed_grade',
  'failed_attendance',
] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

/**
 * Statuses that hold a seat. A `requested` enrollment holds nothing: seats are
 * decided by the allocation that runs after the enrollment period ends.
 */
export const ACTIVE_ENROLLMENT_STATUSES: readonly EnrollmentStatus[] = [
  'confirmed',
  'approved',
  'failed_grade',
  'failed_attendance',
];

export const REOPENING_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ReopeningStatus = (typeof REOPENING_STATUSES)[number];

/** Maximum share of absences before failing by attendance (RN08). */
export const MAX_ABSENCE_PERCENT = 25;
export const DEFAULT_MIN_PASSING_GRADE = 6;
/** Grades are reported on a 0-10 scale. */
export const GRADE_SCALE = 10;

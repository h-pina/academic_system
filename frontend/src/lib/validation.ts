import { isValidCpf, sanitizeCpf } from "@/lib/cpf";
import { TEACHER_TITLE_LABELS } from "@/lib/labels";
import type { TeacherTitle } from "@/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_NAME_LENGTH = 3;
export const MIN_ENTRY_YEAR = 1900;
export const MAX_ENTRY_YEAR = 2100;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

interface PersonFields {
  cpf: string;
  name: string;
  email: string;
}

/**
 * Validates the identity fields of a new profile. When the CPF already
 * belongs to a registered person, name and e-mail are kept from the
 * existing record, so they are not required.
 */
function validatePerson(draft: PersonFields, existingUser: boolean): string[] {
  const errors: string[] = [];

  if (!isValidCpf(sanitizeCpf(draft.cpf))) {
    errors.push("Informe um CPF válido.");
  }
  if (!existingUser) {
    if (draft.name.trim().length < MIN_NAME_LENGTH) {
      errors.push(`O nome deve ter pelo menos ${MIN_NAME_LENGTH} caracteres.`);
    }
    if (!isValidEmail(draft.email)) {
      errors.push("Informe um e-mail válido.");
    }
  }
  return errors;
}

export interface StudentDraft extends PersonFields {
  courseId: number;
  entryYear: number | "";
}

export function validateStudentDraft(
  draft: StudentDraft,
  options: { existingUser: boolean },
): string[] {
  const errors = validatePerson(draft, options.existingUser);

  if (!draft.courseId) {
    errors.push("Selecione o curso.");
  }
  if (
    draft.entryYear === "" ||
    !Number.isInteger(draft.entryYear) ||
    draft.entryYear < MIN_ENTRY_YEAR ||
    draft.entryYear > MAX_ENTRY_YEAR
  ) {
    errors.push(
      `O ano de ingresso deve estar entre ${MIN_ENTRY_YEAR} e ${MAX_ENTRY_YEAR}.`,
    );
  }
  return errors;
}

export interface TeacherDraft extends PersonFields {
  departmentId: number;
  title: TeacherTitle | "";
}

export function validateTeacherDraft(
  draft: TeacherDraft,
  options: { existingUser: boolean },
): string[] {
  const errors = validatePerson(draft, options.existingUser);

  if (!draft.departmentId) {
    errors.push("Selecione o departamento.");
  }
  if (!draft.title || !(draft.title in TEACHER_TITLE_LABELS)) {
    errors.push("Selecione a titulação.");
  }
  return errors;
}

const CODE_PATTERN = /^[A-Za-z0-9_-]{2,20}$/;
export const MAX_SEMESTERS = 20;
export const MAX_WORKLOAD_HOURS = 1000;

export function isValidCode(value: string): boolean {
  return CODE_PATTERN.test(value.trim());
}

const CODE_ERROR = 'O código deve ter de 2 a 20 letras, números, "-" ou "_".';

export interface DepartmentDraft {
  name: string;
  code: string;
}

export function validateDepartmentDraft(draft: DepartmentDraft): string[] {
  const errors: string[] = [];
  if (draft.name.trim().length < MIN_NAME_LENGTH) {
    errors.push(`O nome deve ter pelo menos ${MIN_NAME_LENGTH} caracteres.`);
  }
  if (!isValidCode(draft.code)) errors.push(CODE_ERROR);
  return errors;
}

export interface CourseDraft {
  name: string;
  code: string;
  departmentId: number;
  totalSemesters: number | "";
}

export function validateCourseDraft(draft: CourseDraft): string[] {
  const errors: string[] = [];
  if (draft.name.trim().length < MIN_NAME_LENGTH) {
    errors.push(`O nome deve ter pelo menos ${MIN_NAME_LENGTH} caracteres.`);
  }
  if (!isValidCode(draft.code)) errors.push(CODE_ERROR);
  if (!draft.departmentId) errors.push("Selecione o departamento.");
  if (
    draft.totalSemesters === "" ||
    !Number.isInteger(draft.totalSemesters) ||
    draft.totalSemesters < 1 ||
    draft.totalSemesters > MAX_SEMESTERS
  ) {
    errors.push(`O número de semestres deve estar entre 1 e ${MAX_SEMESTERS}.`);
  }
  return errors;
}

export interface SubjectDraft {
  name: string;
  code: string;
  workloadHours: number | "";
  description: string;
}

export function validateSubjectDraft(draft: SubjectDraft): string[] {
  const errors: string[] = [];
  if (draft.name.trim().length < MIN_NAME_LENGTH) {
    errors.push(`O nome deve ter pelo menos ${MIN_NAME_LENGTH} caracteres.`);
  }
  if (!isValidCode(draft.code)) errors.push(CODE_ERROR);
  if (
    draft.workloadHours === "" ||
    !Number.isInteger(draft.workloadHours) ||
    draft.workloadHours < 1 ||
    draft.workloadHours > MAX_WORKLOAD_HOURS
  ) {
    errors.push(`A carga horária deve estar entre 1 e ${MAX_WORKLOAD_HOURS} horas.`);
  }
  if (draft.description.length > 500) {
    errors.push("A descrição pode ter no máximo 500 caracteres.");
  }
  return errors;
}

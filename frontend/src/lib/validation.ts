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

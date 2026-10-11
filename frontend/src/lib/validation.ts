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

/** Messages keyed by form field; empty when the draft is valid. */
export type FieldMessages<F extends string> = Partial<Record<F, string>>;

/** The messages of a field map, in field order, as a plain list. */
const toList = (messages: Record<string, string | undefined>): string[] =>
  Object.values(messages).filter((message): message is string => Boolean(message));

type PersonField = "cpf" | "name" | "email";

/**
 * Validates the identity fields of a new profile. When the CPF already
 * belongs to a registered person, name and e-mail are kept from the
 * existing record, so they are not required.
 */
function personFieldErrors(
  draft: PersonFields,
  existingUser: boolean,
): FieldMessages<PersonField> {
  const errors: FieldMessages<PersonField> = {};

  if (!isValidCpf(sanitizeCpf(draft.cpf))) {
    errors.cpf = "Informe um CPF válido.";
  }
  if (!existingUser) {
    if (draft.name.trim().length < MIN_NAME_LENGTH) {
      errors.name = `O nome deve ter pelo menos ${MIN_NAME_LENGTH} caracteres.`;
    }
    if (!isValidEmail(draft.email)) {
      errors.email = "Informe um e-mail válido.";
    }
  }
  return errors;
}

export function staffFieldErrors(
  draft: PersonFields,
  options: { existingUser: boolean },
): FieldMessages<PersonField> {
  return personFieldErrors(draft, options.existingUser);
}

export function validateStaffDraft(
  draft: PersonFields,
  options: { existingUser: boolean },
): string[] {
  return toList(staffFieldErrors(draft, options));
}

export interface StudentDraft extends PersonFields {
  courseId: number;
  entryYear: number | "";
}

export function studentFieldErrors(
  draft: StudentDraft,
  options: { existingUser: boolean },
): FieldMessages<PersonField | "courseId" | "entryYear"> {
  const errors: FieldMessages<PersonField | "courseId" | "entryYear"> =
    personFieldErrors(draft, options.existingUser);

  if (!draft.courseId) {
    errors.courseId = "Selecione o curso.";
  }
  if (
    draft.entryYear === "" ||
    !Number.isInteger(draft.entryYear) ||
    draft.entryYear < MIN_ENTRY_YEAR ||
    draft.entryYear > MAX_ENTRY_YEAR
  ) {
    errors.entryYear = `O ano de ingresso deve estar entre ${MIN_ENTRY_YEAR} e ${MAX_ENTRY_YEAR}.`;
  }
  return errors;
}

export function validateStudentDraft(
  draft: StudentDraft,
  options: { existingUser: boolean },
): string[] {
  return toList(studentFieldErrors(draft, options));
}

export interface TeacherDraft extends PersonFields {
  departmentId: number;
  title: TeacherTitle | "";
}

export function teacherFieldErrors(
  draft: TeacherDraft,
  options: { existingUser: boolean },
): FieldMessages<PersonField | "departmentId" | "title"> {
  const errors: FieldMessages<PersonField | "departmentId" | "title"> =
    personFieldErrors(draft, options.existingUser);

  if (!draft.departmentId) {
    errors.departmentId = "Selecione o departamento.";
  }
  if (!draft.title || !(draft.title in TEACHER_TITLE_LABELS)) {
    errors.title = "Selecione a titulação.";
  }
  return errors;
}

export function validateTeacherDraft(
  draft: TeacherDraft,
  options: { existingUser: boolean },
): string[] {
  return toList(teacherFieldErrors(draft, options));
}

const CODE_PATTERN = /^[A-Za-z0-9_-]{2,20}$/;
export const MAX_SEMESTERS = 20;
export const MAX_WORKLOAD_HOURS = 1000;

export function isValidCode(value: string): boolean {
  return CODE_PATTERN.test(value.trim());
}

const CODE_ERROR = 'O código deve ter de 2 a 20 letras, números, "-" ou "_".';
const NAME_ERROR = `O nome deve ter pelo menos ${MIN_NAME_LENGTH} caracteres.`;

export interface DepartmentDraft {
  name: string;
  code: string;
}

export function departmentFieldErrors(
  draft: DepartmentDraft,
): FieldMessages<"name" | "code"> {
  const errors: FieldMessages<"name" | "code"> = {};
  if (draft.name.trim().length < MIN_NAME_LENGTH) errors.name = NAME_ERROR;
  if (!isValidCode(draft.code)) errors.code = CODE_ERROR;
  return errors;
}

export function validateDepartmentDraft(draft: DepartmentDraft): string[] {
  return toList(departmentFieldErrors(draft));
}

export interface CourseDraft {
  name: string;
  code: string;
  departmentId: number;
  totalSemesters: number | "";
}

export function courseFieldErrors(
  draft: CourseDraft,
): FieldMessages<"name" | "code" | "departmentId" | "totalSemesters"> {
  const errors: FieldMessages<"name" | "code" | "departmentId" | "totalSemesters"> = {};
  if (draft.name.trim().length < MIN_NAME_LENGTH) errors.name = NAME_ERROR;
  if (!isValidCode(draft.code)) errors.code = CODE_ERROR;
  if (!draft.departmentId) errors.departmentId = "Selecione o departamento.";
  if (
    draft.totalSemesters === "" ||
    !Number.isInteger(draft.totalSemesters) ||
    draft.totalSemesters < 1 ||
    draft.totalSemesters > MAX_SEMESTERS
  ) {
    errors.totalSemesters = `O número de semestres deve estar entre 1 e ${MAX_SEMESTERS}.`;
  }
  return errors;
}

export function validateCourseDraft(draft: CourseDraft): string[] {
  return toList(courseFieldErrors(draft));
}

export interface SubjectDraft {
  name: string;
  code: string;
  workloadHours: number | "";
  description: string;
}

export function subjectFieldErrors(
  draft: SubjectDraft,
): FieldMessages<"name" | "code" | "workloadHours" | "description"> {
  const errors: FieldMessages<"name" | "code" | "workloadHours" | "description"> = {};
  if (draft.name.trim().length < MIN_NAME_LENGTH) errors.name = NAME_ERROR;
  if (!isValidCode(draft.code)) errors.code = CODE_ERROR;
  if (
    draft.workloadHours === "" ||
    !Number.isInteger(draft.workloadHours) ||
    draft.workloadHours < 1 ||
    draft.workloadHours > MAX_WORKLOAD_HOURS
  ) {
    errors.workloadHours = `A carga horária deve estar entre 1 e ${MAX_WORKLOAD_HOURS} horas.`;
  }
  if (draft.description.length > 500) {
    errors.description = "A descrição pode ter no máximo 500 caracteres.";
  }
  return errors;
}

export function validateSubjectDraft(draft: SubjectDraft): string[] {
  return toList(subjectFieldErrors(draft));
}

export const MIN_PASSWORD_LENGTH = 8;

export interface ProfileFormDraft {
  name: string;
  email: string;
  changePassword: boolean;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export type ProfileFormField =
  | "name"
  | "email"
  | "currentPassword"
  | "newPassword"
  | "confirmPassword";

/** Field-level errors of the "Meus dados" form; empty when it is valid. */
export function validateProfileForm(
  draft: ProfileFormDraft,
): Partial<Record<ProfileFormField, string>> {
  const errors: Partial<Record<ProfileFormField, string>> = {};

  if (draft.name.trim().length < MIN_NAME_LENGTH) {
    errors.name = `O nome deve ter pelo menos ${MIN_NAME_LENGTH} caracteres.`;
  }
  if (!isValidEmail(draft.email)) {
    errors.email = "Informe um e-mail válido.";
  }

  if (draft.changePassword) {
    if (draft.currentPassword.length === 0) {
      errors.currentPassword = "Informe a senha atual.";
    }
    if (draft.newPassword.length < MIN_PASSWORD_LENGTH) {
      errors.newPassword = `A nova senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    }
    if (draft.confirmPassword !== draft.newPassword) {
      errors.confirmPassword = "As senhas não coincidem.";
    }
  }
  return errors;
}

export interface UserDraftFields {
  cpf: string;
  name: string;
  email: string;
  password: string;
}

/** Field-level errors of the user form (`creating` also checks CPF and password). */
export function userFieldErrors(
  draft: UserDraftFields,
  options: { creating: boolean },
): FieldMessages<"cpf" | "name" | "email" | "password"> {
  const errors: FieldMessages<"cpf" | "name" | "email" | "password"> = {};

  if (options.creating && !isValidCpf(sanitizeCpf(draft.cpf))) {
    errors.cpf = "Informe um CPF válido.";
  }
  if (draft.name.trim().length < MIN_NAME_LENGTH) errors.name = NAME_ERROR;
  if (!isValidEmail(draft.email)) errors.email = "Informe um e-mail válido.";
  if (
    options.creating &&
    draft.password.length > 0 &&
    draft.password.length < MIN_PASSWORD_LENGTH
  ) {
    errors.password = `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  return errors;
}

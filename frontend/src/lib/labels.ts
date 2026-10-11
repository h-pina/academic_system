import type {
  CourseStatus,
  ProfileStatus,
  StaffRole,
  StudentStatus,
  TeacherTitle,
} from "@/types";

export const STUDENT_STATUS_LABELS: Record<StudentStatus, string> = {
  active: "Ativo",
  locked: "Trancado",
  graduated: "Formado",
  dropped: "Desligado",
};

export const PROFILE_STATUS_LABELS: Record<ProfileStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
};

export const COURSE_STATUS_LABELS: Record<CourseStatus, string> = {
  active: "Ativo",
  inactive: "Inativo",
};

export const TEACHER_TITLE_LABELS: Record<TeacherTitle, string> = {
  bachelor: "Graduado",
  specialist: "Especialista",
  master: "Mestre",
  doctor: "Doutor",
};

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  admin: "Administrador",
  secretary: "Secretaria",
};

export type Tone = "success" | "warning" | "danger" | "neutral";

const STATUS_TONES: Record<string, Tone> = {
  active: "success",
  locked: "warning",
  graduated: "neutral",
  dropped: "danger",
  inactive: "neutral",
};

/** Visual tone for a status value, defaulting to neutral. */
export function statusTone(status: string): Tone {
  return STATUS_TONES[status] ?? "neutral";
}

/** `[value, label]` pairs for a `<select>`, in the order of the label map. */
export function toOptions<T extends string>(
  labels: Record<T, string>,
): { value: T; label: string }[] {
  return (Object.keys(labels) as T[]).map((value) => ({
    value,
    label: labels[value],
  }));
}

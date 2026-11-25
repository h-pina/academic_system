import type {
  ClassStatus,
  EnrollmentStatus,
  ProjectedResult,
  ScheduleSlot,
  SemesterStatus,
  SubmissionState,
} from "@/types";
import type { Tone } from "@/lib/labels";

export const WEEKDAYS = [
  { value: 1, label: "Segunda-feira", short: "Seg" },
  { value: 2, label: "Terça-feira", short: "Ter" },
  { value: 3, label: "Quarta-feira", short: "Qua" },
  { value: 4, label: "Quinta-feira", short: "Qui" },
  { value: 5, label: "Sexta-feira", short: "Sex" },
  { value: 6, label: "Sábado", short: "Sáb" },
  { value: 7, label: "Domingo", short: "Dom" },
] as const;

export const SEMESTER_STATUS_LABELS: Record<SemesterStatus, string> = {
  draft: "Rascunho",
  active: "Em progresso",
  closed: "Encerrado",
};

export const CLASS_STATUS_LABELS: Record<ClassStatus, string> = {
  pending: "Pendente",
  approved: "Aprovada",
  rejected: "Rejeitada",
  closed: "Encerrada",
};

export const ENROLLMENT_STATUS_LABELS: Record<EnrollmentStatus, string> = {
  requested: "Solicitada",
  not_allocated: "Não alocado",
  confirmed: "Cursando",
  cancelled: "Cancelada",
  locked: "Trancada",
  approved: "Aprovado",
  failed_grade: "Reprovado por nota",
  failed_attendance: "Reprovado por falta",
};

export const RESULT_LABELS: Record<ProjectedResult, string> = {
  approved: "Aprovado",
  failed_grade: "Reprovado por nota",
  failed_attendance: "Reprovado por falta",
  in_progress: "Em andamento",
};

export const SUBMISSION_STATE_LABELS: Record<SubmissionState, string> = {
  pending: "Pendente",
  submitted: "Enviada",
  late: "Enviada com atraso",
  overdue: "Prazo encerrado",
};

const TONES: Record<string, Tone> = {
  active: "success",
  approved: "success",
  confirmed: "success",
  submitted: "success",
  pending: "warning",
  requested: "warning",
  not_allocated: "danger",
  in_progress: "warning",
  draft: "warning",
  late: "warning",
  rejected: "danger",
  failed_grade: "danger",
  failed_attendance: "danger",
  overdue: "danger",
  cancelled: "neutral",
  locked: "neutral",
  closed: "neutral",
};

export function statusTone(status: string): Tone {
  return TONES[status] ?? "neutral";
}

export function weekdayLabel(weekday: number, short = false): string {
  const found = WEEKDAYS.find((day) => day.value === weekday);
  return found ? (short ? found.short : found.label) : String(weekday);
}

/** "Seg 08:00-10:00 · Qua 08:00-10:00", sorted by day and time. */
export function formatSchedule(slots: readonly Pick<ScheduleSlot, "weekday" | "startTime" | "endTime">[]): string {
  if (slots.length === 0) return "Sem horário";
  return [...slots]
    .sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime))
    .map((slot) => `${weekdayLabel(slot.weekday, true)} ${slot.startTime}-${slot.endTime}`)
    .join(" · ");
}

/** `2026-03-02` as `02/03/2026`; anything else is returned as is. */
export function formatIsoDate(value: string | null | undefined): string {
  if (!value) return "-";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

/** An ISO date-time as `02/03/2026 08:30` in the browser's time zone. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** A grade with a decimal comma, or a dash when not posted. */
export function formatGrade(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return (Math.round(value * 100) / 100).toString().replace(".", ",");
}

export function formatPercent(value: number): string {
  return `${(Math.round(value * 10) / 10).toString().replace(".", ",")}%`;
}

/** "2026/2" */
export function semesterLabel(semester: { year: number; term: number }): string {
  return `${semester.year}/${semester.term}`;
}

/** The text of a "turma", e.g. "CC101 T01 - Introduction to Programming". */
export function classTitle(cls: { code: string; subject: { code: string; name: string } }): string {
  return `${cls.subject.code} ${cls.code} - ${cls.subject.name}`;
}

/** Can a student still cancel or lock this enrollment under the calendar? */
export function withdrawalOpen(deadline: string, today: string): boolean {
  return today <= deadline;
}

/** Local today as `YYYY-MM-DD`. */
export function todayIso(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function isEnrollmentWindowOpen(
  calendar: { enrollmentStart: string; enrollmentEnd: string },
  today: string,
): boolean {
  return today >= calendar.enrollmentStart && today <= calendar.enrollmentEnd;
}

/** "08:00" -> minutes; NaN when malformed. */
function minutes(time: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  return match ? Number(match[1]) * 60 + Number(match[2]) : Number.NaN;
}

export interface SlotDraft {
  weekday: number;
  startTime: string;
  endTime: string;
  room?: string;
}

/** Client-side check of a schedule before sending it; messages in Portuguese. */
export function scheduleProblems(slots: readonly SlotDraft[]): string[] {
  const problems: string[] = [];
  slots.forEach((slot, index) => {
    const start = minutes(slot.startTime);
    const end = minutes(slot.endTime);
    if (Number.isNaN(start) || Number.isNaN(end)) {
      problems.push(`Horário ${index + 1}: informe início e término (HH:MM).`);
    } else if (start >= end) {
      problems.push(`Horário ${index + 1}: o início deve ser anterior ao término.`);
    }
  });
  if (problems.length > 0) return problems;
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i];
      const b = slots[j];
      if (
        a.weekday === b.weekday &&
        minutes(a.startTime) < minutes(b.endTime) &&
        minutes(b.startTime) < minutes(a.endTime)
      ) {
        problems.push(`Os horários ${i + 1} e ${j + 1} se sobrepõem.`);
      }
    }
  }
  return problems;
}

export interface CalendarDraft {
  description: string;
  startDate: string;
  endDate: string;
  enrollmentStart: string;
  enrollmentEnd: string;
  withdrawalDeadline: string;
  gradesDeadline: string;
}

/** Same rules as the API (UC05 E01), to answer before the round trip. */
export function calendarProblems(draft: CalendarDraft): Partial<Record<keyof CalendarDraft, string>> {
  const errors: Partial<Record<keyof CalendarDraft, string>> = {};
  if (draft.description.trim().length < 2) errors.description = "Informe a descrição.";
  const required: [keyof CalendarDraft, string][] = [
    ["startDate", "Informe o início do período letivo."],
    ["endDate", "Informe o fim do período letivo."],
    ["enrollmentStart", "Informe o início das inscrições."],
    ["enrollmentEnd", "Informe o fim das inscrições."],
    ["withdrawalDeadline", "Informe o prazo de cancelamento e trancamento."],
    ["gradesDeadline", "Informe o prazo de lançamento de notas."],
  ];
  for (const [field, message] of required) {
    if (!draft[field]) errors[field] = message;
  }
  if (Object.keys(errors).length > 0) return errors;

  if (draft.startDate >= draft.endDate) errors.endDate = "O fim deve ser posterior ao início.";
  if (draft.enrollmentStart > draft.enrollmentEnd) {
    errors.enrollmentEnd = "O fim das inscrições deve ser igual ou posterior ao início.";
  }
  if (draft.enrollmentStart < draft.startDate || draft.enrollmentEnd > draft.endDate) {
    errors.enrollmentStart = "As inscrições devem estar dentro do período letivo.";
  }
  if (draft.withdrawalDeadline < draft.enrollmentStart || draft.withdrawalDeadline > draft.endDate) {
    errors.withdrawalDeadline = "O prazo deve estar entre o início das inscrições e o fim do período.";
  }
  if (draft.gradesDeadline < draft.startDate) {
    errors.gradesDeadline = "O prazo não pode ser anterior ao início do período.";
  }
  return errors;
}

/**
 * What the student can do with an enrollment. A request can be withdrawn until
 * the seats are allocated; a confirmed enrollment can be cancelled or locked
 * until the calendar's withdrawal deadline; nothing else can be changed.
 */
export function enrollmentActions(
  status: EnrollmentStatus,
  withdrawalDeadline: string | undefined,
  today: string,
): { cancel: boolean; lock: boolean } {
  if (status === "requested") return { cancel: true, lock: false };
  if (status === "confirmed" && withdrawalDeadline !== undefined && withdrawalOpen(withdrawalDeadline, today)) {
    return { cancel: true, lock: true };
  }
  return { cancel: false, lock: false };
}

/** Can the Administration run the allocation? Only after the period ends. */
export function canAllocate(enrollmentEnd: string, today: string): boolean {
  return today > enrollmentEnd;
}

/** `date` (`YYYY-MM-DD`) moved by `days`, without time-zone surprises. */
export function addDaysIso(date: string, days: number): string {
  const moved = new Date(`${date}T12:00:00Z`);
  moved.setUTCDate(moved.getUTCDate() + days);
  return moved.toISOString().slice(0, 10);
}

export interface TravelTarget {
  label: string;
  date: string;
}

/** Shortcuts for the time-travel panel: the day after each deadline of a calendar. */
export function travelTargets(calendar: {
  enrollmentEnd: string;
  withdrawalDeadline: string;
  gradesDeadline: string;
}): TravelTarget[] {
  return [
    { label: "Fim das inscrições", date: addDaysIso(calendar.enrollmentEnd, 1) },
    { label: "Depois do prazo de cancelamento", date: addDaysIso(calendar.withdrawalDeadline, 1) },
    { label: "Depois do prazo de notas", date: addDaysIso(calendar.gradesDeadline, 1) },
  ];
}

/** Deadlines of a calendar as markers by date, for the time-travel calendar. */
export function calendarMarkers(calendar: {
  startDate: string;
  endDate: string;
  enrollmentStart: string;
  enrollmentEnd: string;
  withdrawalDeadline: string;
  gradesDeadline: string;
}): Record<string, { label: string }[]> {
  const markers: Record<string, { label: string }[]> = {};
  const add = (date: string, label: string) => {
    markers[date] = [...(markers[date] ?? []), { label }];
  };
  add(calendar.startDate, "Início do período letivo");
  add(calendar.enrollmentStart, "Início das inscrições");
  add(calendar.enrollmentEnd, "Último dia das inscrições");
  add(calendar.withdrawalDeadline, "Prazo de cancelamento e trancamento");
  add(calendar.endDate, "Fim do período letivo");
  add(calendar.gradesDeadline, "Prazo de lançamento de notas");
  return markers;
}

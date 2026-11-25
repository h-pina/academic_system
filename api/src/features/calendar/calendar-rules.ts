import { isIsoDate } from '../../common/utils/schedule.util';

export interface CalendarDates {
  startDate: string;
  endDate: string;
  enrollmentStart: string;
  enrollmentEnd: string;
  withdrawalDeadline: string;
  gradesDeadline: string;
}

/**
 * Consistency rules of an academic calendar (UC05 E01). Returns the list of
 * problems in Portuguese; empty when the dates are consistent.
 */
export function validateCalendarDates(c: CalendarDates): string[] {
  const problems: string[] = [];
  const fields: [string, string][] = [
    ['data de início', c.startDate],
    ['data de término', c.endDate],
    ['início das inscrições', c.enrollmentStart],
    ['fim das inscrições', c.enrollmentEnd],
    ['prazo de cancelamento e trancamento', c.withdrawalDeadline],
    ['prazo de lançamento de notas', c.gradesDeadline],
  ];
  for (const [label, value] of fields) {
    if (!isIsoDate(value)) problems.push(`A ${label} não é uma data válida`);
  }
  if (problems.length > 0) return problems;

  if (c.startDate >= c.endDate) {
    problems.push('A data de início deve ser anterior à data de término');
  }
  if (c.enrollmentStart > c.enrollmentEnd) {
    problems.push('O início das inscrições deve ser anterior ou igual ao fim');
  }
  if (c.enrollmentStart < c.startDate || c.enrollmentEnd > c.endDate) {
    problems.push('O período de inscrições deve estar dentro do período letivo');
  }
  if (c.withdrawalDeadline < c.enrollmentStart || c.withdrawalDeadline > c.endDate) {
    problems.push(
      'O prazo de cancelamento e trancamento deve estar entre o início das inscrições e o fim do período',
    );
  }
  if (c.gradesDeadline < c.startDate) {
    problems.push('O prazo de lançamento de notas não pode ser anterior ao início do período');
  }
  return problems;
}

/** A semester must fit inside its calendar's period. */
export function semesterFitsCalendar(
  semester: { startDate: string; endDate: string },
  calendar: { startDate: string; endDate: string },
): boolean {
  return (
    semester.startDate >= calendar.startDate &&
    semester.endDate <= calendar.endDate
  );
}

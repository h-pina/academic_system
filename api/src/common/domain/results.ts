import {
  GRADE_SCALE,
  MAX_ABSENCE_PERCENT,
} from './domain.constants';

export interface AssessmentWeight {
  id: number;
  weight: number;
  maxScore: number;
}

export type ProjectedResult =
  | 'approved'
  | 'failed_grade'
  | 'failed_attendance'
  | 'in_progress';

const round = (value: number): number => Math.round(value * 100) / 100;

/** Brings a grade to the 0-10 scale of the institution. */
export function toScale(value: number, maxScore: number): number {
  return (value / maxScore) * GRADE_SCALE;
}

/**
 * Weighted average on the 0-10 scale.
 * - `final` counts a missing grade as 0 and is only defined once every
 *   assessment has a grade (`complete`);
 * - `partial` averages only the graded assessments (running average).
 */
export function weightedAverage(
  assessments: readonly AssessmentWeight[],
  grades: ReadonlyMap<number, number>,
): { final: number | null; partial: number | null; complete: boolean } {
  const graded = assessments.filter((a) => grades.has(a.id));
  const sum = (list: readonly AssessmentWeight[]) =>
    list.reduce(
      (total, a) => total + toScale(grades.get(a.id) ?? 0, a.maxScore) * a.weight,
      0,
    );
  const weight = (list: readonly AssessmentWeight[]) =>
    list.reduce((total, a) => total + a.weight, 0);

  const complete = assessments.length > 0 && graded.length === assessments.length;
  return {
    final: complete ? round(sum(assessments) / weight(assessments)) : null,
    partial: graded.length > 0 ? round(sum(graded) / weight(graded)) : null,
    complete,
  };
}

/** Share of absences over the lessons recorded so far (0-100). */
export function absencePercent(absences: number, lessons: number): number {
  return lessons === 0 ? 0 : round((absences / lessons) * 100);
}

/**
 * RN07 and RN08. Failing by attendance wins over any grade; exactly 25 % of
 * absences is still allowed.
 */
export function resolveResult(input: {
  finalGrade: number | null;
  absencePercent: number;
  minPassingGrade: number;
}): ProjectedResult {
  if (input.absencePercent > MAX_ABSENCE_PERCENT) return 'failed_attendance';
  if (input.finalGrade === null) return 'in_progress';
  return input.finalGrade >= input.minPassingGrade ? 'approved' : 'failed_grade';
}

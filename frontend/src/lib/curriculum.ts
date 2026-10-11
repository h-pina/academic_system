import type { CurriculumSemester } from "@/types";

/**
 * Every semester of the course (1..totalSemesters), including the empty
 * ones, so the screen can offer to add subjects to any of them.
 */
export function fillSemesters(
  semesters: CurriculumSemester[],
  totalSemesters: number,
): CurriculumSemester[] {
  const byNumber = new Map(semesters.map((entry) => [entry.semester, entry]));
  const result: CurriculumSemester[] = [];

  for (let semester = 1; semester <= totalSemesters; semester++) {
    result.push(
      byNumber.get(semester) ?? { semester, workloadHours: 0, items: [] },
    );
  }
  return result;
}

/** Subjects of `all` not yet in the curriculum, filtered by a search term. */
export function availableSubjects<T extends { id: number; code: string; name: string }>(
  all: T[],
  placedIds: ReadonlySet<number>,
  term: string,
): T[] {
  const needle = term.trim().toLowerCase();

  return all.filter(
    (subject) =>
      !placedIds.has(subject.id) &&
      (needle === "" ||
        subject.code.toLowerCase().includes(needle) ||
        subject.name.toLowerCase().includes(needle)),
  );
}

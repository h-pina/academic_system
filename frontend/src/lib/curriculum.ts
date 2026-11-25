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

export type SubjectProgress = "approved" | "in_progress" | "not_taken";

export interface CurriculumProgress {
  /** Progress of each subject of the curriculum, by subject id. */
  bySubject: Map<number, SubjectProgress>;
  completedHours: number;
  inProgressHours: number;
  /** Hours of the curriculum not yet passed (includes the ones in progress). */
  remainingHours: number;
  totalHours: number;
  /** 0..100, of the curriculum's hours already passed. */
  percentCompleted: number;
}

/**
 * Where a student stands in the curriculum: a subject is approved when any of
 * their enrollments in it ended approved, in progress while a request or seat
 * is held in an ongoing class, and not taken otherwise (failed attempts and
 * cancellations leave it to be taken again).
 */
export function curriculumProgress(
  semesters: CurriculumSemester[],
  enrollments: { status: string; class: { subject: { id: number } } }[],
): CurriculumProgress {
  const approved = new Set<number>();
  const ongoing = new Set<number>();
  for (const enrollment of enrollments) {
    const id = enrollment.class.subject.id;
    if (enrollment.status === "approved") approved.add(id);
    else if (enrollment.status === "confirmed" || enrollment.status === "requested") ongoing.add(id);
  }

  const bySubject = new Map<number, SubjectProgress>();
  let completedHours = 0;
  let inProgressHours = 0;
  let totalHours = 0;
  for (const semester of semesters) {
    for (const item of semester.items) {
      totalHours += item.workloadHours;
      if (approved.has(item.subjectId)) {
        bySubject.set(item.subjectId, "approved");
        completedHours += item.workloadHours;
      } else if (ongoing.has(item.subjectId)) {
        bySubject.set(item.subjectId, "in_progress");
        inProgressHours += item.workloadHours;
      } else {
        bySubject.set(item.subjectId, "not_taken");
      }
    }
  }

  return {
    bySubject,
    completedHours,
    inProgressHours,
    remainingHours: totalHours - completedHours,
    totalHours,
    percentCompleted: totalHours === 0 ? 0 : Math.round((completedHours / totalHours) * 100),
  };
}

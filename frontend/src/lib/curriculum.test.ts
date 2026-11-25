import { describe, expect, it } from "vitest";
import { availableSubjects, curriculumProgress, fillSemesters } from "@/lib/curriculum";
import type { CurriculumSemester } from "@/types";

const semester = (
  number: number,
  codes: string[] = [],
): CurriculumSemester => ({
  semester: number,
  workloadHours: codes.length * 60,
  items: codes.map((code, index) => ({
    subjectId: number * 10 + index,
    code,
    name: code,
    workloadHours: 60,
    mandatory: true,
    prerequisites: [],
  })),
});

describe("fillSemesters", () => {
  it("returns every semester, keeping the ones that have items", () => {
    const filled = fillSemesters([semester(2, ["A"]), semester(5, ["B"])], 6);

    expect(filled.map((entry) => entry.semester)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(filled[1].items).toHaveLength(1);
    expect(filled[0].items).toEqual([]);
    expect(filled[0].workloadHours).toBe(0);
  });

  it("returns only empty semesters for an empty curriculum", () => {
    const filled = fillSemesters([], 3);
    expect(filled).toHaveLength(3);
    expect(filled.every((entry) => entry.items.length === 0)).toBe(true);
  });
});

describe("availableSubjects", () => {
  const all = [
    { id: 1, code: "MAT101", name: "Calculus I" },
    { id: 2, code: "CC101", name: "Programming" },
    { id: 3, code: "MAT102", name: "Calculus II" },
  ];

  it("excludes subjects already in the curriculum", () => {
    expect(availableSubjects(all, new Set([1]), "").map((s) => s.id)).toEqual([
      2, 3,
    ]);
  });

  it("filters by code or name, ignoring case", () => {
    expect(availableSubjects(all, new Set(), "calc").map((s) => s.id)).toEqual([
      1, 3,
    ]);
    expect(availableSubjects(all, new Set(), "cc1").map((s) => s.id)).toEqual([2]);
  });

  it("combines both filters", () => {
    expect(availableSubjects(all, new Set([3]), "mat").map((s) => s.id)).toEqual([
      1,
    ]);
  });
});

describe("curriculumProgress", () => {
  const semesters = [
    {
      semester: 1,
      workloadHours: 120,
      items: [
        { subjectId: 1, workloadHours: 60 },
        { subjectId: 2, workloadHours: 60 },
      ],
    },
    { semester: 2, workloadHours: 90, items: [{ subjectId: 3, workloadHours: 30 }, { subjectId: 4, workloadHours: 60 }] },
  ] as unknown as CurriculumSemester[];
  const enrollment = (status: string, id: number) => ({ status, class: { subject: { id } } });

  it("separates passed, ongoing and untaken subjects, with the hours", () => {
    const result = curriculumProgress(semesters, [
      enrollment("approved", 1),
      enrollment("confirmed", 2),
      enrollment("failed_grade", 3),
    ]);
    expect(result.bySubject.get(1)).toBe("approved");
    expect(result.bySubject.get(2)).toBe("in_progress");
    expect(result.bySubject.get(3)).toBe("not_taken");
    expect(result.bySubject.get(4)).toBe("not_taken");
    expect(result.completedHours).toBe(60);
    expect(result.inProgressHours).toBe(60);
    expect(result.remainingHours).toBe(150);
    expect(result.totalHours).toBe(210);
    expect(result.percentCompleted).toBe(29);
  });

  it("counts a request as in progress, but not a cancelled or unallocated one", () => {
    const result = curriculumProgress(semesters, [
      enrollment("requested", 1),
      enrollment("cancelled", 2),
      enrollment("not_allocated", 3),
    ]);
    expect([1, 2, 3].map((id) => result.bySubject.get(id))).toEqual(["in_progress", "not_taken", "not_taken"]);
  });

  it("handles an empty curriculum", () => {
    expect(curriculumProgress([], []).percentCompleted).toBe(0);
  });
});

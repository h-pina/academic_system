import { describe, expect, it } from "vitest";
import { institutionTiles, studentTiles, teacherTiles } from "@/lib/dashboard";

describe("dashboard tiles", () => {
  it("lists the institution numbers in order", () => {
    const tiles = institutionTiles({
      activeStudents: 4,
      activeTeachers: 3,
      activeCourses: 2,
      subjects: 12,
      departments: 2,
      studentsByCourse: [],
    });

    expect(tiles.map((tile) => [tile.label, tile.value])).toEqual([
      ["Alunos ativos", "4"],
      ["Professores ativos", "3"],
      ["Cursos ativos", "2"],
      ["Disciplinas", "12"],
      ["Departamentos", "2"],
    ]);
  });

  it("summarizes a teacher's department", () => {
    const tiles = teacherTiles({
      department: {
        id: 1,
        name: "Computer Science",
        code: "DCC",
        activeTeachers: 3,
        activeStudents: 2,
      },
      courses: [{ id: 1, name: "CC", code: "CC", activeStudents: 2 }],
    });

    expect(tiles.map((tile) => tile.value)).toEqual(["3", "2", "1"]);
  });

  it("shows a placeholder when the student has no matrícula", () => {
    const tiles = studentTiles({
      registrationNumber: null,
      entryYear: 2026,
      status: "active",
      course: {
        id: 1,
        name: "CC",
        code: "CC",
        departmentName: "DCC",
        totalSemesters: 8,
        curriculumWorkloadHours: 840,
      },
    });

    expect(tiles[0]).toEqual({ label: "Matrícula", value: "—" });
    expect(tiles[3]).toEqual({ label: "Carga horária da matriz", value: "840 h" });
  });
});

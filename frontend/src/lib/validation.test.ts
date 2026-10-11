import { describe, expect, it } from "vitest";
import {
  isValidCode,
  validateCourseDraft,
  validateDepartmentDraft,
  validateStudentDraft,
  validateSubjectDraft,
  validateTeacherDraft,
  type StudentDraft,
  type TeacherDraft,
} from "@/lib/validation";

const student = (overrides: Partial<StudentDraft> = {}): StudentDraft => ({
  cpf: "123.456.789-09",
  name: "Maria Silva",
  email: "maria@example.com",
  courseId: 1,
  entryYear: 2026,
  ...overrides,
});

const teacher = (overrides: Partial<TeacherDraft> = {}): TeacherDraft => ({
  cpf: "12345678909",
  name: "João Souza",
  email: "joao@example.com",
  departmentId: 1,
  title: "doctor",
  ...overrides,
});

describe("validateStudentDraft", () => {
  it("accepts a complete draft", () => {
    expect(validateStudentDraft(student(), { existingUser: false })).toEqual([]);
  });

  it("requires a valid CPF, name, e-mail, course and year", () => {
    const errors = validateStudentDraft(
      student({ cpf: "111", name: "Al", email: "x", courseId: 0, entryYear: "" }),
      { existingUser: false },
    );
    expect(errors).toHaveLength(5);
  });

  it("does not require name and e-mail for a person already registered", () => {
    const errors = validateStudentDraft(student({ name: "", email: "" }), {
      existingUser: true,
    });
    expect(errors).toEqual([]);
  });

  it("still requires a valid CPF for a registered person", () => {
    const errors = validateStudentDraft(student({ cpf: "12345678900" }), {
      existingUser: true,
    });
    expect(errors).toEqual(["Informe um CPF válido."]);
  });

  it.each([1899, 2101, 2026.5])("rejects entry year %s", (entryYear) => {
    const errors = validateStudentDraft(student({ entryYear }), {
      existingUser: false,
    });
    expect(errors).toHaveLength(1);
  });
});

describe("validateTeacherDraft", () => {
  it("accepts a complete draft", () => {
    expect(validateTeacherDraft(teacher(), { existingUser: false })).toEqual([]);
  });

  it("requires department and a known title", () => {
    const errors = validateTeacherDraft(
      teacher({ departmentId: 0, title: "" }),
      { existingUser: false },
    );
    expect(errors).toEqual([
      "Selecione o departamento.",
      "Selecione a titulação.",
    ]);
  });
});

describe("isValidCode", () => {
  it.each(["DCC", "mat-101", "CC_2", "AB"])("accepts %s", (code) => {
    expect(isValidCode(code)).toBe(true);
  });

  it.each(["", "A", "a b", "ção", "X".repeat(21)])("rejects %j", (code) => {
    expect(isValidCode(code)).toBe(false);
  });
});

describe("validateDepartmentDraft", () => {
  it("accepts a valid department", () => {
    expect(validateDepartmentDraft({ name: "Física", code: "FIS" })).toEqual([]);
  });

  it("rejects a short name and an invalid code", () => {
    expect(validateDepartmentDraft({ name: "Fi", code: "a b" })).toHaveLength(2);
  });
});

describe("validateCourseDraft", () => {
  const course = {
    name: "Ciência da Computação",
    code: "CC",
    departmentId: 1,
    totalSemesters: 8 as number | "",
  };

  it("accepts a valid course", () => {
    expect(validateCourseDraft(course)).toEqual([]);
  });

  it.each([0, 21, 2.5, ""])("rejects %j semesters", (totalSemesters) => {
    expect(
      validateCourseDraft({ ...course, totalSemesters: totalSemesters as number | "" }),
    ).toHaveLength(1);
  });

  it("requires a department", () => {
    expect(validateCourseDraft({ ...course, departmentId: 0 })).toEqual([
      "Selecione o departamento.",
    ]);
  });
});

describe("validateSubjectDraft", () => {
  const subject = {
    name: "Cálculo I",
    code: "MAT101",
    workloadHours: 90 as number | "",
    description: "",
  };

  it("accepts a valid subject", () => {
    expect(validateSubjectDraft(subject)).toEqual([]);
  });

  it.each([0, 1001, 1.5, ""])("rejects %j hours", (workloadHours) => {
    expect(
      validateSubjectDraft({ ...subject, workloadHours: workloadHours as number | "" }),
    ).toHaveLength(1);
  });

  it("limits the description to 500 characters", () => {
    expect(
      validateSubjectDraft({ ...subject, description: "x".repeat(501) }),
    ).toHaveLength(1);
  });
});

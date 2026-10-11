import { describe, expect, it } from "vitest";
import {
  validateStudentDraft,
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

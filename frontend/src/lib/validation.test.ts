import { describe, expect, it } from "vitest";
import {
  courseFieldErrors,
  departmentFieldErrors,
  isValidCode,
  studentFieldErrors,
  subjectFieldErrors,
  teacherFieldErrors,
  userFieldErrors,
  validateCourseDraft,
  validateDepartmentDraft,
  validateProfileForm,
  validateStaffDraft,
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

describe("validateStaffDraft", () => {
  const person = { cpf: "123.456.789-09", name: "Ana Souza", email: "ana@example.com" };

  it("accepts a complete draft", () => {
    expect(validateStaffDraft(person, { existingUser: false })).toEqual([]);
  });

  it("requires name and e-mail only for a new person", () => {
    const blank = { ...person, name: "", email: "" };
    expect(validateStaffDraft(blank, { existingUser: false })).toHaveLength(2);
    expect(validateStaffDraft(blank, { existingUser: true })).toEqual([]);
  });
});

describe("validateProfileForm", () => {
  const draft = {
    name: "Alice Admin",
    email: "alice@example.com",
    changePassword: false,
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  };

  it("accepts a valid profile without a password change", () => {
    expect(validateProfileForm(draft)).toEqual({});
  });

  it("reports the name and e-mail on their own fields", () => {
    expect(validateProfileForm({ ...draft, name: "Al", email: "x" })).toEqual({
      name: "O nome deve ter pelo menos 3 caracteres.",
      email: "Informe um e-mail válido.",
    });
  });

  it("ignores the password fields unless a change was requested", () => {
    expect(
      validateProfileForm({ ...draft, newPassword: "x", confirmPassword: "y" }),
    ).toEqual({});
  });

  it("validates each password field when changing the password", () => {
    expect(
      validateProfileForm({ ...draft, changePassword: true }),
    ).toEqual({
      currentPassword: "Informe a senha atual.",
      newPassword: "A nova senha deve ter pelo menos 8 caracteres.",
    });

    expect(
      validateProfileForm({
        ...draft,
        changePassword: true,
        currentPassword: "password123",
        newPassword: "newpassword8",
        confirmPassword: "different88",
      }),
    ).toEqual({ confirmPassword: "As senhas não coincidem." });
  });

  it("accepts a complete password change", () => {
    expect(
      validateProfileForm({
        ...draft,
        changePassword: true,
        currentPassword: "password123",
        newPassword: "newpassword8",
        confirmPassword: "newpassword8",
      }),
    ).toEqual({});
  });
});

describe("field-level errors", () => {
  it("key each message by its field, in the order of the form", () => {
    expect(
      studentFieldErrors(
        { cpf: "111", name: "Al", email: "x", courseId: 0, entryYear: "" },
        { existingUser: false },
      ),
    ).toEqual({
      cpf: "Informe um CPF válido.",
      name: "O nome deve ter pelo menos 3 caracteres.",
      email: "Informe um e-mail válido.",
      courseId: "Selecione o curso.",
      entryYear: "O ano de ingresso deve estar entre 1900 e 2100.",
    });
  });

  it("agree with the list form of the same validation", () => {
    const draft = { name: "Fi", code: "a b" };
    expect(validateDepartmentDraft(draft)).toEqual(Object.values(departmentFieldErrors(draft)));
  });

  it("report department, course and subject problems on their own fields", () => {
    expect(
      courseFieldErrors({ name: "Fisica", code: "FIS", departmentId: 0, totalSemesters: 0 }),
    ).toEqual({
      departmentId: "Selecione o departamento.",
      totalSemesters: "O número de semestres deve estar entre 1 e 20.",
    });
    expect(
      subjectFieldErrors({
        name: "Cálculo I",
        code: "MAT101",
        workloadHours: 5000,
        description: "",
      }),
    ).toEqual({ workloadHours: "A carga horária deve estar entre 1 e 1000 horas." });
    expect(
      teacherFieldErrors(
        { cpf: "12345678909", name: "João Souza", email: "j@e.com", departmentId: 1, title: "" },
        { existingUser: false },
      ),
    ).toEqual({ title: "Selecione a titulação." });
  });

  it("validate the user form, including the optional password", () => {
    const base = { cpf: "12345678909", name: "Ana Souza", email: "ana@example.com", password: "" };
    expect(userFieldErrors(base, { creating: true })).toEqual({});
    expect(userFieldErrors({ ...base, password: "curta" }, { creating: true })).toEqual({
      password: "A senha deve ter pelo menos 8 caracteres.",
    });
    // Editing ignores CPF and password.
    expect(
      userFieldErrors({ ...base, cpf: "1", password: "x" }, { creating: false }),
    ).toEqual({});
  });
});

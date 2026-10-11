import { describe, expect, it } from "vitest";
import {
  buildNavigation,
  canAccessRoute,
  expandRoles,
  flattenNavigation,
  hasAnyRole,
  resolvePageTitle,
  resolveRoleLabel,
} from "@/lib/access";
import type { RoleName } from "@/types";

const routes = (roles: RoleName[]) =>
  flattenNavigation(buildNavigation(roles)).map((item) => item.route);
const titles = (roles: RoleName[]) =>
  buildNavigation(roles).map((section) => section.title ?? "(sem título)");

describe("expandRoles / hasAnyRole", () => {
  it("makes admin include the secretary role", () => {
    expect(expandRoles(["admin"]).sort()).toEqual(["admin", "secretary"]);
    expect(hasAnyRole(["admin"], ["secretary"])).toBe(true);
  });

  it("does not make secretary include admin", () => {
    expect(hasAnyRole(["secretary"], ["admin"])).toBe(false);
  });

  it("accepts any of several required roles and nothing for no roles", () => {
    expect(hasAnyRole(["teacher"], ["admin", "teacher"])).toBe(true);
    expect(hasAnyRole(["student"], ["admin", "teacher"])).toBe(false);
    expect(hasAnyRole([], ["admin", "secretary", "teacher", "student"])).toBe(false);
  });
});

describe("student navigation", () => {
  it("is about the student's own path, with no lists of other people", () => {
    expect(routes(["student"])).toEqual([
      "my-course",
      "my-curriculum",
      "my-subjects",
      "profile",
    ]);
  });

  it("has a single untitled section", () => {
    expect(titles(["student"])).toEqual(["(sem título)"]);
  });
});

describe("teacher navigation", () => {
  it("is about the department and the catalogue", () => {
    expect(routes(["teacher"])).toEqual([
      "my-department",
      "students",
      "courses",
      "subjects",
      "profile",
    ]);
  });

  it("does not offer people management or the students' own screens", () => {
    for (const route of ["teachers", "staff", "register-users", "my-course"]) {
      expect(routes(["teacher"])).not.toContain(route);
    }
  });
});

describe("secretary and admin navigation", () => {
  it("groups the secretary's modules by purpose", () => {
    expect(titles(["secretary"])).toEqual(["Pessoas", "Estrutura acadêmica", "Conta"]);
    expect(routes(["secretary"])).toEqual([
      "students",
      "teachers",
      "departments",
      "courses",
      "subjects",
      "profile",
    ]);
  });

  it("adds an administration group for the admin only", () => {
    expect(titles(["admin"])).toEqual([
      "Pessoas",
      "Estrutura acadêmica",
      "Administração",
      "Conta",
    ]);
    expect(routes(["admin"])).toEqual(expect.arrayContaining(["staff", "register-users"]));
    expect(routes(["secretary"])).not.toContain("staff");
    expect(routes(["secretary"])).not.toContain("register-users");
  });

  it("never lists a module twice", () => {
    for (const roles of [["admin"], ["admin", "teacher", "student"]] as RoleName[][]) {
      const list = routes(roles);
      expect(new Set(list).size).toBe(list.length);
    }
  });
});

describe("a person with several profiles", () => {
  it("gets separate, named blocks for teaching and studying", () => {
    expect(titles(["teacher", "student"])).toEqual(["Como professor", "Como aluno"]);
  });

  it("sees each module once, the first block winning", () => {
    const list = routes(["teacher", "student"]);
    expect(list.filter((route) => route === "profile")).toHaveLength(1);
    expect(list).toEqual(
      expect.arrayContaining(["my-department", "students", "my-course", "my-curriculum"]),
    );
    const sections = buildNavigation(["teacher", "student"]);
    expect(sections[0].items.map((item) => item.route)).toContain("profile");
    expect(sections[1].items.map((item) => item.route)).not.toContain("profile");
  });

  it("keeps the staff sections and adds the personal blocks after them", () => {
    expect(titles(["secretary", "student"])).toEqual([
      "Pessoas",
      "Estrutura acadêmica",
      "Conta",
      "Como aluno",
    ]);
  });
});

describe("a person without profile", () => {
  it("has no navigation", () => {
    expect(buildNavigation([])).toEqual([]);
  });

  it("can still open their own data, and nothing else", () => {
    expect(canAccessRoute([], "profile")).toBe(true);
    for (const route of ["my-course", "students", "courses", "design", "staff"]) {
      expect(canAccessRoute([], route)).toBe(false);
    }
  });
});

describe("canAccessRoute", () => {
  it("follows the navigation of each profile", () => {
    expect(canAccessRoute(["student"], "my-curriculum")).toBe(true);
    expect(canAccessRoute(["teacher"], "my-department")).toBe(true);
    expect(canAccessRoute(["secretary"], "teachers")).toBe(true);
    expect(canAccessRoute(["admin"], "staff")).toBe(true);
  });

  it("blocks a student from lists of other people and from the catalogue", () => {
    for (const route of ["students", "teachers", "departments", "courses", "staff", "register-users"]) {
      expect(canAccessRoute(["student"], route)).toBe(false);
    }
  });

  it("blocks modules a profile does not have, including unknown routes", () => {
    expect(canAccessRoute(["secretary"], "register-users")).toBe(false);
    expect(canAccessRoute(["teacher"], "teachers")).toBe(false);
    expect(canAccessRoute(["admin"], "does-not-exist")).toBe(false);
  });

  it("opens the modules of every profile a person holds", () => {
    expect(canAccessRoute(["teacher", "student"], "my-course")).toBe(true);
    expect(canAccessRoute(["teacher", "student"], "students")).toBe(true);
  });

  it("keeps hidden tools out of the menu but reachable with a profile", () => {
    expect(routes(["admin"])).not.toContain("design");
    expect(canAccessRoute(["student"], "design")).toBe(true);
  });
});

describe("labels and titles", () => {
  it("joins the labels of every role", () => {
    expect(resolveRoleLabel(["teacher", "student"])).toBe("Professor, Aluno");
    expect(resolveRoleLabel([])).toBe("");
  });

  it("names pages from the navigation", () => {
    expect(resolvePageTitle("my-curriculum")).toBe("Minha matriz");
    expect(resolvePageTitle("courses")).toBe("Cursos e matrizes");
    expect(resolvePageTitle("design")).toBe("Componentes");
    expect(resolvePageTitle("nope")).toBe("Módulo");
  });
});

import { describe, expect, it } from "vitest";
import {
  buildBreadcrumbs,
  isActiveRoute,
  isTypingTarget,
  parseSidebarState,
  resolveShortcut,
  toggleSidebarState,
} from "@/lib/shell";

describe("sidebar state", () => {
  it("is expanded unless explicitly collapsed", () => {
    expect(parseSidebarState("collapsed")).toBe("collapsed");
    for (const value of [null, undefined, "", "expanded", "open", "COLLAPSED"]) {
      expect(parseSidebarState(value as string | null | undefined)).toBe("expanded");
    }
  });

  it("toggles between the two states", () => {
    expect(toggleSidebarState("expanded")).toBe("collapsed");
    expect(toggleSidebarState("collapsed")).toBe("expanded");
  });
});

describe("isActiveRoute", () => {
  it("matches the module and anything below it", () => {
    expect(isActiveRoute("/app/courses", "courses")).toBe(true);
    expect(isActiveRoute("/app/courses/3/curriculum", "courses")).toBe(true);
  });

  it("does not match a different module sharing a prefix", () => {
    expect(isActiveRoute("/app/students", "student")).toBe(false);
    expect(isActiveRoute("/app/my-course", "courses")).toBe(false);
    expect(isActiveRoute("/app", "courses")).toBe(false);
  });
});

describe("buildBreadcrumbs", () => {
  it("has none on the home page", () => {
    expect(buildBreadcrumbs("/app")).toEqual([]);
    expect(buildBreadcrumbs("/login")).toEqual([]);
  });

  it("names a module page as the current page", () => {
    expect(buildBreadcrumbs("/app/students")).toEqual([{ label: "Alunos" }]);
    expect(buildBreadcrumbs("/app/my-course")).toEqual([{ label: "Meu curso" }]);
    expect(buildBreadcrumbs("/app/my-course/subjects")).toEqual([
      { label: "Meu curso", href: "/app/my-course" },
      { label: "Lista de disciplinas" },
    ]);
  });

  it("links the module on a nested page and skips identifiers", () => {
    expect(buildBreadcrumbs("/app/courses/3/curriculum")).toEqual([
      { label: "Cursos e matrizes", href: "/app/courses" },
      { label: "Matriz curricular" },
    ]);
  });

  it("ignores unknown nested segments", () => {
    expect(buildBreadcrumbs("/app/courses/3/unknown")).toEqual([
      { label: "Cursos e matrizes" },
    ]);
  });
});

describe("shortcuts", () => {
  const page = { tagName: "BODY" };

  it("maps / to search and m to the menu", () => {
    expect(resolveShortcut({ key: "/" }, page)).toBe("focus-search");
    expect(resolveShortcut({ key: "m" }, page)).toBe("toggle-menu");
    expect(resolveShortcut({ key: "M" }, page)).toBe("toggle-menu");
  });

  it("ignores other keys", () => {
    expect(resolveShortcut({ key: "a" }, page)).toBeNull();
    expect(resolveShortcut({ key: "Enter" }, page)).toBeNull();
  });

  it("never fires while typing", () => {
    for (const tagName of ["INPUT", "TEXTAREA", "SELECT"]) {
      expect(resolveShortcut({ key: "m" }, { tagName })).toBeNull();
    }
    expect(resolveShortcut({ key: "/" }, { tagName: "DIV", isContentEditable: true })).toBeNull();
  });

  it("never fires with a modifier, so browser shortcuts keep working", () => {
    expect(resolveShortcut({ key: "m", ctrlKey: true }, page)).toBeNull();
    expect(resolveShortcut({ key: "/", metaKey: true }, page)).toBeNull();
    expect(resolveShortcut({ key: "m", altKey: true }, page)).toBeNull();
  });

  it("treats a missing target as not typing", () => {
    expect(isTypingTarget(null)).toBe(false);
    expect(resolveShortcut({ key: "/" }, null)).toBe("focus-search");
  });
});

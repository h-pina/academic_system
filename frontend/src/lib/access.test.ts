import { describe, expect, it } from "vitest";
import {
  buildMenu,
  canAccessRoute,
  expandRoles,
  hasAnyRole,
  resolveRoleLabel,
} from "@/lib/access";

describe("expandRoles / hasAnyRole", () => {
  it("makes admin include the secretary role", () => {
    expect(expandRoles(["admin"]).sort()).toEqual(["admin", "secretary"]);
    expect(hasAnyRole(["admin"], ["secretary"])).toBe(true);
  });

  it("does not make secretary include admin", () => {
    expect(hasAnyRole(["secretary"], ["admin"])).toBe(false);
  });

  it("accepts any of several required roles", () => {
    expect(hasAnyRole(["teacher"], ["admin", "teacher"])).toBe(true);
    expect(hasAnyRole(["student"], ["admin", "teacher"])).toBe(false);
  });

  it("grants nothing to a user without roles", () => {
    expect(hasAnyRole([], ["admin", "secretary", "teacher", "student"])).toBe(
      false,
    );
  });
});

describe("buildMenu", () => {
  it("shows the user management module to admin only", () => {
    expect(buildMenu(["admin"]).map((item) => item.route)).toContain(
      "register-users",
    );
    for (const roles of [["secretary"], ["teacher"], ["student"], []] as const) {
      expect(buildMenu([...roles]).map((item) => item.route)).not.toContain(
        "register-users",
      );
    }
  });

  it("returns an empty menu for a user without profile", () => {
    expect(buildMenu([])).toEqual([]);
  });

  it("combines the modules of several roles", () => {
    const menu = buildMenu(["teacher", "admin"]).map((item) => item.route);
    expect(menu).toContain("register-users");
  });
});

describe("canAccessRoute", () => {
  it("blocks routes the roles cannot see and unknown routes", () => {
    expect(canAccessRoute(["admin"], "register-users")).toBe(true);
    expect(canAccessRoute(["teacher"], "register-users")).toBe(false);
    expect(canAccessRoute(["admin"], "does-not-exist")).toBe(false);
  });
});

describe("resolveRoleLabel", () => {
  it("joins the labels of every role", () => {
    expect(resolveRoleLabel(["teacher", "student"])).toBe("Professor, Aluno");
  });

  it("is empty when there are no roles", () => {
    expect(resolveRoleLabel([])).toBe("");
  });
});

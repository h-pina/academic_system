import {
  ADMIN_SECTIONS,
  HIDDEN_ROUTES,
  ITEMS,
  KIND_TITLES,
  NO_PROFILE_ROUTES,
  SECRETARY_SECTIONS,
  STUDENT_SECTIONS,
  TEACHER_SECTIONS,
  type NavItem,
  type NavSection,
} from "@/config/navigation";
import type { RoleName } from "@/types";

export const ROLE_LABELS: Record<RoleName, string> = {
  admin: "Administrador",
  secretary: "Secretaria",
  teacher: "Professor",
  student: "Aluno",
};

/** `admin` includes every permission of `secretary`. */
export function expandRoles(roles: readonly RoleName[]): RoleName[] {
  const expanded = new Set<RoleName>(roles);
  if (expanded.has("admin")) expanded.add("secretary");
  return [...expanded];
}

export function hasAnyRole(
  userRoles: readonly RoleName[],
  required: readonly RoleName[],
): boolean {
  const granted = expandRoles(userRoles);
  return required.some((role) => granted.includes(role));
}

/** Human-readable roles, e.g. "Professor, Aluno"; empty when unlinked. */
export function resolveRoleLabel(roles: readonly RoleName[]): string {
  return roles.map((role) => ROLE_LABELS[role] ?? role).join(", ");
}

const clone = (sections: NavSection[]): NavSection[] =>
  sections.map((section) => ({ ...section, items: [...section.items] }));

/**
 * The navigation of a user, built from the profiles they hold.
 *
 * - One kind of profile: that profile's own sections, as designed.
 * - Several kinds (e.g. teacher and student): one block per kind, the
 *   teacher and student blocks titled "Como professor" / "Como aluno", and a
 *   module listed only once even when two kinds both offer it.
 * - No profile: nothing.
 */
export function buildNavigation(roles: readonly RoleName[]): NavSection[] {
  const granted = expandRoles(roles);

  const blocks: { kind: "staff" | "teacher" | "student"; sections: NavSection[] }[] = [];
  if (granted.includes("admin")) {
    blocks.push({ kind: "staff", sections: clone(ADMIN_SECTIONS) });
  } else if (granted.includes("secretary")) {
    blocks.push({ kind: "staff", sections: clone(SECRETARY_SECTIONS) });
  }
  if (granted.includes("teacher")) {
    blocks.push({ kind: "teacher", sections: clone(TEACHER_SECTIONS) });
  }
  if (granted.includes("student")) {
    blocks.push({ kind: "student", sections: clone(STUDENT_SECTIONS) });
  }

  if (blocks.length === 0) return [];
  if (blocks.length === 1) return blocks[0].sections;

  const seen = new Set<string>();
  return blocks
    .flatMap(({ kind, sections }) =>
      sections.map((section) =>
        kind === "staff" ? section : { ...section, title: KIND_TITLES[kind] },
      ),
    )
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (seen.has(item.route)) return false;
        seen.add(item.route);
        return true;
      }),
    }))
    .filter((section) => section.items.length > 0);
}

/** Every module of a user's navigation as one flat list. */
export function flattenNavigation(sections: NavSection[]): NavItem[] {
  return sections.flatMap((section) => section.items);
}

/** Can this user open `/app/<route>`? Hidden tools need only a profile. */
export function canAccessRoute(
  roles: readonly RoleName[],
  route: string,
): boolean {
  if (roles.length === 0) return NO_PROFILE_ROUTES.includes(route);
  if (route in HIDDEN_ROUTES) return true;

  return flattenNavigation(buildNavigation(roles)).some(
    (item) => item.route === route,
  );
}

export function resolvePageTitle(route: string): string {
  const item = (ITEMS as Record<string, NavItem>)[route];
  return item?.label ?? HIDDEN_ROUTES[route] ?? "Módulo";
}

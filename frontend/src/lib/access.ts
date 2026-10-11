import featuresJson from "@/config/features.json";
import type { Feature, MenuItem, RoleName } from "@/types";

const FEATURES = featuresJson as Feature[];

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

export function buildMenu(roles: readonly RoleName[]): MenuItem[] {
  return FEATURES.filter(
    (feature) => !feature.hidden && hasAnyRole(roles, feature.roles),
  ).map(
    (feature) => ({ route: feature.route, label: feature.label }),
  );
}

export function canAccessRoute(
  roles: readonly RoleName[],
  route: string,
): boolean {
  const feature = FEATURES.find((entry) => entry.route === route);
  return feature ? hasAnyRole(roles, feature.roles) : false;
}

export function resolvePageTitle(route: string): string {
  return FEATURES.find((feature) => feature.route === route)?.label ?? "Módulo";
}

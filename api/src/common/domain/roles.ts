/**
 * Application roles. They are never stored: a user's roles are derived from
 * the profile tables (`staff`, `teachers`, `students`), see `RolesService`.
 */
export const ROLES = ['admin', 'secretary', 'teacher', 'student'] as const;
export type RoleName = (typeof ROLES)[number];

/** `admin` includes every permission of `secretary`. */
export function expandRoles(roles: readonly RoleName[]): RoleName[] {
  const expanded = new Set<RoleName>(roles);
  if (expanded.has('admin')) {
    expanded.add('secretary');
  }
  return [...expanded];
}

/** True when the user holds at least one of the required roles. */
export function hasAnyRole(
  userRoles: readonly RoleName[],
  required: readonly RoleName[],
): boolean {
  const granted = expandRoles(userRoles);
  return required.some((role) => granted.includes(role));
}

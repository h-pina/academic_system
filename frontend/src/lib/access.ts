import featuresJson from "@/config/features.json";
import featureAccessJson from "@/config/feature-access.json";
import rolesJson from "@/config/roles.json";
import type { Feature, FeatureAccess, MenuItem, Role } from "@/types";

const FEATURES = featuresJson as Feature[];
const FEATURE_ACCESS = featureAccessJson as FeatureAccess[];
export const ROLES = rolesJson as Role[];

export function resolveRoleName(roleId: number): string {
  return ROLES.find((role) => role.id === roleId)?.name ?? "Undefined role";
}

export function buildMenu(roleId: number): MenuItem[] {
  const access = FEATURE_ACCESS.find((entry) => entry.roleId === roleId);
  if (!access) return [];

  const allowed = new Set(access.features);

  return FEATURES.filter((feature) => allowed.has(feature.code)).map(
    (feature) => ({ route: feature.route, label: feature.label }),
  );
}

export function resolvePageTitle(route: string): string {
  return FEATURES.find((feature) => feature.route === route)?.label ?? "Module";
}

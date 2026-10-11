"use client";

import { useMemo } from "react";
import { useUser } from "@/context/UserContext";
import { hasAnyRole } from "@/lib/access";

/** What the signed-in user may do, derived from their roles. */
export function usePermissions() {
  const { profile } = useUser();

  return useMemo(() => {
    const roles = profile?.roles ?? [];
    return {
      roles,
      isAdmin: hasAnyRole(roles, ["admin"]),
      /** admin or secretary: can create and edit academic records. */
      canManage: hasAnyRole(roles, ["secretary"]),
    };
  }, [profile]);
}

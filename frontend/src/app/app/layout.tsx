"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import NoProfileNotice from "@/components/NoProfileNotice";
import AppShell from "@/components/shell/AppShell";
import TimeTravelBar from "@/components/shell/TimeTravelBar";
import { ClockProvider } from "@/context/ClockContext";
import { useUser } from "@/context/UserContext";
import { useApi } from "@/hooks/useApi";
import { canAccessRoute } from "@/lib/access";
import type { AuthProfile } from "@/types";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClockProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </ClockProvider>
  );
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, roleName, hydrated, navigation, actions } = useUser();
  const { request } = useApi();
  const refreshed = useRef(false);

  useEffect(() => {
    if (hydrated && !profile) router.replace("/login");
  }, [hydrated, profile, router]);

  // Roles are derived on the server and can change after sign-in (e.g. a
  // profile is linked or deactivated), so refresh them once per page load.
  useEffect(() => {
    if (!hydrated || !profile || refreshed.current) return;
    refreshed.current = true;
    (async () => {
      const result = await request<AuthProfile>("/auth/me", { silent: true });
      if (result.ok) actions.setUser(result.data);
    })();
  }, [hydrated, profile, request, actions]);

  const roles = profile?.roles ?? [];
  const currentRoute = pathname.replace("/app/", "").split("/")[0];
  const isHome = pathname === "/app";
  const allowed = isHome ? roles.length > 0 : canAccessRoute(roles, currentRoute);

  useEffect(() => {
    if (hydrated && profile && roles.length > 0 && !allowed) {
      router.replace("/app");
    }
  }, [hydrated, profile, roles.length, allowed, router]);

  if (!hydrated || !profile) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-canvas">
        <LoadingSpinner />
      </div>
    );
  }

  const user = { name: profile.name, roleLabel: roleName };

  // A person with no profile has no modules; they only see the notice and
  // their own data.
  if (roles.length === 0) {
    return (
      <AppShell sections={null} user={user} onSignOut={() => actions.clearUser()}>
        {allowed ? children : <NoProfileNotice />}
        <TimeTravelBar />
      </AppShell>
    );
  }

  return (
    <AppShell
      sections={navigation}
      user={user}
      onSignOut={() => actions.clearUser()}
    >
      {allowed ? children : null}
      <TimeTravelBar />
    </AppShell>
  );
}

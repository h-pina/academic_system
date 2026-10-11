"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import ContentHeader from "@/components/ContentHeader";
import Header from "@/components/Header";
import NoProfileNotice from "@/components/NoProfileNotice";
import LoadingSpinner from "@/components/LoadingSpinner";
import Sidebar from "@/components/Sidebar";
import { useUser } from "@/context/UserContext";
import { useApi } from "@/hooks/useApi";
import { canAccessRoute, resolvePageTitle } from "@/lib/access";
import type { AuthProfile } from "@/types";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    profile,
    hydrated,
    navigation,
    sidebarOpen,
    setSidebarOpen,
    actions,
  } = useUser();
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
  const forbidden = !isHome && !canAccessRoute(roles, currentRoute);

  useEffect(() => {
    if (hydrated && profile && roles.length > 0 && forbidden) {
      router.replace("/app");
    }
  }, [hydrated, profile, roles.length, forbidden, router]);

  if (!hydrated || !profile) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-canvas">
        <LoadingSpinner />
      </div>
    );
  }

  const title = resolvePageTitle(currentRoute);

  if (roles.length === 0) {
    return (
      <div className="flex h-screen w-full flex-col overflow-hidden bg-canvas">
        <Header />
        <main className="flex-1 overflow-auto">
          {canAccessRoute(roles, currentRoute) ? children : <NoProfileNotice />}
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden bg-canvas">
      <Header />

      <div className="relative flex flex-1 overflow-hidden">
        <aside
          className={`${
            sidebarOpen ? "w-72" : "w-0 -translate-x-full"
          } shrink-0 overflow-hidden border-r border-slate-200 bg-surface transition-all duration-300 ease-in-out`}
        >
          <div className="flex h-full w-72 flex-col">
            <Sidebar sections={navigation} onNavigate={() => setSidebarOpen(false)} />
          </div>
        </aside>

        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">

          {!isHome && (
            <ContentHeader
              title={title}
              onToggleMenu={() => {
                setSidebarOpen(true);
                router.push("/app");
              }}
            />
          )}

          <div className="flex-1 overflow-auto">
            <div className="mx-auto h-full w-full max-w-6xl">
              {forbidden ? null : children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

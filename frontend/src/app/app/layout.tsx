"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import ContentHeader from "@/components/ContentHeader";
import Header from "@/components/Header";
import LoadingSpinner from "@/components/LoadingSpinner";
import ProfileModal from "@/components/ProfileModal";
import Sidebar from "@/components/Sidebar";
import { useUser } from "@/context/UserContext";
import { resolvePageTitle } from "@/lib/access";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    profile,
    hydrated,
    menu,
    sidebarOpen,
    setSidebarOpen,
    profileOpen,
  } = useUser();

  useEffect(() => {
    if (hydrated && !profile) router.replace("/login");
  }, [hydrated, profile, router]);

  if (!hydrated || !profile) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-canvas">
        <LoadingSpinner />
      </div>
    );
  }

  const isHome = pathname === "/app";
  const currentRoute = pathname.replace("/app/", "").split("/")[0];
  const title = resolvePageTitle(currentRoute);

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
            <Sidebar items={menu} onNavigate={() => setSidebarOpen(false)} />
          </div>
        </aside>

        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          {profileOpen && <ProfileModal />}

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
            <div className="mx-auto h-full w-full max-w-6xl">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}

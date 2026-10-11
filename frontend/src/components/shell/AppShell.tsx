"use client";

import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Breadcrumbs from "@/components/shell/Breadcrumbs";
import MobileNav from "@/components/shell/MobileNav";
import ShortcutsDialog from "@/components/shell/ShortcutsDialog";
import SideNav from "@/components/shell/SideNav";
import TopBar from "@/components/shell/TopBar";
import type { NavSection } from "@/config/navigation";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/cn";
import {
  SIDEBAR_STORAGE_KEY,
  buildBreadcrumbs,
  parseSidebarState,
  resolveShortcut,
  toggleSidebarState,
  type SidebarState,
} from "@/lib/shell";

interface AppShellProps {
  /** `null` while there are no modules to show (a person without profile). */
  sections: NavSection[] | null;
  user: { name: string; roleLabel: string } | null;
  onSignOut: () => void;
  children: ReactNode;
}

/**
 * The frame of the application: skip link, top bar, collapsible sidebar on
 * wide screens, a drawer on small ones, breadcrumbs and the content area.
 */
export default function AppShell({
  sections,
  user,
  onSignOut,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const hasNav = sections !== null;

  const [sidebar, setSidebar] = useState<SidebarState>("expanded");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  // Restore the remembered sidebar state.
  useEffect(() => {
    try {
      setSidebar(parseSidebarState(window.localStorage.getItem(SIDEBAR_STORAGE_KEY)));
    } catch {
      /* storage unavailable: start expanded */
    }
  }, []);

  const toggleMenu = useCallback(() => {
    if (!hasNav) return;
    if (isDesktop) {
      setSidebar((current) => {
        const next = toggleSidebarState(current);
        try {
          window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next);
        } catch {
          /* the choice still applies for this session */
        }
        return next;
      });
    } else {
      setDrawerOpen((open) => !open);
    }
  }, [hasNav, isDesktop]);

  // Keyboard shortcuts (never while typing or with a modifier key).
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const action = resolveShortcut(event, event.target as HTMLElement | null);
      if (action === "focus-search") {
        const search = mainRef.current?.querySelector<HTMLInputElement>(
          'input[type="search"]',
        );
        if (search) {
          event.preventDefault();
          search.focus();
        }
      } else if (action === "toggle-menu") {
        event.preventDefault();
        toggleMenu();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [toggleMenu]);

  // After a client-side navigation, move focus to the content so screen
  // readers announce the new page and keyboard users start at its top.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setDrawerOpen(false);
    mainRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  const collapsed = sidebar === "collapsed";
  const menuLabel = isDesktop
    ? collapsed
      ? "Expandir menu"
      : "Recolher menu"
    : "Abrir menu";

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-canvas">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[70] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-brand-700 focus:shadow-panel"
      >
        Ir para o conteúdo
      </a>

      <TopBar
        user={user}
        menuLabel={menuLabel}
        showMenuButton={hasNav}
        onMenu={toggleMenu}
        onShortcuts={() => setShortcutsOpen(true)}
        onSignOut={onSignOut}
      />

      <div className="flex min-h-0 flex-1">
        {hasNav && (
          <aside
            aria-label="Navegação"
            className={cn(
              "hidden shrink-0 overflow-y-auto border-r border-slate-200 bg-surface transition-[width] duration-200 lg:block",
              collapsed ? "w-[76px]" : "w-64",
            )}
          >
            <SideNav sections={sections} pathname={pathname} collapsed={collapsed} />
          </aside>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <Breadcrumbs crumbs={buildBreadcrumbs(pathname)} />
          <main
            id="content"
            ref={mainRef}
            tabIndex={-1}
            className="min-h-0 flex-1 overflow-y-auto focus:outline-none"
          >
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </div>

      {hasNav && (
        <MobileNav
          open={drawerOpen && !isDesktop}
          onOpenChange={setDrawerOpen}
          sections={sections}
          pathname={pathname}
        />
      )}
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}

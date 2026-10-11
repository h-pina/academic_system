"use client";

import Link from "next/link";
import NavIcon from "@/components/NavIcon";
import type { NavSection } from "@/config/navigation";
import { cn } from "@/lib/cn";
import { isActiveRoute } from "@/lib/shell";

interface SideNavProps {
  sections: NavSection[];
  pathname: string;
  /** Icons only; labels stay available to assistive technology and as tooltips. */
  collapsed?: boolean;
  onNavigate?: () => void;
}

/** The module list, grouped by purpose. Used by the sidebar and the mobile drawer. */
export default function SideNav({
  sections,
  pathname,
  collapsed = false,
  onNavigate,
}: SideNavProps) {
  return (
    <nav
      aria-label="Módulos"
      className={cn("flex flex-col gap-4 p-3", collapsed && "items-center")}
    >
      {sections.map((section, index) => (
        <div
          key={section.id}
          className={cn("flex w-full flex-col gap-1", collapsed && "items-center")}
        >
          {section.title &&
            (collapsed ? (
              index > 0 && <hr className="my-1 w-6 border-slate-200" aria-hidden="true" />
            ) : (
              <p className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {section.title}
              </p>
            ))}

          {section.items.map((item) => {
            const active = isActiveRoute(pathname, item.route);
            return (
              <Link
                key={item.route}
                href={`/app/${item.route}`}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                aria-label={collapsed ? item.label : undefined}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg text-sm font-medium no-underline transition-colors",
                  collapsed ? "h-11 w-11 justify-center" : "px-3 py-2.5",
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                )}
              >
                <NavIcon
                  name={item.icon}
                  className={cn(
                    "h-[18px] w-[18px] shrink-0",
                    active ? "text-brand-600" : "text-slate-400",
                  )}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      ))}

      {sections.length === 0 && (
        <p className="px-3 py-4 text-sm text-slate-500">
          Seu perfil não tem módulos disponíveis.
        </p>
      )}
    </nav>
  );
}

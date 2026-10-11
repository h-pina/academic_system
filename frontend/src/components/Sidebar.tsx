"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import NavIcon from "@/components/NavIcon";
import type { NavSection } from "@/config/navigation";

interface SidebarProps {
  sections: NavSection[];
  onNavigate?: () => void;
}

export default function Sidebar({ sections, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Módulos"
      className="flex h-full flex-col gap-5 overflow-y-auto bg-surface p-3"
    >
      {sections.map((section) => (
        <div key={section.id} className="flex flex-col gap-1">
          {section.title && (
            <p className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {section.title}
            </p>
          )}

          {section.items.map((item) => {
            const href = `/app/${item.route}`;
            const active = pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={item.route}
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium no-underline transition-colors ${
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <NavIcon
                  name={item.icon}
                  className={`h-4 w-4 shrink-0 ${
                    active ? "text-brand-600" : "text-slate-400"
                  }`}
                />
                <span className="truncate">{item.label}</span>
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

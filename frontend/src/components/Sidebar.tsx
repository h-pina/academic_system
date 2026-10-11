"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Building2,
  ClipboardList,
  GraduationCap,
  IdCard,
  Library,
  Presentation,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { MenuItem } from "@/types";

interface SidebarProps {
  items: MenuItem[];
  onNavigate?: () => void;
}

const ROUTE_ICONS: Record<string, LucideIcon> = {
  "register-users": Users,
  staff: IdCard,
  students: GraduationCap,
  teachers: Presentation,
  departments: Building2,
  courses: Library,
  subjects: BookOpen,
};

export default function Sidebar({ items, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto bg-surface p-3">
      <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
        Modules
      </p>

      {items.map((item) => {
        const href = `/app/${item.route}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const Icon = ROUTE_ICONS[item.route] ?? ClipboardList;

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
            <Icon
              className={`h-4 w-4 shrink-0 ${
                active ? "text-brand-600" : "text-slate-400"
              }`}
            />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}

      {items.length === 0 && (
        <p className="px-3 py-4 text-sm text-slate-500">
          Your role has no modules assigned.
        </p>
      )}
    </nav>
  );
}

"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Building2,
  ClipboardList,
  GraduationCap,
  Library,
  Presentation,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useUser } from "@/context/UserContext";

const ROUTE_META: Record<
  string,
  { icon: LucideIcon; description: string }
> = {
  "register-users": {
    icon: Users,
    description: "Cadastre e edite as pessoas que acessam o sistema.",
  },
  students: {
    icon: GraduationCap,
    description: "Consulte e cadastre alunos, cursos e situação acadêmica.",
  },
  teachers: {
    icon: Presentation,
    description: "Consulte e cadastre professores e seus departamentos.",
  },
  departments: {
    icon: Building2,
    description: "Departamentos acadêmicos, seus cursos e professores.",
  },
  courses: {
    icon: Library,
    description: "Cursos e a matriz curricular de cada um.",
  },
  subjects: {
    icon: BookOpen,
    description: "Disciplinas, cargas horárias e pré-requisitos.",
  },
};

export default function AppHomePage() {
  const { profile, roleName, menu } = useUser();

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-900">
          Welcome{profile ? `, ${profile.name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {roleName ? `Signed in as ${roleName}. ` : ""}
          Choose a module to get started.
        </p>
      </div>

      {menu.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-500">
          Your role has no modules assigned.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {menu.map((item) => {
            const meta = ROUTE_META[item.route];
            const Icon = meta?.icon ?? ClipboardList;
            return (
              <Link
                key={item.route}
                href={`/app/${item.route}`}
                className="card group flex flex-col gap-3 p-5 no-underline transition-shadow hover:shadow-panel"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-semibold text-slate-900">{item.label}</p>
                  {meta && (
                    <p className="mt-1 text-sm text-slate-500">
                      {meta.description}
                    </p>
                  )}
                </div>
                <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-brand-600">
                  Open
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

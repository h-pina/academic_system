"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
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
import { useUser } from "@/context/UserContext";
import { useApi } from "@/hooks/useApi";
import {
  institutionTiles,
  studentTiles,
  teacherTiles,
  type StatTile,
} from "@/lib/dashboard";
import { STUDENT_STATUS_LABELS } from "@/lib/labels";
import type { DashboardData } from "@/types";

const ROUTE_META: Record<string, { icon: LucideIcon; description: string }> = {
  "register-users": {
    icon: Users,
    description: "Cadastre e edite as pessoas que acessam o sistema.",
  },
  staff: {
    icon: IdCard,
    description: "Administradores e secretaria do sistema.",
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

function Tiles({ tiles }: { tiles: StatTile[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => (
        <div key={tile.label} className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {tile.label}
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{tile.value}</p>
        </div>
      ))}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function AppHomePage() {
  const { profile, roleName, menu } = useUser();
  const { request } = useApi();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const hasProfile = (profile?.roles.length ?? 0) > 0;

  useEffect(() => {
    if (!hasProfile) return;
    (async () => {
      const result = await request<DashboardData>("/dashboard", { silent: true });
      if (result.ok) setDashboard(result.data);
    })();
  }, [request, hasProfile]);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-900">
          Bem-vindo{profile ? `, ${profile.name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {roleName ? `Você entrou como ${roleName}.` : ""}
        </p>
      </div>

      {dashboard?.institution && (
        <Section title="Visão geral da instituição">
          <Tiles tiles={institutionTiles(dashboard.institution)} />

          {dashboard.institution.studentsByCourse.length > 0 && (
            <div className="card mt-4 overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Curso</th>
                    <th className="text-center">Alunos ativos</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.institution.studentsByCourse.map((row) => (
                    <tr key={row.courseId}>
                      <td>
                        <Link
                          href={`/app/courses/${row.courseId}/curriculum`}
                          className="font-medium text-slate-900 hover:text-brand-600"
                        >
                          {row.courseName}
                        </Link>
                      </td>
                      <td className="text-center">{row.activeStudents}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {dashboard?.teacher && (
        <Section title={`Meu departamento — ${dashboard.teacher.department.name}`}>
          <Tiles tiles={teacherTiles(dashboard.teacher)} />
          {dashboard.teacher.courses.length > 0 && (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {dashboard.teacher.courses.map((course) => (
                <li key={course.id}>
                  <Link
                    href={`/app/courses/${course.id}/curriculum`}
                    className="card flex items-center justify-between px-4 py-3 text-sm hover:shadow-panel"
                  >
                    <span className="font-medium text-slate-900">{course.name}</span>
                    <span className="text-slate-500">
                      {course.activeStudents} aluno
                      {course.activeStudents === 1 ? "" : "s"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {dashboard?.student && (
        <Section
          title={`Meu curso — ${dashboard.student.course.name} (${STUDENT_STATUS_LABELS[dashboard.student.status]})`}
        >
          <Tiles tiles={studentTiles(dashboard.student)} />
          <Link
            href={`/app/courses/${dashboard.student.course.id}/curriculum`}
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600"
          >
            Ver a matriz curricular <ArrowRight className="h-4 w-4" />
          </Link>
        </Section>
      )}

      <Section title="Módulos">
        {menu.length === 0 ? (
          <div className="card p-8 text-center text-sm text-slate-500">
            Seu perfil não tem módulos disponíveis.
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
                      <p className="mt-1 text-sm text-slate-500">{meta.description}</p>
                    )}
                  </div>
                  <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-brand-600">
                    Abrir
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

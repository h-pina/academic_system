"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import NavIcon from "@/components/NavIcon";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatTile } from "@/components/ui/StatTile";
import { useUser } from "@/context/UserContext";
import { useApi } from "@/hooks/useApi";
import {
  institutionTiles,
  studentTiles,
  teacherTiles,
  type StatTile as TileData,
} from "@/lib/dashboard";
import { STUDENT_STATUS_LABELS } from "@/lib/labels";
import type { DashboardData, InstitutionOverview } from "@/types";

const TONES = ["blue", "coral", "sun", "mint"] as const;

function Tiles({ tiles }: { tiles: TileData[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile, index) => (
        <StatTile
          key={tile.label}
          label={tile.label}
          value={tile.value}
          tone={TONES[index % TONES.length]}
        />
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

const COURSE_COLUMNS: Column<InstitutionOverview["studentsByCourse"][number]>[] = [
  {
    key: "course",
    header: "Curso",
    cell: (row) => (
      <Link
        href={`/app/courses/${row.courseId}/curriculum`}
        className="font-medium text-slate-900 no-underline hover:text-brand-600"
      >
        {row.courseName}
      </Link>
    ),
  },
  {
    key: "students",
    header: "Alunos ativos",
    align: "right",
    cell: (row) => <span className="tabular-nums">{row.activeStudents}</span>,
  },
];

export default function AppHomePage() {
  const { profile, roleName, navigation } = useUser();
  const { request } = useApi();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const hasProfile = (profile?.roles.length ?? 0) > 0;

  useEffect(() => {
    if (!hasProfile) {
      setLoading(false);
      return;
    }
    (async () => {
      const result = await request<DashboardData>("/dashboard", { silent: true });
      if (result.ok) setDashboard(result.data);
      setLoading(false);
    })();
  }, [request, hasProfile]);

  return (
    <div className="p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900">
          Bem-vindo{profile ? `, ${profile.name}` : ""}
        </h1>
        {roleName && (
          <p className="mt-1 text-sm text-slate-500">Você entrou como {roleName}.</p>
        )}
      </header>

      {loading && hasProfile && (
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      )}

      {dashboard?.institution && (
        <Section title="Visão geral da instituição">
          <Tiles tiles={institutionTiles(dashboard.institution)} />

          {dashboard.institution.studentsByCourse.length > 0 && (
            <Card className="mt-4 overflow-hidden">
              <DataTable
                caption="Alunos ativos por curso"
                columns={COURSE_COLUMNS}
                rows={dashboard.institution.studentsByCourse}
                getRowKey={(row) => row.courseId}
              />
            </Card>
          )}
        </Section>
      )}

      {dashboard?.teacher && (
        <Section title={`Meu departamento: ${dashboard.teacher.department.name}`}>
          <Tiles tiles={teacherTiles(dashboard.teacher)} />
          {dashboard.teacher.courses.length > 0 && (
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {dashboard.teacher.courses.map((course) => (
                <li key={course.id}>
                  <Link
                    href={`/app/courses/${course.id}/curriculum`}
                    className="flex items-center justify-between rounded-xl border border-slate-200 bg-surface px-4 py-3 text-sm no-underline shadow-card transition-shadow hover:shadow-panel"
                  >
                    <span className="font-medium text-slate-900">{course.name}</span>
                    <span className="text-slate-500">
                      {course.activeStudents} aluno{course.activeStudents === 1 ? "" : "s"}
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
          title={`Meu curso: ${dashboard.student.course.name} (${STUDENT_STATUS_LABELS[dashboard.student.status]})`}
        >
          <Tiles tiles={studentTiles(dashboard.student)} />
          <Link
            href="/app/my-course"
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            Ver o meu curso e a matriz <ArrowRight className="h-4 w-4" />
          </Link>
        </Section>
      )}

      <Section title="Módulos">
        {navigation.length === 0 ? (
          <Card className="p-8 text-center text-sm text-slate-500">
            Seu perfil não tem módulos disponíveis.
          </Card>
        ) : (
          <div className="space-y-6">
            {navigation.map((group) => (
              <div key={group.id}>
                {group.title && (
                  <h3 className="mb-3 text-sm font-semibold text-slate-600">{group.title}</h3>
                )}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.items.map((item) => (
                    <Link
                      key={item.route}
                      href={`/app/${item.route}`}
                      className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-surface p-5 no-underline shadow-card transition-shadow hover:shadow-panel"
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                        <NavIcon name={item.icon} className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">{item.label}</p>
                        <p className="mt-1 text-sm text-slate-500">{item.description}</p>
                      </div>
                      <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-brand-600">
                        Abrir
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

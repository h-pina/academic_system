"use client";

import Link from "next/link";
import PageHeading from "@/components/PageHeading";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatTile } from "@/components/ui/StatTile";
import { useAllItems } from "@/hooks/useAllItems";
import { useDashboard } from "@/hooks/useDashboard";
import { PROFILE_STATUS_LABELS, TEACHER_TITLE_LABELS, statusTone } from "@/lib/labels";
import type { TeacherView } from "@/types";

function Colleagues({ departmentId }: { departmentId: number }) {
  const { items, loading } = useAllItems<TeacherView>("/teachers", {
    departmentId,
  });

  if (loading) return <Skeleton className="h-32" />;
  if (items.length === 0) {
    return <EmptyState title="Nenhum professor neste departamento" />;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((teacher) => (
        <li key={teacher.userId} className="flex flex-wrap items-center gap-3 px-4 py-3">
          <Avatar name={teacher.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-slate-900">{teacher.name}</p>
            <p className="text-sm text-slate-500">
              {TEACHER_TITLE_LABELS[teacher.title]}
            </p>
          </div>
          <Badge tone={statusTone(teacher.status)}>
            {PROFILE_STATUS_LABELS[teacher.status]}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

export default function MyDepartmentPage() {
  const { data, loading, failed } = useDashboard();
  const overview = data?.teacher;

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="p-6">
        <PageHeading title="Meu departamento" />
        <div className="card">
          <EmptyState
            title={failed ? "Não foi possível carregar seu departamento" : "Departamento indisponível"}
            description="Tente novamente em instantes. Se o problema continuar, procure a secretaria."
          />
        </div>
      </div>
    );
  }

  const { department, courses } = overview;

  return (
    <div className="space-y-8 p-6">
      <PageHeading
        title={department.name}
        description={`Departamento ${department.code}`}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Professores ativos" value={department.activeTeachers} tone="blue" />
        <StatTile label="Alunos ativos" value={department.activeStudents} tone="mint" />
        <StatTile label="Cursos" value={courses.length} tone="sun" />
      </div>

      <section>
        <h2 className="mb-3 text-base">Cursos</h2>
        {courses.length === 0 ? (
          <div className="card">
            <EmptyState title="Este departamento ainda não tem cursos" />
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {courses.map((course) => (
              <li key={course.id}>
                <Link
                  href={`/app/courses/${course.id}/curriculum`}
                  className="card flex items-center justify-between px-4 py-3 text-sm no-underline hover:shadow-panel"
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
      </section>

      <section>
        <h2 className="mb-3 text-base">Colegas</h2>
        <div className="card overflow-hidden">
          <Colleagues departmentId={department.id} />
        </div>
      </section>
    </div>
  );
}

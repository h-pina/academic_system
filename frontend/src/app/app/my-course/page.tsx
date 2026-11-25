"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import CurriculumReadOnly from "@/components/curriculum/CurriculumReadOnly";
import NoStudentCourse from "@/components/NoStudentCourse";
import PageHeading from "@/components/PageHeading";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatTile } from "@/components/ui/StatTile";
import { useApi } from "@/hooks/useApi";
import { useDashboard } from "@/hooks/useDashboard";
import { curriculumProgress } from "@/lib/curriculum";
import { STUDENT_STATUS_LABELS, statusTone } from "@/lib/labels";
import type { CurriculumView, EnrollmentView } from "@/types";

/** The student's course and curriculum together, with their progress through it. */
export default function MyCoursePage() {
  const { request } = useApi();
  const { data, loading: dashboardLoading, failed } = useDashboard();
  const student = data?.student;
  const courseId = student?.course.id;

  const [curriculum, setCurriculum] = useState<CurriculumView | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId === undefined) return;
    (async () => {
      const [matrix, mine] = await Promise.all([
        request<CurriculumView>(`/courses/${courseId}/curriculum`, { silent: true }),
        request<EnrollmentView[]>("/enrollments/me", { silent: true }),
      ]);
      setCurriculum(matrix.ok ? matrix.data : null);
      setEnrollments(mine.ok ? mine.data : []);
      setLoading(false);
    })();
  }, [request, courseId]);

  const progress = useMemo(
    () => (curriculum ? curriculumProgress(curriculum.semesters, enrollments) : null),
    [curriculum, enrollments],
  );

  if (dashboardLoading || (courseId !== undefined && loading)) {
    return (
      <div className="p-6">
        <Skeleton className="mb-6 h-9 w-64" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-6">
        <PageHeading title="Meu curso" />
        <NoStudentCourse failed={failed} />
      </div>
    );
  }

  const { course } = student;

  return (
    <div className="p-6">
      <PageHeading
        title={course.name}
        description={`Departamento de ${course.departmentName} · código ${course.code}`}
        actions={
          <Badge tone={statusTone(student.status)}>
            {STUDENT_STATUS_LABELS[student.status]}
          </Badge>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Matrícula" value={student.registrationNumber ?? "—"} tone="blue" />
        <StatTile label="Ano de ingresso" value={student.entryYear} tone="coral" />
        <StatTile label="Semestres" value={course.totalSemesters} tone="sun" />
        <StatTile label="Carga horária da matriz" value={`${course.curriculumWorkloadHours} h`} tone="mint" />
      </div>

      <Link
        href="/app/my-course/subjects"
        className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
      >
        Ver lista de disciplinas <ArrowRight className="h-4 w-4" />
      </Link>

      {curriculum && progress && (
        <>
          <h2 className="mb-3 mt-8 text-lg font-bold text-slate-900">Meu progresso</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Carga horária cursada" value={`${progress.completedHours} h`} tone="mint" />
            <StatTile label="Carga horária restante" value={`${progress.remainingHours} h`} tone="coral" />
            <StatTile label="Em andamento" value={`${progress.inProgressHours} h`} tone="sun" />
            <StatTile label="Concluído" value={`${progress.percentCompleted}%`} tone="blue" />
          </div>
          <div
            role="progressbar"
            aria-label="Carga horária cursada"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percentCompleted}
            className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"
          >
            <div className="h-full bg-brand-600" style={{ width: `${progress.percentCompleted}%` }} />
          </div>

          <h2 className="mb-3 mt-8 text-lg font-bold text-slate-900">Minha matriz</h2>
          <p className="mb-3 text-sm text-slate-500">
            {curriculum.totalSemesters} semestres · {curriculum.totalWorkloadHours} h no total. A carga cursada
            considera só as disciplinas em que você foi aprovado.
          </p>
          <CurriculumReadOnly curriculum={curriculum} progress={progress.bySubject} />
        </>
      )}
    </div>
  );
}

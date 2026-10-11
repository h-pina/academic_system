"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import NoStudentCourse from "@/components/NoStudentCourse";
import PageHeading from "@/components/PageHeading";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatTile } from "@/components/ui/StatTile";
import { useDashboard } from "@/hooks/useDashboard";
import { STUDENT_STATUS_LABELS, statusTone } from "@/lib/labels";

export default function MyCoursePage() {
  const { data, loading, failed } = useDashboard();
  const student = data?.student;

  if (loading) {
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
        <StatTile
          label="Carga horária da matriz"
          value={`${course.curriculumWorkloadHours} h`}
          tone="mint"
        />
      </div>

      <Link
        href="/app/my-curriculum"
        className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
      >
        Ver a minha matriz <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

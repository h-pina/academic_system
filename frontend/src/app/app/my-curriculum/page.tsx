"use client";

import { useEffect, useState } from "react";
import CurriculumReadOnly from "@/components/curriculum/CurriculumReadOnly";
import NoStudentCourse from "@/components/NoStudentCourse";
import PageHeading from "@/components/PageHeading";
import { Skeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import { useDashboard } from "@/hooks/useDashboard";
import type { CurriculumView } from "@/types";

export default function MyCurriculumPage() {
  const { request } = useApi();
  const dashboard = useDashboard();
  const courseId = dashboard.data?.student?.course.id;

  const [curriculum, setCurriculum] = useState<CurriculumView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId === undefined) return;
    (async () => {
      const result = await request<CurriculumView>(
        `/courses/${courseId}/curriculum`,
        { silent: true },
      );
      setCurriculum(result.ok ? result.data : null);
      setLoading(false);
    })();
  }, [request, courseId]);

  if (dashboard.loading || (courseId !== undefined && loading)) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (courseId === undefined || !curriculum) {
    return (
      <div className="p-6">
        <PageHeading title="Minha matriz" />
        <NoStudentCourse failed={dashboard.failed} />
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeading
        title="Minha matriz"
        description={`${curriculum.courseName} · ${curriculum.totalSemesters} semestres · ${curriculum.totalWorkloadHours} h no total`}
      />
      <CurriculumReadOnly curriculum={curriculum} />
    </div>
  );
}

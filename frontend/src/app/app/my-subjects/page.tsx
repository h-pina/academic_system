"use client";

import { useEffect, useState } from "react";
import NoStudentCourse from "@/components/NoStudentCourse";
import PageHeading from "@/components/PageHeading";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import Pagination from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useDashboard } from "@/hooks/useDashboard";
import { usePagedList } from "@/hooks/usePagedList";
import type { SubjectView } from "@/types";

const PAGE_SIZE = 20;

const COLUMNS: Column<SubjectView>[] = [
  {
    key: "code",
    header: "Código",
    cell: (row) => <span className="font-mono text-xs text-slate-600">{row.code}</span>,
  },
  {
    key: "name",
    header: "Disciplina",
    cell: (row) => <span className="font-medium text-slate-900">{row.name}</span>,
  },
  {
    key: "hours",
    header: "Carga (h)",
    align: "center",
    cell: (row) => row.workloadHours,
  },
  {
    key: "prerequisites",
    header: "Pré-requisitos",
    cell: (row) =>
      row.prerequisites.length === 0 ? (
        <span className="text-slate-400">—</span>
      ) : (
        <span className="font-mono text-xs text-slate-600">
          {row.prerequisites.map((item) => item.code).join(", ")}
        </span>
      ),
  },
];

/** The catalogue is limited to the subjects of the student's own course. */
function CourseSubjects({ courseId, courseName }: { courseId: number; courseName: string }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search);

  const { items, total, loading } = usePagedList<SubjectView>(
    "/subjects",
    { q: debounced, courseId },
    page,
    PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [debounced]);

  return (
    <div className="p-6">
      <PageHeading
        title="Disciplinas do curso"
        description={`As disciplinas da matriz de ${courseName}.`}
      />

      <div className="mb-4 max-w-sm">
        <label className="sr-only" htmlFor="subject-search">
          Buscar disciplina
        </label>
        <Input
          id="subject-search"
          type="search"
          placeholder="Buscar por código ou nome"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="card overflow-hidden">
        <DataTable
          caption="Disciplinas do seu curso"
          columns={COLUMNS}
          rows={items}
          loading={loading}
          getRowKey={(row) => row.id}
          empty={
            <EmptyState
              title="Nenhuma disciplina encontrada"
              description={
                debounced
                  ? "Nenhuma disciplina do seu curso corresponde à busca."
                  : "A matriz do seu curso ainda não tem disciplinas."
              }
            />
          }
        />
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
      </div>
    </div>
  );
}

export default function MySubjectsPage() {
  const { data, loading, failed } = useDashboard();
  const course = data?.student?.course;

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="p-6">
        <PageHeading title="Disciplinas do curso" />
        <NoStudentCourse failed={failed} />
      </div>
    );
  }

  return <CourseSubjects courseId={course.id} courseName={course.name} />;
}

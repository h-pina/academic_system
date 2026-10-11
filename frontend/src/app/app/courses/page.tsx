"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Library, ListTree, Pencil, Plus, Trash2 } from "lucide-react";
import CourseFormModal, {
  type CourseSavePayload,
} from "@/components/courses/CourseFormModal";
import PageHeading from "@/components/PageHeading";
import { StatusBadge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchFilter, SelectFilter } from "@/components/ui/Filters";
import Pagination from "@/components/ui/Pagination";
import { useMessage } from "@/context/MessageContext";
import { useApi } from "@/hooks/useApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePagedList } from "@/hooks/usePagedList";
import { usePermissions } from "@/hooks/usePermissions";
import { COURSE_STATUS_LABELS, statusTone, toOptions } from "@/lib/labels";
import type { CourseView, Department } from "@/types";

const PAGE_SIZE = 20;

export default function CoursesPage() {
  const { request } = useApi();
  const { showMessage } = useMessage();
  const { isAdmin, canManage } = usePermissions();

  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState<{ course: CourseView | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [toRemove, setToRemove] = useState<CourseView | null>(null);

  const { items, total, loading, reload } = usePagedList<CourseView>(
    "/courses",
    { q: debouncedSearch, departmentId, status },
    page,
    PAGE_SIZE,
  );

  useEffect(() => {
    (async () => {
      const result = await request<Department[]>("/departments");
      if (result.ok) setDepartments(result.data);
    })();
  }, [request]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, departmentId, status]);

  const filtered = Boolean(debouncedSearch || departmentId || status);

  const handleSave = async (payload: CourseSavePayload) => {
    const editing = form?.course ?? null;
    setSaving(true);
    const result = await request(editing ? `/courses/${editing.id}` : "/courses", {
      method: editing ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    });
    setSaving(false);

    if (result.ok) {
      showMessage({
        type: "SUCCESS",
        messages: [editing ? "Curso atualizado." : "Curso cadastrado."],
      });
      setForm(null);
      reload();
    }
  };

  const handleRemove = async () => {
    if (!toRemove) return;
    const target = toRemove;
    setToRemove(null);

    const result = await request(`/courses/${target.id}`, { method: "DELETE" });
    if (result.ok) {
      showMessage({ type: "SUCCESS", messages: ["Curso excluído."] });
      reload();
    }
  };

  const columns: Column<CourseView>[] = [
    {
      key: "code",
      header: "Código",
      cell: (row) => <span className="font-mono text-xs text-slate-600">{row.code}</span>,
    },
    {
      key: "name",
      header: "Curso",
      cell: (row) => <span className="font-medium text-slate-900">{row.name}</span>,
    },
    { key: "department", header: "Departamento", cell: (row) => row.departmentName },
    { key: "semesters", header: "Semestres", align: "center", cell: (row) => row.totalSemesters },
    { key: "students", header: "Alunos", align: "center", cell: (row) => row.studentCount },
    {
      key: "status",
      header: "Situação",
      cell: (row) => (
        <StatusBadge label={COURSE_STATUS_LABELS[row.status]} tone={statusTone(row.status)} />
      ),
    },
    {
      key: "actions",
      header: "Ações",
      align: "center",
      className: "w-36",
      cell: (row) => (
        <span className="flex items-center justify-center gap-1">
          <Link
            href={`/app/courses/${row.id}/curriculum`}
            aria-label={`Ver a matriz curricular de ${row.name}`}
            title="Ver matriz curricular"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-brand-600"
          >
            <ListTree className="h-4 w-4" />
          </Link>
          {canManage && (
            <IconButton label={`Editar ${row.name}`} onClick={() => setForm({ course: row })}>
              <Pencil className="h-4 w-4" />
            </IconButton>
          )}
          {isAdmin && (
            <IconButton
              label={`Excluir ${row.name}`}
              onClick={() => setToRemove(row)}
              className="hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </IconButton>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeading
        title="Cursos e matrizes"
        description="Cursos por departamento e a matriz curricular de cada um."
        actions={
          canManage && (
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setForm({ course: null })}>
              Novo curso
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchFilter placeholder="Nome ou código" value={search} onChange={setSearch} />
        <SelectFilter
          label="Departamento"
          value={departmentId}
          onChange={setDepartmentId}
          options={departments.map((department) => ({
            value: department.id,
            label: department.name,
          }))}
        />
        <SelectFilter
          label="Situação"
          value={status}
          onChange={setStatus}
          allLabel="Todas"
          options={toOptions(COURSE_STATUS_LABELS)}
        />
      </div>

      <Card className="overflow-hidden">
        <DataTable
          caption="Cursos"
          columns={columns}
          rows={items}
          loading={loading}
          getRowKey={(row) => row.id}
          empty={
            <EmptyState
              icon={<Library className="h-5 w-5" />}
              title="Nenhum curso encontrado"
              description={
                filtered
                  ? "Nenhum curso corresponde aos filtros. Limpe a busca ou escolha outra situação."
                  : canManage
                    ? "Cadastre o primeiro curso para montar a matriz curricular."
                    : "Ainda não há cursos cadastrados."
              }
            />
          }
        />
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
      </Card>

      {form && (
        <CourseFormModal
          course={form.course}
          departments={departments}
          loading={saving}
          onClose={() => setForm(null)}
          onSave={handleSave}
        />
      )}

      <ConfirmDialog
        open={toRemove !== null}
        title="Excluir curso"
        message={`O curso "${toRemove?.name}" e a sua matriz curricular serão excluídos. Isso só é possível se não houver alunos; caso contrário, inative o curso.`}
        onConfirm={handleRemove}
        onClose={() => setToRemove(null)}
      />
    </div>
  );
}

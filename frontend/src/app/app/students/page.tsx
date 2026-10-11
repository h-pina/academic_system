"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, UserX } from "lucide-react";
import PageHeading from "@/components/PageHeading";
import StudentFormModal, {
  type StudentSavePayload,
} from "@/components/students/StudentFormModal";
import { Avatar } from "@/components/ui/Avatar";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchFilter, SelectFilter } from "@/components/ui/Filters";
import Pagination from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/Badge";
import { useMessage } from "@/context/MessageContext";
import { useApi } from "@/hooks/useApi";
import { useAllItems } from "@/hooks/useAllItems";
import { useListState } from "@/hooks/useListState";
import { usePagedList } from "@/hooks/usePagedList";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCpf } from "@/lib/format";
import type { FieldErrors } from "@/lib/fieldErrors";
import { STUDENT_STATUS_LABELS, statusTone, toOptions } from "@/lib/labels";
import type { CourseView, StudentView } from "@/types";

const PAGE_SIZE = 20;
const SORT_FIELDS = ["name", "registrationNumber", "course", "entryYear", "status"] as const;

export default function StudentsPage() {
  const { request } = useApi();
  const { showMessage } = useMessage();
  const { isAdmin, canManage } = usePermissions();

  const list = useListState({ q: "", courseId: "", status: "" }, SORT_FIELDS);
  const { filters, page, sort } = list;

  const [form, setForm] = useState<{ student: StudentView | null } | null>(null);
  const [formErrors, setFormErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [toRemove, setToRemove] = useState<StudentView | null>(null);

  const courses = useAllItems<CourseView>("/courses");
  const { items, total, loading, reload } = usePagedList<StudentView>(
    "/students",
    list.requestParams,
    page,
    PAGE_SIZE,
    list.ready,
  );

  const openForm = (student: StudentView | null) => {
    setFormErrors({});
    setForm({ student });
  };

  const handleSave = async (payload: StudentSavePayload) => {
    const editing = form?.student ?? null;
    setSaving(true);
    const result = editing
      ? await request(`/students/${editing.userId}`, {
          method: "PATCH",
          fieldErrors: true,
          body: JSON.stringify({
            courseId: payload.courseId,
            entryYear: payload.entryYear,
            status: payload.status,
          }),
        })
      : await request("/students", {
          method: "POST",
          fieldErrors: true,
          body: JSON.stringify(payload),
        });
    setSaving(false);

    if (!result.ok) {
      setFormErrors(result.fieldErrors ?? {});
      return;
    }

    showMessage({
      type: "SUCCESS",
      messages: [editing ? "Aluno atualizado." : "Aluno cadastrado."],
    });
    setForm(null);
    reload();
  };

  const handleRemove = async () => {
    if (!toRemove) return;
    const target = toRemove;
    setToRemove(null);

    const result = await request(`/students/${target.userId}`, { method: "DELETE" });
    if (result.ok) {
      showMessage({ type: "SUCCESS", messages: ["Vínculo de aluno removido."] });
      reload();
    }
  };

  const columns: Column<StudentView>[] = [
    {
      key: "student",
      sortKey: "name",
      header: "Aluno",
      cell: (row) => (
        <span className="flex items-center gap-3">
          <Avatar name={row.name} size="sm" />
          <span className="font-medium text-slate-900">{row.name}</span>
        </span>
      ),
    },
    {
      key: "registration",
      sortKey: "registrationNumber",
      header: "Matrícula",
      cell: (row) => (
        <span className="font-mono text-xs tabular-nums text-slate-600">
          {row.registrationNumber ?? "—"}
        </span>
      ),
    },
    {
      key: "cpf",
      header: "CPF",
      cell: (row) => (
        <span className="font-mono text-xs tabular-nums text-slate-600">
          {formatCpf(row.cpf)}
        </span>
      ),
    },
    { key: "course", sortKey: "course", header: "Curso", cell: (row) => row.courseName },
    { key: "entry", sortKey: "entryYear", header: "Ingresso", cell: (row) => row.entryYear },
    {
      key: "status",
      sortKey: "status",
      header: "Situação",
      cell: (row) => (
        <StatusBadge label={STUDENT_STATUS_LABELS[row.status]} tone={statusTone(row.status)} />
      ),
    },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "Ações",
            align: "center" as const,
            className: "w-28",
            cell: (row: StudentView) => (
              <span className="flex items-center justify-center gap-1">
                <IconButton label={`Editar ${row.name}`} onClick={() => openForm(row)}>
                  <Pencil className="h-4 w-4" />
                </IconButton>
                {isAdmin && (
                  <IconButton
                    label={`Remover vínculo de aluno de ${row.name}`}
                    onClick={() => setToRemove(row)}
                    className="hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                )}
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="p-6">
      <PageHeading
        title="Alunos"
        description="Consulte alunos e acompanhe curso, matrícula e situação acadêmica."
        actions={
          canManage && (
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => openForm(null)}>
              Novo aluno
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchFilter
          placeholder="Nome, matrícula ou CPF"
          value={filters.q}
          onChange={(value) => list.setFilter("q", value)}
        />
        <SelectFilter
          label="Curso"
          value={filters.courseId}
          onChange={(value) => list.setFilter("courseId", value)}
          options={courses.items.map((course) => ({ value: course.id, label: course.name }))}
        />
        <SelectFilter
          label="Situação"
          value={filters.status}
          onChange={(value) => list.setFilter("status", value)}
          allLabel="Todas"
          options={toOptions(STUDENT_STATUS_LABELS)}
        />
      </div>

      <Card className="overflow-hidden">
        <DataTable
          caption="Alunos"
          columns={columns}
          rows={items}
          loading={loading}
          getRowKey={(row) => row.userId}
          sort={sort}
          onSortChange={list.setSort}
          empty={
            <EmptyState
              icon={<UserX className="h-5 w-5" />}
              title="Nenhum aluno encontrado"
              description={
                list.isFiltered
                  ? "Nenhum aluno corresponde aos filtros. Limpe a busca ou escolha outra situação."
                  : canManage
                    ? "Cadastre o primeiro aluno para começar."
                    : "Ainda não há alunos cadastrados."
              }
            />
          }
        />
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={list.setPage} />
      </Card>

      {form && (
        <StudentFormModal
          student={form.student}
          courses={courses.items.filter(
            (course) => course.status === "active" || course.id === form.student?.courseId,
          )}
          loading={saving}
          errors={formErrors}
          onClose={() => setForm(null)}
          onSave={handleSave}
        />
      )}

      <ConfirmDialog
        open={toRemove !== null}
        title="Remover vínculo de aluno"
        message={`O vínculo de aluno de "${toRemove?.name}" será removido. A pessoa continua cadastrada; para encerrar o vínculo preservando o histórico, altere a situação em vez de remover.`}
        confirmLabel="Remover"
        onConfirm={handleRemove}
        onClose={() => setToRemove(null)}
      />
    </div>
  );
}

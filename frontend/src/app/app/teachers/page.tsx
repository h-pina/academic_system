"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, UserX } from "lucide-react";
import PageHeading from "@/components/PageHeading";
import TeacherFormModal, {
  type TeacherSavePayload,
} from "@/components/teachers/TeacherFormModal";
import { Avatar } from "@/components/ui/Avatar";
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
import { formatCpf } from "@/lib/format";
import {
  PROFILE_STATUS_LABELS,
  TEACHER_TITLE_LABELS,
  statusTone,
  toOptions,
} from "@/lib/labels";
import type { Department, TeacherView } from "@/types";

const PAGE_SIZE = 20;

export default function TeachersPage() {
  const { request } = useApi();
  const { showMessage } = useMessage();
  const { isAdmin, canManage } = usePermissions();

  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState<{ teacher: TeacherView | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [toRemove, setToRemove] = useState<TeacherView | null>(null);

  const { items, total, loading, reload } = usePagedList<TeacherView>(
    "/teachers",
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

  const handleSave = async (payload: TeacherSavePayload) => {
    const editing = form?.teacher ?? null;
    setSaving(true);
    const result = editing
      ? await request(`/teachers/${editing.userId}`, {
          method: "PATCH",
          body: JSON.stringify({
            departmentId: payload.departmentId,
            title: payload.title,
            status: payload.status,
          }),
        })
      : await request("/teachers", { method: "POST", body: JSON.stringify(payload) });
    setSaving(false);

    if (result.ok) {
      showMessage({
        type: "SUCCESS",
        messages: [editing ? "Professor atualizado." : "Professor cadastrado."],
      });
      setForm(null);
      reload();
    }
  };

  const handleRemove = async () => {
    if (!toRemove) return;
    const target = toRemove;
    setToRemove(null);

    const result = await request(`/teachers/${target.userId}`, { method: "DELETE" });
    if (result.ok) {
      showMessage({ type: "SUCCESS", messages: ["Vínculo de professor removido."] });
      reload();
    }
  };

  const columns: Column<TeacherView>[] = [
    {
      key: "teacher",
      header: "Professor",
      cell: (row) => (
        <span className="flex items-center gap-3">
          <Avatar name={row.name} size="sm" />
          <span className="font-medium text-slate-900">{row.name}</span>
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
    { key: "email", header: "E-mail", cell: (row) => row.email },
    { key: "department", header: "Departamento", cell: (row) => row.departmentName },
    { key: "title", header: "Titulação", cell: (row) => TEACHER_TITLE_LABELS[row.title] },
    {
      key: "status",
      header: "Situação",
      cell: (row) => (
        <StatusBadge label={PROFILE_STATUS_LABELS[row.status]} tone={statusTone(row.status)} />
      ),
    },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "Ações",
            align: "center" as const,
            className: "w-28",
            cell: (row: TeacherView) => (
              <span className="flex items-center justify-center gap-1">
                <IconButton label={`Editar ${row.name}`} onClick={() => setForm({ teacher: row })}>
                  <Pencil className="h-4 w-4" />
                </IconButton>
                {isAdmin && (
                  <IconButton
                    label={`Remover vínculo de professor de ${row.name}`}
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
        title="Professores"
        description="Consulte professores, departamentos e titulação."
        actions={
          canManage && (
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setForm({ teacher: null })}>
              Novo professor
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchFilter placeholder="Nome ou CPF" value={search} onChange={setSearch} />
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
          options={toOptions(PROFILE_STATUS_LABELS)}
        />
      </div>

      <Card className="overflow-hidden">
        <DataTable
          caption="Professores"
          columns={columns}
          rows={items}
          loading={loading}
          getRowKey={(row) => row.userId}
          empty={
            <EmptyState
              icon={<UserX className="h-5 w-5" />}
              title="Nenhum professor encontrado"
              description={
                filtered
                  ? "Nenhum professor corresponde aos filtros. Limpe a busca ou escolha outra situação."
                  : canManage
                    ? "Cadastre o primeiro professor para começar."
                    : "Ainda não há professores cadastrados."
              }
            />
          }
        />
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
      </Card>

      {form && (
        <TeacherFormModal
          teacher={form.teacher}
          departments={departments}
          loading={saving}
          onClose={() => setForm(null)}
          onSave={handleSave}
        />
      )}

      <ConfirmDialog
        open={toRemove !== null}
        title="Remover vínculo de professor"
        message={`O vínculo de professor de "${toRemove?.name}" será removido. A pessoa continua cadastrada; para encerrar o vínculo preservando o histórico, altere a situação em vez de remover.`}
        confirmLabel="Remover"
        onConfirm={handleRemove}
        onClose={() => setToRemove(null)}
      />
    </div>
  );
}

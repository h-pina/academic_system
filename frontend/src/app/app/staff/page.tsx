"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2, UserX } from "lucide-react";
import PageHeading from "@/components/PageHeading";
import StaffFormModal, {
  type StaffSavePayload,
} from "@/components/staff/StaffFormModal";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchFilter } from "@/components/ui/Filters";
import Pagination from "@/components/ui/Pagination";
import { useMessage } from "@/context/MessageContext";
import { useApi } from "@/hooks/useApi";
import { useListState } from "@/hooks/useListState";
import { usePagedList } from "@/hooks/usePagedList";
import type { FieldErrors } from "@/lib/fieldErrors";
import { formatCpf } from "@/lib/format";
import { PROFILE_STATUS_LABELS, STAFF_ROLE_LABELS, statusTone } from "@/lib/labels";
import type { StaffView } from "@/types";

const PAGE_SIZE = 20;
const SORT_FIELDS = ["name", "role", "status"] as const;

export default function StaffPage() {
  const { request } = useApi();
  const { showMessage } = useMessage();

  const list = useListState({ q: "" }, SORT_FIELDS);
  const { filters, page, sort } = list;

  const [form, setForm] = useState<{ staff: StaffView | null } | null>(null);
  const [formErrors, setFormErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [toRemove, setToRemove] = useState<StaffView | null>(null);

  const { items, total, loading, reload } = usePagedList<StaffView>(
    "/staff",
    list.requestParams,
    page,
    PAGE_SIZE,
    list.ready,
  );

  const openForm = (staff: StaffView | null) => {
    setFormErrors({});
    setForm({ staff });
  };

  const handleSave = async (payload: StaffSavePayload) => {
    const editing = form?.staff ?? null;
    setSaving(true);
    const result = editing
      ? await request(`/staff/${editing.userId}`, {
          method: "PATCH",
          fieldErrors: true,
          body: JSON.stringify({ role: payload.role, status: payload.status }),
        })
      : await request("/staff", {
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
      messages: [editing ? "Funcionário atualizado." : "Funcionário cadastrado."],
    });
    setForm(null);
    reload();
  };

  const handleRemove = async () => {
    if (!toRemove) return;
    const target = toRemove;
    setToRemove(null);

    const result = await request(`/staff/${target.userId}`, { method: "DELETE" });
    if (result.ok) {
      showMessage({ type: "SUCCESS", messages: ["Vínculo administrativo removido."] });
      reload();
    }
  };

  const columns: Column<StaffView>[] = [
    {
      key: "member",
      sortKey: "name",
      header: "Funcionário",
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
    { key: "role", sortKey: "role", header: "Papel", cell: (row) => STAFF_ROLE_LABELS[row.role] },
    {
      key: "status",
      sortKey: "status",
      header: "Situação",
      cell: (row) => (
        <StatusBadge label={PROFILE_STATUS_LABELS[row.status]} tone={statusTone(row.status)} />
      ),
    },
    {
      key: "actions",
      header: "Ações",
      align: "center",
      className: "w-28",
      cell: (row) => (
        <span className="flex items-center justify-center gap-1">
          <IconButton label={`Editar ${row.name}`} onClick={() => openForm(row)}>
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton
            label={`Remover vínculo administrativo de ${row.name}`}
            onClick={() => setToRemove(row)}
            className="hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </span>
      ),
    },
  ];

  return (
    <div className="p-6">
      <PageHeading
        title="Funcionários"
        description="Administradores e secretaria com acesso ao sistema."
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => openForm(null)}>
            Novo funcionário
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchFilter
          placeholder="Nome ou CPF"
          value={filters.q}
          onChange={(value) => list.setFilter("q", value)}
        />
      </div>

      <Card className="overflow-hidden">
        <DataTable
          caption="Funcionários"
          columns={columns}
          rows={items}
          loading={loading}
          getRowKey={(row) => row.userId}
          sort={sort}
          onSortChange={list.setSort}
          empty={
            <EmptyState
              icon={<UserX className="h-5 w-5" />}
              title="Nenhum funcionário encontrado"
              description={
                filters.q
                  ? "Nenhum funcionário corresponde à busca."
                  : "Cadastre o primeiro funcionário para começar."
              }
            />
          }
        />
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={list.setPage} />
      </Card>

      {form && (
        <StaffFormModal
          staff={form.staff}
          loading={saving}
          errors={formErrors}
          onClose={() => setForm(null)}
          onSave={handleSave}
        />
      )}

      <ConfirmDialog
        open={toRemove !== null}
        title="Remover vínculo administrativo"
        message={`O vínculo administrativo de "${toRemove?.name}" será removido e a pessoa continua cadastrada. Não é possível remover você mesmo nem o último administrador ativo.`}
        confirmLabel="Remover"
        onConfirm={handleRemove}
        onClose={() => setToRemove(null)}
      />
    </div>
  );
}

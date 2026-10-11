"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2, UserX } from "lucide-react";
import PageHeading from "@/components/PageHeading";
import UserFormModal, { type UserDraft } from "@/components/users/UserFormModal";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchFilter } from "@/components/ui/Filters";
import { useMessage } from "@/context/MessageContext";
import { useApi } from "@/hooks/useApi";
import { ROLE_LABELS } from "@/lib/access";
import type { FieldErrors } from "@/lib/fieldErrors";
import { formatCpf } from "@/lib/format";
import type { User } from "@/types";

export default function RegisterUsersPage() {
  const { request } = useApi();
  const { showMessage } = useMessage();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ user: User | null } | null>(null);
  const [formErrors, setFormErrors] = useState<FieldErrors>({});
  const [toDelete, setToDelete] = useState<User | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await request<User[]>("/users");
    setUsers(result.ok ? result.data : []);
    setLoading(false);
  }, [request]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return users;
    const digits = needle.replace(/\D/g, "");
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(needle) ||
        user.email.toLowerCase().includes(needle) ||
        (digits !== "" &&
          (user.cpf.includes(digits) || (user.registrationNumber ?? "").includes(digits))),
    );
  }, [users, search]);

  const handleSave = async (draft: UserDraft) => {
    const editing = form?.user ?? null;
    setSaving(true);
    const result = editing
      ? await request(`/users/${editing.cpf}`, {
          method: "PUT",
          fieldErrors: true,
          body: JSON.stringify({ name: draft.name, email: draft.email }),
        })
      : await request("/users", {
          method: "POST",
          fieldErrors: true,
          body: JSON.stringify({
            cpf: draft.cpf,
            name: draft.name,
            email: draft.email,
            ...(draft.password ? { password: draft.password } : {}),
          }),
        });
    setSaving(false);

    if (!result.ok) {
      setFormErrors(result.fieldErrors ?? {});
      return;
    }

    showMessage({
      type: "SUCCESS",
      messages: [editing ? "Usuário atualizado." : "Usuário cadastrado."],
    });
    setForm(null);
    load();
  };

  const openForm = (user: User | null) => {
    setFormErrors({});
    setForm({ user });
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    const target = toDelete;
    setToDelete(null);

    const result = await request(`/users/${target.cpf}`, { method: "DELETE" });
    if (result.ok) {
      showMessage({ type: "SUCCESS", messages: ["Usuário excluído."] });
      load();
    }
  };

  const columns: Column<User>[] = [
    {
      key: "person",
      header: "Pessoa",
      cell: (row) => (
        <span className="flex items-center gap-3">
          <Avatar name={row.name} size="sm" />
          <span>
            <span className="block font-medium text-slate-900">{row.name}</span>
            <span className="block text-xs text-slate-500">{row.email}</span>
          </span>
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
    {
      key: "registration",
      header: "Matrícula",
      cell: (row) => (
        <span className="font-mono text-xs tabular-nums text-slate-600">
          {row.registrationNumber ?? "—"}
        </span>
      ),
    },
    {
      key: "roles",
      header: "Perfis",
      cell: (row) => (
        <span className="flex flex-wrap gap-1">
          {row.roles.length === 0 && <Badge tone="warning">Sem vínculo</Badge>}
          {row.roles.map((role) => (
            <Badge key={role} tone="neutral">
              {ROLE_LABELS[role]}
            </Badge>
          ))}
        </span>
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
            label={`Excluir ${row.name}`}
            onClick={() => setToDelete(row)}
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
        title="Usuários"
        description="Pessoas com acesso ao sistema, inclusive as que ainda não têm vínculo."
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => openForm(null)}>
            Novo usuário
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchFilter
          placeholder="Nome, e-mail, CPF ou matrícula"
          value={search}
          onChange={setSearch}
        />
        <p className="pb-2 text-sm text-slate-500">
          {visible.length} usuário{visible.length === 1 ? "" : "s"}
        </p>
      </div>

      <Card className="overflow-hidden">
        <DataTable
          caption="Usuários"
          columns={columns}
          rows={visible}
          loading={loading}
          getRowKey={(row) => row.id}
          empty={
            <EmptyState
              icon={<UserX className="h-5 w-5" />}
              title="Nenhum usuário encontrado"
              description={
                search
                  ? "Nenhum usuário corresponde à busca."
                  : "Cadastre o primeiro usuário para começar."
              }
            />
          }
        />
      </Card>

      {form && (
        <UserFormModal
          user={form.user}
          loading={saving}
          errors={formErrors}
          onClose={() => setForm(null)}
          onSave={handleSave}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Excluir usuário"
        message={`O usuário "${toDelete?.name}" e os vínculos dele serão excluídos. Esta ação não pode ser desfeita.`}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}

"use client";

import { useState } from "react";
import Button from "@/components/Button";
import ConfirmModal from "@/components/ConfirmModal";
import Pagination from "@/components/Pagination";
import StaffFormModal, {
  type StaffSavePayload,
} from "@/components/staff/StaffFormModal";
import StatusBadge from "@/components/StatusBadge";
import { useMessage } from "@/context/MessageContext";
import { useApi } from "@/hooks/useApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePagedList } from "@/hooks/usePagedList";
import { formatCpf } from "@/lib/format";
import {
  PROFILE_STATUS_LABELS,
  STAFF_ROLE_LABELS,
  statusTone,
} from "@/lib/labels";
import { useEffect } from "react";
import type { StaffView } from "@/types";

const PAGE_SIZE = 20;

export default function StaffPage() {
  const { request } = useApi();
  const { showMessage } = useMessage();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const [form, setForm] = useState<{ staff: StaffView | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [toRemove, setToRemove] = useState<StaffView | null>(null);

  const { items, total, loading, reload } = usePagedList<StaffView>(
    "/staff",
    { q: debouncedSearch },
    page,
    PAGE_SIZE,
  );

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const handleSave = async (payload: StaffSavePayload) => {
    const editing = form?.staff ?? null;
    setSaving(true);
    const result = editing
      ? await request(`/staff/${editing.userId}`, {
          method: "PATCH",
          body: JSON.stringify({ role: payload.role, status: payload.status }),
        })
      : await request("/staff", {
          method: "POST",
          body: JSON.stringify(payload),
        });
    setSaving(false);

    if (result.ok) {
      showMessage({
        type: "SUCCESS",
        messages: [editing ? "Funcionário atualizado." : "Funcionário cadastrado."],
      });
      setForm(null);
      reload();
    }
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

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="min-w-[14rem] flex-1">
          <span className="field-label">Buscar</span>
          <input
            type="search"
            className="field-input"
            placeholder="Nome ou CPF"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <Button
          label="Novo funcionário"
          variant="add"
          onClick={() => setForm({ staff: null })}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th>E-mail</th>
                <th>Papel</th>
                <th>Situação</th>
                <th className="w-28 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((member) => (
                <tr key={member.userId}>
                  <td className="font-medium text-slate-900">{member.name}</td>
                  <td className="font-mono text-xs text-slate-600">
                    {formatCpf(member.cpf)}
                  </td>
                  <td>{member.email}</td>
                  <td>{STAFF_ROLE_LABELS[member.role]}</td>
                  <td>
                    <StatusBadge
                      label={PROFILE_STATUS_LABELS[member.status]}
                      tone={statusTone(member.status)}
                    />
                  </td>
                  <td>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="edit"
                        hint="Editar funcionário"
                        onClick={() => setForm({ staff: member })}
                      />
                      <Button
                        variant="delete"
                        hint="Remover vínculo administrativo"
                        onClick={() => setToRemove(member)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-slate-400"
                  >
                    Nenhum funcionário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onChange={setPage}
        />
      </div>

      {form && (
        <StaffFormModal
          staff={form.staff}
          loading={saving}
          onClose={() => setForm(null)}
          onSave={handleSave}
        />
      )}

      <ConfirmModal
        open={toRemove !== null}
        title="Remover vínculo administrativo"
        message={`Remover o vínculo administrativo de "${toRemove?.name}"? A pessoa continua cadastrada. Não é possível remover você mesmo nem o último administrador ativo.`}
        confirmLabel="Remover"
        onConfirm={handleRemove}
        onClose={() => setToRemove(null)}
      />
    </div>
  );
}

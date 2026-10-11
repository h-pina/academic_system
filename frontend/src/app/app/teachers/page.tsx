"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Pagination from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/Badge";
import TeacherFormModal, {
  type TeacherSavePayload,
} from "@/components/teachers/TeacherFormModal";
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
import type { Department, ProfileStatus, TeacherView } from "@/types";

const PAGE_SIZE = 20;

export default function TeachersPage() {
  const { request } = useApi();
  const { showMessage } = useMessage();
  const { isAdmin, canManage } = usePermissions();

  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState<ProfileStatus | "">("");
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
      : await request("/teachers", {
          method: "POST",
          body: JSON.stringify(payload),
        });
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

    const result = await request(`/teachers/${target.userId}`, {
      method: "DELETE",
    });
    if (result.ok) {
      showMessage({
        type: "SUCCESS",
        messages: ["Vínculo de professor removido."],
      });
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

        <label>
          <span className="field-label">Departamento</span>
          <select
            className="field-input"
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
          >
            <option value="">Todos</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="field-label">Situação</span>
          <select
            className="field-input"
            value={status}
            onChange={(event) => setStatus(event.target.value as ProfileStatus | "")}
          >
            <option value="">Todas</option>
            {toOptions(PROFILE_STATUS_LABELS).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {canManage && (
          <Button
            label="Novo professor"
            variant="add"
            onClick={() => setForm({ teacher: null })}
          />
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>CPF</th>
                <th>E-mail</th>
                <th>Departamento</th>
                <th>Titulação</th>
                <th>Situação</th>
                {canManage && <th className="w-28 text-center">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((teacher) => (
                <tr key={teacher.userId}>
                  <td className="font-medium text-slate-900">{teacher.name}</td>
                  <td className="font-mono text-xs text-slate-600">
                    {formatCpf(teacher.cpf)}
                  </td>
                  <td>{teacher.email}</td>
                  <td>{teacher.departmentName}</td>
                  <td>{TEACHER_TITLE_LABELS[teacher.title]}</td>
                  <td>
                    <StatusBadge
                      label={PROFILE_STATUS_LABELS[teacher.status]}
                      tone={statusTone(teacher.status)}
                    />
                  </td>
                  {canManage && (
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="edit"
                          hint="Editar professor"
                          onClick={() => setForm({ teacher })}
                        />
                        {isAdmin && (
                          <Button
                            variant="delete"
                            hint="Remover vínculo de professor"
                            onClick={() => setToRemove(teacher)}
                          />
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr>
                  <td
                    colSpan={canManage ? 7 : 6}
                    className="px-4 py-10 text-center text-sm text-slate-400"
                  >
                    Nenhum professor encontrado.
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
        message={`Remover o vínculo de professor de "${toRemove?.name}"? A pessoa continua cadastrada; para encerrar o vínculo preservando o histórico, prefira alterar a situação.`}
        confirmLabel="Remover"
        onConfirm={handleRemove}
        onClose={() => setToRemove(null)}
      />
    </div>
  );
}

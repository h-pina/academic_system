"use client";

import { useState } from "react";
import Button from "@/components/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Pagination from "@/components/ui/Pagination";
import SubjectFormModal, {
  type SubjectSavePayload,
} from "@/components/subjects/SubjectFormModal";
import { useMessage } from "@/context/MessageContext";
import { useAllItems } from "@/hooks/useAllItems";
import { useApi } from "@/hooks/useApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePagedList } from "@/hooks/usePagedList";
import { usePermissions } from "@/hooks/usePermissions";
import { useEffect } from "react";
import { prerequisiteFailureMessage } from "@/lib/messages";
import type { SubjectView } from "@/types";

const PAGE_SIZE = 20;

export default function SubjectsPage() {
  const { request } = useApi();
  const { showMessage } = useMessage();
  const { isAdmin, canManage } = usePermissions();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const [form, setForm] = useState<{ subject: SubjectView | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [toRemove, setToRemove] = useState<SubjectView | null>(null);

  const { items, total, loading, reload } = usePagedList<SubjectView>(
    "/subjects",
    { q: debouncedSearch },
    page,
    PAGE_SIZE,
  );
  const candidates = useAllItems<SubjectView>("/subjects", {}, form !== null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const handleSave = async (payload: SubjectSavePayload) => {
    const editing = form?.subject ?? null;
    const { prerequisiteIds, ...fields } = payload;

    setSaving(true);
    const saved = await request<SubjectView>(
      editing ? `/subjects/${editing.id}` : "/subjects",
      {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(
          editing ? fields : { ...fields, description: fields.description || undefined },
        ),
      },
    );

    if (!saved.ok) {
      setSaving(false);
      return;
    }

    const before = (editing?.prerequisites ?? []).map((item) => item.id).sort();
    const after = [...prerequisiteIds].sort();
    const changed = before.join(",") !== after.join(",");

    if (changed) {
      // Silent: the single message below carries the API's reason (e.g. a
      // dependency cycle), which a second message would otherwise replace.
      const linked = await request(`/subjects/${saved.data.id}/prerequisites`, {
        method: "PUT",
        body: JSON.stringify({ prerequisiteIds }),
        silent: true,
      });
      if (!linked.ok) {
        setSaving(false);
        showMessage({
          type: "WARNING",
          messages: [prerequisiteFailureMessage(linked.error)],
        });
        setForm(null);
        reload();
        return;
      }
    }

    setSaving(false);
    showMessage({
      type: "SUCCESS",
      messages: [editing ? "Disciplina atualizada." : "Disciplina cadastrada."],
    });
    setForm(null);
    reload();
    candidates.reload();
  };

  const handleRemove = async () => {
    if (!toRemove) return;
    const target = toRemove;
    setToRemove(null);

    const result = await request(`/subjects/${target.id}`, { method: "DELETE" });
    if (result.ok) {
      showMessage({ type: "SUCCESS", messages: ["Disciplina excluída."] });
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
            placeholder="Código ou nome"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        {canManage && (
          <Button
            label="Nova disciplina"
            variant="add"
            onClick={() => setForm({ subject: null })}
          />
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nome</th>
                <th className="text-center">Carga (h)</th>
                <th>Pré-requisitos</th>
                <th className="text-center">Cursos</th>
                {canManage && <th className="w-28 text-center">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((subject) => (
                <tr key={subject.id}>
                  <td className="font-mono text-xs text-slate-600">
                    {subject.code}
                  </td>
                  <td className="font-medium text-slate-900">{subject.name}</td>
                  <td className="text-center">{subject.workloadHours}</td>
                  <td>
                    {subject.prerequisites.length === 0 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <span className="font-mono text-xs text-slate-600">
                        {subject.prerequisites.map((item) => item.code).join(", ")}
                      </span>
                    )}
                  </td>
                  <td className="text-center">{subject.courseCount}</td>
                  {canManage && (
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="edit"
                          hint="Editar disciplina"
                          onClick={() => setForm({ subject })}
                        />
                        {isAdmin && (
                          <Button
                            variant="delete"
                            hint="Excluir disciplina"
                            onClick={() => setToRemove(subject)}
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
                    colSpan={canManage ? 6 : 5}
                    className="px-4 py-10 text-center text-sm text-slate-400"
                  >
                    Nenhuma disciplina encontrada.
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
        <SubjectFormModal
          subject={form.subject}
          candidates={candidates.items}
          loading={saving}
          onClose={() => setForm(null)}
          onSave={handleSave}
        />
      )}

      <ConfirmDialog
        open={toRemove !== null}
        title="Excluir disciplina"
        message={`Excluir a disciplina "${toRemove?.name}"? Só é possível se ela não estiver em nenhuma matriz nem for pré-requisito de outra disciplina.`}
        onConfirm={handleRemove}
        onClose={() => setToRemove(null)}
      />
    </div>
  );
}

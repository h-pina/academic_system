"use client";

import { useEffect, useState } from "react";
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
import PageHeading from "@/components/PageHeading";
import SubjectFormModal, {
  type SubjectSavePayload,
} from "@/components/subjects/SubjectFormModal";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchFilter } from "@/components/ui/Filters";
import Pagination from "@/components/ui/Pagination";
import { useMessage } from "@/context/MessageContext";
import { useAllItems } from "@/hooks/useAllItems";
import { useApi } from "@/hooks/useApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePagedList } from "@/hooks/usePagedList";
import { usePermissions } from "@/hooks/usePermissions";
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

    if (before.join(",") !== after.join(",")) {
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

  const columns: Column<SubjectView>[] = [
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
    { key: "hours", header: "Carga (h)", align: "center", cell: (row) => row.workloadHours },
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
    { key: "courses", header: "Cursos", align: "center", cell: (row) => row.courseCount },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "Ações",
            align: "center" as const,
            className: "w-28",
            cell: (row: SubjectView) => (
              <span className="flex items-center justify-center gap-1">
                <IconButton label={`Editar ${row.name}`} onClick={() => setForm({ subject: row })}>
                  <Pencil className="h-4 w-4" />
                </IconButton>
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
        ]
      : []),
  ];

  return (
    <div className="p-6">
      <PageHeading
        title="Disciplinas"
        description="Catálogo de disciplinas, com carga horária e pré-requisitos."
        actions={
          canManage && (
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => setForm({ subject: null })}>
              Nova disciplina
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchFilter placeholder="Código ou nome" value={search} onChange={setSearch} />
      </div>

      <Card className="overflow-hidden">
        <DataTable
          caption="Disciplinas"
          columns={columns}
          rows={items}
          loading={loading}
          getRowKey={(row) => row.id}
          empty={
            <EmptyState
              icon={<BookOpen className="h-5 w-5" />}
              title="Nenhuma disciplina encontrada"
              description={
                debouncedSearch
                  ? "Nenhuma disciplina corresponde à busca."
                  : canManage
                    ? "Cadastre a primeira disciplina para montar as matrizes."
                    : "Ainda não há disciplinas cadastradas."
              }
            />
          }
        />
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onChange={setPage} />
      </Card>

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
        message={`A disciplina "${toRemove?.name}" será excluída. Isso só é possível se ela não estiver em nenhuma matriz nem for pré-requisito de outra disciplina.`}
        onConfirm={handleRemove}
        onClose={() => setToRemove(null)}
      />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import PromptModal from "@/components/classes/PromptModal";
import PageHeading from "@/components/PageHeading";
import { Badge, Button, Card, DataTable, EmptyState, SegmentedFilter, type Column } from "@/components/ui";
import { useMessage } from "@/context/MessageContext";
import { useApi } from "@/hooks/useApi";
import { classTitle, formatIsoDate, statusTone } from "@/lib/academic";
import type { ClassView, Paginated, Reopening } from "@/types";

type Filter = "pending" | "approved" | "rejected";
const STATUS_LABELS = { pending: "Pendente", approved: "Liberada", rejected: "Recusada" } as const;

export default function ReopeningsPage() {
  const { request } = useApi();
  const { showMessage } = useMessage();
  const [filter, setFilter] = useState<Filter>("pending");
  const [items, setItems] = useState<Reopening[]>([]);
  const [classes, setClasses] = useState<ClassView[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<Reopening | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [list, all] = await Promise.all([
      request<Reopening[]>(`/grade-reopenings?status=${filter}`),
      request<Paginated<ClassView>>("/classes?pageSize=100"),
    ]);
    setItems(list.ok ? list.data : []);
    setClasses(all.ok ? all.data.items : []);
    setLoading(false);
  }, [request, filter]);

  useEffect(() => {
    load();
  }, [load]);

  const titleOf = (classId: number) => {
    const cls = classes.find((item) => item.id === classId);
    return cls ? classTitle(cls) : `Turma ${classId}`;
  };

  const approve = async (openUntil: string) => {
    if (!approving) return;
    setSaving(true);
    const result = await request(`/grade-reopenings/${approving.id}/approve`, { method: "POST", body: JSON.stringify({ openUntil }) });
    setSaving(false);
    if (result.ok) {
      showMessage({ type: "SUCCESS", messages: ["Lançamento de notas liberado."] });
      setApproving(null);
      load();
    }
  };

  const reject = async (item: Reopening) => {
    const result = await request(`/grade-reopenings/${item.id}/reject`, { method: "POST" });
    if (result.ok) {
      showMessage({ type: "SUCCESS", messages: ["Solicitação recusada."] });
      load();
    }
  };

  const columns: Column<Reopening>[] = [
    { key: "class", header: "Turma", cell: (row) => <span className="font-medium text-slate-900">{titleOf(row.classId)}</span> },
    { key: "justification", header: "Justificativa", cell: (row) => row.justification },
    { key: "status", header: "Situação", cell: (row) => <Badge tone={statusTone(row.status)}>{STATUS_LABELS[row.status]}</Badge> },
    { key: "until", header: "Liberado até", cell: (row) => formatIsoDate(row.openUntil) },
    {
      key: "actions",
      header: "Ações",
      align: "center",
      cell: (row) =>
        row.status === "pending" ? (
          <span className="flex items-center justify-center gap-2">
            <Button size="sm" onClick={() => setApproving(row)}>Liberar</Button>
            <Button size="sm" variant="secondary" onClick={() => reject(row)}>Recusar</Button>
          </span>
        ) : null,
    },
  ];

  return (
    <div className="p-6">
      <PageHeading title="Liberação de notas" description="Pedidos dos professores para lançar ou corrigir notas depois do prazo do calendário." />
      <div className="mb-4">
        <SegmentedFilter label="Situação" value={filter} onChange={setFilter} options={[{ value: "pending", label: "Pendentes" }, { value: "approved", label: "Liberadas" }, { value: "rejected", label: "Recusadas" }]} />
      </div>
      <Card className="overflow-hidden">
        <DataTable caption="Solicitações de liberação de notas" columns={columns} rows={items} loading={loading} getRowKey={(row) => row.id} empty={<EmptyState icon={<ClipboardCheck className="h-5 w-5" />} title="Nenhuma solicitação" description="Os pedidos de liberação aparecem aqui." />} />
      </Card>
      {approving && (
        <PromptModal title="Liberar lançamento de notas" description={titleOf(approving.classId)} label="Liberado até" kind="date" submitLabel="Liberar" loading={saving} onClose={() => setApproving(null)} onSubmit={approve} />
      )}
    </div>
  );
}

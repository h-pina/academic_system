"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Check, Plus, Presentation, X } from "lucide-react";
import ClassFormModal, { type ClassSavePayload } from "@/components/classes/ClassFormModal";
import PromptModal from "@/components/classes/PromptModal";
import PageHeading from "@/components/PageHeading";
import { Badge, Button, Card, DataTable, EmptyState, SegmentedFilter, SelectFilter, type Column } from "@/components/ui";
import { useMessage } from "@/context/MessageContext";
import { useAllItems } from "@/hooks/useAllItems";
import { useApi } from "@/hooks/useApi";
import { usePermissions } from "@/hooks/usePermissions";
import { useQueryState } from "@/hooks/useQueryState";
import {
  CLASS_STATUS_LABELS,
  classTitle,
  formatSchedule,
  semesterLabel,
  statusTone,
} from "@/lib/academic";
import type { FieldErrors } from "@/lib/fieldErrors";
import { buildQuery } from "@/lib/query";
import type { ClassStatus, ClassView, Paginated, Semester, TeacherView } from "@/types";

type StatusFilter = "all" | ClassStatus;
const DEFAULTS = { status: "all" as StatusFilter, semester: "" };

export default function ClassesPage() {
  const { request } = useApi();
  const { showMessage } = useMessage();
  const { canManage } = usePermissions();
  const { state, update, ready } = useQueryState(DEFAULTS);

  const [classes, setClasses] = useState<ClassView[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<"create" | "request" | null>(null);
  const [formErrors, setFormErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [toReject, setToReject] = useState<ClassView | null>(null);

  const subjects = useAllItems<{ id: number; code: string; name: string }>("/subjects");
  const teachers = useAllItems<TeacherView>("/teachers", { status: "active" }, canManage);

  const load = useCallback(async () => {
    if (!ready) return;
    setLoading(true);
    const query = buildQuery({
      pageSize: 100,
      status: state.status === "all" ? undefined : state.status,
      semesterId: state.semester || undefined,
    });
    const result = await request<Paginated<ClassView>>(`/classes${query}`);
    setClasses(result.ok ? result.data.items : []);
    setLoading(false);
  }, [request, ready, state.status, state.semester]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    request<Semester[]>("/semesters").then((result) => setSemesters(result.ok ? result.data : []));
  }, [request]);

  const save = async (payload: ClassSavePayload) => {
    setSaving(true);
    const result = await request(form === "request" ? "/classes/requests" : "/classes", {
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
      messages: [form === "request" ? "Solicitação enviada para a Administração." : "Turma criada. Defina professor e horários e aprove-a."],
    });
    setForm(null);
    load();
  };

  const approve = async (cls: ClassView) => {
    const result = await request(`/classes/${cls.id}/approve`, { method: "POST" });
    if (result.ok) {
      showMessage({ type: "SUCCESS", messages: [`Turma ${classTitle(cls)} aprovada e aberta para inscrição.`] });
      load();
    }
  };

  const reject = async (reason: string) => {
    if (!toReject) return;
    const target = toReject;
    setSaving(true);
    const result = await request(`/classes/${target.id}/reject`, { method: "POST", body: JSON.stringify({ reason }) });
    setSaving(false);
    if (result.ok) {
      showMessage({ type: "SUCCESS", messages: ["Turma rejeitada."] });
      setToReject(null);
      load();
    }
  };

  const columns: Column<ClassView>[] = [
    {
      key: "class",
      header: "Turma",
      cell: (row) => (
        <Link href={`/app/classes/${row.id}`} className="font-medium text-slate-900 no-underline hover:text-brand-600">
          {classTitle(row)}
        </Link>
      ),
    },
    { key: "semester", header: "Semestre", cell: (row) => semesterLabel(row.semester) },
    { key: "teacher", header: "Professor", cell: (row) => row.teacher?.name ?? <span className="text-slate-400">Não definido</span> },
    { key: "schedule", header: "Horário", className: "hidden lg:table-cell", cell: (row) => formatSchedule(row.schedules) },
    { key: "seats", header: "Vagas", align: "center", cell: (row) => `${row.enrolledCount}/${row.seats}` },
    { key: "status", header: "Situação", cell: (row) => <Badge tone={statusTone(row.status)}>{CLASS_STATUS_LABELS[row.status]}</Badge> },
    ...(canManage
      ? [{
          key: "actions",
          header: "Ações",
          align: "center" as const,
          cell: (row: ClassView) =>
            row.status === "pending" ? (
              <span className="flex items-center justify-center gap-2">
                <Button size="sm" icon={<Check className="h-4 w-4" />} onClick={() => approve(row)}>Aprovar</Button>
                <Button size="sm" variant="secondary" icon={<X className="h-4 w-4" />} onClick={() => setToReject(row)}>Rejeitar</Button>
              </span>
            ) : null,
        }]
      : []),
  ];

  return (
    <div className="p-6">
      <PageHeading
        title="Turmas"
        description={canManage ? "Crie turmas, defina professores e horários e aprove a abertura para inscrição." : "Suas turmas e as solicitações de abertura que você enviou."}
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => { setFormErrors({}); setForm(canManage ? "create" : "request"); }}>
            {canManage ? "Nova turma" : "Solicitar turma"}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <SegmentedFilter
          label="Situação"
          value={state.status}
          onChange={(status) => update({ status })}
          options={[
            { value: "all", label: "Todas" },
            { value: "pending", label: "Pendentes" },
            { value: "approved", label: "Aprovadas" },
            { value: "closed", label: "Encerradas" },
            { value: "rejected", label: "Rejeitadas" },
          ]}
        />
        <SelectFilter
          label="Semestre"
          value={state.semester}
          onChange={(semester) => update({ semester })}
          options={semesters.map((s) => ({ value: s.id, label: semesterLabel(s) }))}
        />
      </div>

      <Card className="overflow-hidden">
        <DataTable
          caption="Turmas"
          columns={columns}
          rows={classes}
          loading={loading}
          getRowKey={(row) => row.id}
          empty={<EmptyState icon={<Presentation className="h-5 w-5" />} title="Nenhuma turma encontrada" description="Ajuste os filtros ou crie a primeira turma do semestre." />}
        />
      </Card>

      {form && (
        <ClassFormModal
          mode={form}
          semesters={semesters}
          subjects={subjects.items}
          teachers={teachers.items.map((t) => ({ id: t.userId, name: t.name }))}
          loading={saving}
          errors={formErrors}
          onClose={() => setForm(null)}
          onSave={save}
        />
      )}
      {toReject && (
        <PromptModal
          title="Rejeitar turma"
          description={classTitle(toReject)}
          label="Motivo da rejeição"
          submitLabel="Rejeitar"
          minLength={3}
          loading={saving}
          onClose={() => setToReject(null)}
          onSubmit={reject}
        />
      )}
    </div>
  );
}

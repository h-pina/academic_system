"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, Pencil, X } from "lucide-react";
import ActivitiesTab from "@/components/classes/ActivitiesTab";
import AttendanceTab from "@/components/classes/AttendanceTab";
import ClassNewsTab from "@/components/classes/ClassNewsTab";
import GradesTab from "@/components/classes/GradesTab";
import PromptModal from "@/components/classes/PromptModal";
import ScheduleEditor from "@/components/classes/ScheduleEditor";
import PageHeading from "@/components/PageHeading";
import { Badge, Button, Card, DataTable, Field, FormModal, Input, SegmentedFilter, Select, Skeleton, type Column } from "@/components/ui";
import { useMessage } from "@/context/MessageContext";
import { useUser } from "@/context/UserContext";
import { useAllItems } from "@/hooks/useAllItems";
import { useApi } from "@/hooks/useApi";
import { usePermissions } from "@/hooks/usePermissions";
import {
  CLASS_STATUS_LABELS,
  ENROLLMENT_STATUS_LABELS,
  classTitle,
  formatSchedule,
  scheduleProblems,
  semesterLabel,
  statusTone,
  type SlotDraft,
} from "@/lib/academic";
import type { ClassView, RosterEntry, TeacherView } from "@/types";

type Tab = "summary" | "grades" | "attendance" | "activities" | "news";

export default function ClassDetailPage() {
  const params = useParams<{ classId: string }>();
  const classId = params.classId;
  const { request } = useApi();
  const { showMessage } = useMessage();
  const { profile } = useUser();
  const { canManage } = usePermissions();

  const [cls, setCls] = useState<ClassView | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("summary");
  const [edit, setEdit] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [view, students] = await Promise.all([
      request<ClassView>(`/classes/${classId}`),
      request<RosterEntry[]>(`/classes/${classId}/enrollments`, { silent: true }),
    ]);
    setCls(view.ok ? view.data : null);
    setRoster(students.ok ? students.data : []);
    setLoading(false);
  }, [request, classId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="p-6"><Skeleton className="h-8 w-72" /></div>;
  if (!cls) {
    return (
      <div className="p-6">
        <PageHeading title="Turma não encontrada" />
        <Link href="/app/classes" className="text-brand-600">Voltar para as turmas</Link>
      </div>
    );
  }

  // RN09/RN12: only the teacher in charge records attendance and posts grades.
  const inCharge = cls.teacher !== null && cls.teacher.id === profile?.id;
  const activeClass = cls.status === "approved" || cls.status === "closed";

  const act = async (action: "approve") => {
    const result = await request(`/classes/${cls.id}/${action}`, { method: "POST" });
    if (result.ok) {
      showMessage({ type: "SUCCESS", messages: ["Turma aprovada e aberta para inscrição."] });
      load();
    }
  };

  const reject = async (reason: string) => {
    setSaving(true);
    const result = await request(`/classes/${cls.id}/reject`, { method: "POST", body: JSON.stringify({ reason }) });
    setSaving(false);
    if (result.ok) {
      setRejecting(false);
      load();
    }
  };

  const tabs: { value: Tab; label: string }[] = [
    { value: "summary", label: "Resumo" },
    ...(activeClass
      ? [
          { value: "grades" as Tab, label: "Notas" },
          { value: "attendance" as Tab, label: "Frequência" },
          { value: "activities" as Tab, label: "Atividades" },
          { value: "news" as Tab, label: "Avisos" },
        ]
      : []),
  ];

  const rosterColumns: Column<RosterEntry>[] = [
    { key: "name", header: "Aluno", cell: (row) => <span className="font-medium text-slate-900">{row.name}</span> },
    { key: "reg", header: "Matrícula", cell: (row) => <span className="font-mono text-xs">{row.registrationNumber ?? "-"}</span> },
    { key: "status", header: "Situação", cell: (row) => <Badge tone={statusTone(row.status)}>{ENROLLMENT_STATUS_LABELS[row.status]}</Badge> },
  ];

  return (
    <div className="p-6">
      <Link href="/app/classes" className="mb-3 inline-flex items-center gap-1 text-sm text-slate-500 no-underline hover:text-brand-600">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Turmas
      </Link>
      <PageHeading
        title={classTitle(cls)}
        description={`Semestre ${semesterLabel(cls.semester)} · ${cls.teacher?.name ?? "professor não definido"}`}
        actions={<Badge tone={statusTone(cls.status)}>{CLASS_STATUS_LABELS[cls.status]}</Badge>}
      />

      <div className="mb-5">
        <SegmentedFilter label="Seções da turma" value={tab} onChange={setTab} options={tabs} />
      </div>

      {tab === "summary" && (
        <div className="grid gap-4 lg:grid-cols-[2fr_3fr]">
          <Card className="p-4">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-slate-500">Disciplina</dt><dd>{cls.subject.name} ({cls.subject.workloadHours} h)</dd>
              <dt className="text-slate-500">Professor</dt><dd>{cls.teacher?.name ?? "Não definido"}</dd>
              <dt className="text-slate-500">Horário</dt><dd>{formatSchedule(cls.schedules)}</dd>
              <dt className="text-slate-500">Salas</dt><dd>{[...new Set(cls.schedules.map((s) => s.room).filter(Boolean))].join(", ") || "-"}</dd>
              <dt className="text-slate-500">Vagas</dt><dd>{cls.enrolledCount} de {cls.seats} ocupadas{cls.requestedCount > 0 && ` · ${cls.requestedCount} solicitação(ões) aguardando a alocação`}</dd>
              {cls.rejectionReason && (<><dt className="text-slate-500">Motivo da rejeição</dt><dd>{cls.rejectionReason}</dd></>)}
            </dl>
            {canManage && (cls.status === "pending" || cls.status === "approved") && (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => setEdit(true)}>Editar vagas, professor e horários</Button>
                {cls.status === "pending" && (
                  <>
                    <Button size="sm" icon={<Check className="h-4 w-4" />} onClick={() => act("approve")}>Aprovar</Button>
                    <Button size="sm" variant="secondary" icon={<X className="h-4 w-4" />} onClick={() => setRejecting(true)}>Rejeitar</Button>
                  </>
                )}
              </div>
            )}
          </Card>
          <Card className="overflow-hidden">
            <DataTable caption="Alunos inscritos" columns={rosterColumns} rows={roster} getRowKey={(row) => row.enrollmentId} empty={<p className="p-6 text-center text-sm text-slate-500">Nenhum aluno inscrito.</p>} />
          </Card>
        </div>
      )}
      {tab === "grades" && <GradesTab cls={cls} canEdit={inCharge} onChanged={load} />}
      {tab === "attendance" && <AttendanceTab cls={cls} canEdit={inCharge} />}
      {tab === "activities" && <ActivitiesTab cls={cls} canEdit={inCharge} />}
      {tab === "news" && <ClassNewsTab cls={cls} canPost={inCharge || canManage} />}

      {edit && <EditClassModal cls={cls} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); load(); }} />}
      {rejecting && (
        <PromptModal title="Rejeitar turma" description={classTitle(cls)} label="Motivo da rejeição" submitLabel="Rejeitar" minLength={3} loading={saving} onClose={() => setRejecting(false)} onSubmit={reject} />
      )}
    </div>
  );
}

function EditClassModal({ cls, onClose, onSaved }: { cls: ClassView; onClose: () => void; onSaved: () => void }) {
  const { request } = useApi();
  const { showMessage } = useMessage();
  const teachers = useAllItems<TeacherView>("/teachers", { status: "active" });
  const [seats, setSeats] = useState(String(cls.seats));
  const [teacherId, setTeacherId] = useState(String(cls.teacher?.id ?? ""));
  const [slots, setSlots] = useState<SlotDraft[]>(cls.schedules.map((s) => ({ weekday: s.weekday, startTime: s.startTime, endTime: s.endTime, room: s.room ?? "" })));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const found: Record<string, string> = {};
    const count = Number(seats);
    if (!Number.isInteger(count) || count < 1) found.seats = "Informe o número de vagas.";
    else if (count < cls.enrolledCount) found.seats = `Não pode ser menor que os ${cls.enrolledCount} alunos já inscritos.`;
    const problems = scheduleProblems(slots);
    if (problems.length > 0) found.schedules = problems[0];
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    // Schedules first, then seats/teacher, so a teacher change is checked against the new times.
    const schedules = await request(`/classes/${cls.id}/schedules`, { method: "PUT", body: JSON.stringify({ schedules: slots }) });
    const patch = schedules.ok
      ? await request(`/classes/${cls.id}`, {
          method: "PATCH",
          body: JSON.stringify({ seats: count, ...(teacherId ? { teacherId: Number(teacherId) } : {}) }),
        })
      : null;
    setSaving(false);
    if (patch?.ok) {
      showMessage({ type: "SUCCESS", messages: ["Turma atualizada."] });
      onSaved();
    }
  };

  return (
    <FormModal title="Editar turma" description={classTitle(cls)} submitLabel="Salvar alterações" size="lg" loading={saving} errors={errors} onSubmit={submit} onClose={onClose}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Professor">
          {(c) => (
            <Select {...c} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              <option value="">Não definido</option>
              {teachers.items.map((t) => (<option key={t.userId} value={t.userId}>{t.name}</option>))}
            </Select>
          )}
        </Field>
        <Field label="Vagas" required error={errors.seats}>
          {(c) => <Input {...c} type="number" min={1} value={seats} onChange={(e) => setSeats(e.target.value)} />}
        </Field>
      </div>
      <ScheduleEditor value={slots} onChange={setSlots} error={errors.schedules} />
    </FormModal>
  );
}

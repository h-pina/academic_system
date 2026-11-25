"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Pencil, Plus } from "lucide-react";
import CalendarFormModal from "@/components/calendar/CalendarFormModal";
import PageHeading from "@/components/PageHeading";
import { Badge, Button, Card, DataTable, EmptyState, Field, FormModal, IconButton, Input, Select, type Column } from "@/components/ui";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useServerClock } from "@/context/ClockContext";
import { useMessage } from "@/context/MessageContext";
import { useApi } from "@/hooks/useApi";
import { useFormErrors } from "@/hooks/useFormErrors";
import { usePermissions } from "@/hooks/usePermissions";
import {
  SEMESTER_STATUS_LABELS,
  canAllocate,
  formatIsoDate,
  semesterLabel,
  statusTone,
  type CalendarDraft,
} from "@/lib/academic";
import type { FieldErrors } from "@/lib/fieldErrors";
import type { AcademicCalendar, AllocationResult, Semester } from "@/types";

export default function CalendarPage() {
  const { request } = useApi();
  const { showMessage } = useMessage();
  const { canManage } = usePermissions();
  const { today } = useServerClock();

  const [calendars, setCalendars] = useState<AcademicCalendar[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [calendarForm, setCalendarForm] = useState<{ calendar: AcademicCalendar | null } | null>(null);
  const [semesterForm, setSemesterForm] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [toClose, setToClose] = useState<Semester | null>(null);
  const [toAllocate, setToAllocate] = useState<Semester | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [c, s] = await Promise.all([
      request<AcademicCalendar[]>("/calendars"),
      request<Semester[]>("/semesters"),
    ]);
    setCalendars(c.ok ? c.data : []);
    setSemesters(s.ok ? s.data : []);
    setLoading(false);
  }, [request]);

  useEffect(() => {
    load();
  }, [load]);

  const saveCalendar = async (payload: CalendarDraft) => {
    const editing = calendarForm?.calendar ?? null;
    setSaving(true);
    const result = await request(editing ? `/calendars/${editing.id}` : "/calendars", {
      method: editing ? "PATCH" : "POST",
      fieldErrors: true,
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      return;
    }
    showMessage({ type: "SUCCESS", messages: [editing ? "Calendário atualizado." : "Calendário cadastrado."] });
    setCalendarForm(null);
    load();
  };

  const saveSemester = async (payload: { calendarId: number; year: number; term: number; startDate: string; endDate: string }) => {
    setSaving(true);
    const result = await request("/semesters", { method: "POST", fieldErrors: true, body: JSON.stringify(payload) });
    setSaving(false);
    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      return;
    }
    showMessage({ type: "SUCCESS", messages: ["Semestre criado. Implante-o para liberar as turmas."] });
    setSemesterForm(false);
    load();
  };

  const act = async (semester: Semester, action: "deploy" | "close") => {
    const result = await request(`/semesters/${semester.id}/${action}`, { method: "POST" });
    if (result.ok) {
      showMessage({
        type: "SUCCESS",
        messages: [action === "deploy" ? "Semestre implantado." : "Semestre encerrado."],
      });
      load();
    }
  };

  const allocate = async (semester: Semester) => {
    const result = await request<AllocationResult>(`/semesters/${semester.id}/allocate`, { method: "POST" });
    if (result.ok) {
      const { allocated, notAllocated } = result.data;
      showMessage({
        type: "SUCCESS",
        messages: [
          allocated + notAllocated === 0
            ? "Não havia solicitações pendentes."
            : `Alocação concluída: ${allocated} inscrição(ões) confirmada(s) e ${notAllocated} sem vaga.`,
        ],
      });
      load();
    }
  };

  const calendarColumns: Column<AcademicCalendar>[] = [
    { key: "description", header: "Calendário", cell: (row) => <span className="font-medium text-slate-900">{row.description}</span> },
    { key: "period", header: "Período letivo", cell: (row) => `${formatIsoDate(row.startDate)} a ${formatIsoDate(row.endDate)}` },
    { key: "enrollment", header: "Inscrições", cell: (row) => `${formatIsoDate(row.enrollmentStart)} a ${formatIsoDate(row.enrollmentEnd)}` },
    { key: "withdrawal", header: "Cancelamento até", cell: (row) => formatIsoDate(row.withdrawalDeadline) },
    { key: "grades", header: "Notas até", cell: (row) => formatIsoDate(row.gradesDeadline) },
    ...(canManage
      ? [{
          key: "actions",
          header: "Ações",
          align: "center" as const,
          cell: (row: AcademicCalendar) => (
            <IconButton label={`Editar ${row.description}`} onClick={() => { setErrors({}); setCalendarForm({ calendar: row }); }}>
              <Pencil className="h-4 w-4" />
            </IconButton>
          ),
        }]
      : []),
  ];

  const semesterColumns: Column<Semester>[] = [
    { key: "label", header: "Semestre", cell: (row) => <span className="font-medium text-slate-900">{semesterLabel(row)}</span> },
    { key: "calendar", header: "Calendário", cell: (row) => row.calendar.description },
    { key: "period", header: "Período", cell: (row) => `${formatIsoDate(row.startDate)} a ${formatIsoDate(row.endDate)}` },
    { key: "status", header: "Situação", cell: (row) => <Badge tone={statusTone(row.status)}>{SEMESTER_STATUS_LABELS[row.status]}</Badge> },
    ...(canManage
      ? [{
          key: "actions",
          header: "Ações",
          align: "center" as const,
          cell: (row: Semester) => (
            <span className="flex items-center justify-center gap-2">
              {row.status === "draft" && (
                <Button size="sm" onClick={() => act(row, "deploy")}>Implantar</Button>
              )}
              {row.status === "active" && (
                <Button
                  size="sm"
                  disabled={!canAllocate(row.calendar.enrollmentEnd, today)}
                  title={canAllocate(row.calendar.enrollmentEnd, today) ? undefined : `Disponível depois de ${formatIsoDate(row.calendar.enrollmentEnd)}, quando o período de inscrição termina.`}
                  onClick={() => setToAllocate(row)}
                >
                  Alocar vagas
                </Button>
              )}
              {row.status === "active" && (
                <Button size="sm" variant="secondary" onClick={() => setToClose(row)}>Encerrar</Button>
              )}
            </span>
          ),
        }]
      : []),
  ];

  return (
    <div className="p-6">
      <PageHeading
        title="Calendário acadêmico"
        description="Períodos letivos e os prazos de inscrição, cancelamento e lançamento de notas."
        actions={
          canManage && (
            <Button icon={<Plus className="h-4 w-4" />} onClick={() => { setErrors({}); setCalendarForm({ calendar: null }); }}>
              Novo calendário
            </Button>
          )
        }
      />

      <Card className="mb-8 overflow-hidden">
        <DataTable
          caption="Calendários acadêmicos"
          columns={calendarColumns}
          rows={calendars}
          loading={loading}
          getRowKey={(row) => row.id}
          empty={
            <EmptyState
              icon={<CalendarDays className="h-5 w-5" />}
              title="Nenhum calendário cadastrado"
              description={canManage ? "Cadastre o calendário do período para criar o semestre." : "A Administração ainda não cadastrou o calendário."}
            />
          }
        />
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Semestres letivos</h2>
        {canManage && (
          <Button variant="secondary" size="sm" icon={<Plus className="h-4 w-4" />} disabled={calendars.length === 0} onClick={() => { setErrors({}); setSemesterForm(true); }}>
            Novo semestre
          </Button>
        )}
      </div>
      <Card className="overflow-hidden">
        <DataTable
          caption="Semestres letivos"
          columns={semesterColumns}
          rows={semesters}
          loading={loading}
          getRowKey={(row) => row.id}
          empty={<EmptyState icon={<CalendarDays className="h-5 w-5" />} title="Nenhum semestre criado" description="Os semestres aparecem aqui depois de criados a partir de um calendário." />}
        />
      </Card>

      {calendarForm && (
        <CalendarFormModal calendar={calendarForm.calendar} loading={saving} errors={errors} onClose={() => setCalendarForm(null)} onSave={saveCalendar} />
      )}
      {semesterForm && (
        <SemesterModal calendars={calendars} loading={saving} errors={errors} onClose={() => setSemesterForm(false)} onSave={saveSemester} />
      )}
      <ConfirmDialog
        open={toAllocate !== null}
        title="Alocar vagas"
        message={`As solicitações de inscrição do semestre ${toAllocate ? semesterLabel(toAllocate) : ""} serão decididas: em cada turma, as vagas vão para quem tem a disciplina obrigatória na matriz, depois para as turmas de ingresso mais antigo e, por fim, para quem pediu primeiro. O resultado não pode ser desfeito. Normalmente isso já acontece sozinho quando o período termina; use este botão se a alocação automática estiver desligada.`}
        confirmLabel="Alocar vagas"
        tone="neutral"
        onConfirm={() => { if (toAllocate) allocate(toAllocate); setToAllocate(null); }}
        onClose={() => setToAllocate(null)}
      />
      <ConfirmDialog
        open={toClose !== null}
        title="Encerrar semestre"
        message={`O semestre ${toClose ? semesterLabel(toClose) : ""} será encerrado e não receberá novas turmas.`}
        confirmLabel="Encerrar"
        tone="neutral"
        onConfirm={() => { if (toClose) act(toClose, "close"); setToClose(null); }}
        onClose={() => setToClose(null)}
      />
    </div>
  );
}

function SemesterModal({
  calendars,
  loading,
  errors: serverErrors,
  onClose,
  onSave,
}: {
  calendars: AcademicCalendar[];
  loading: boolean;
  errors: FieldErrors;
  onClose: () => void;
  onSave: (payload: { calendarId: number; year: number; term: number; startDate: string; endDate: string }) => void;
}) {
  const form = useFormErrors(serverErrors);
  const [calendarId, setCalendarId] = useState(String(calendars[0]?.id ?? ""));
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [term, setTerm] = useState("1");

  const calendar = calendars.find((item) => String(item.id) === calendarId);

  const handleSubmit = () => {
    const found: FieldErrors = {};
    if (!calendar) found.calendarId = "Escolha o calendário.";
    const y = Number(year);
    if (!Number.isInteger(y) || y < 2000 || y > 2100) found.year = "Informe um ano entre 2000 e 2100.";
    if (Object.keys(found).length > 0 || !calendar) {
      form.setErrors(found);
      return;
    }
    onSave({ calendarId: calendar.id, year: y, term: Number(term), startDate: calendar.startDate, endDate: calendar.endDate });
  };

  return (
    <FormModal title="Novo semestre" description="O semestre usa o período do calendário escolhido." submitLabel="Criar semestre" size="sm" loading={loading} errors={form.errors} onSubmit={handleSubmit} onClose={onClose}>
      <Field label="Calendário" required error={form.errors.calendarId}>
        {(control) => (
          <Select {...control} value={calendarId} onChange={(e) => setCalendarId(e.target.value)}>
            {calendars.map((item) => (
              <option key={item.id} value={item.id}>{item.description}</option>
            ))}
          </Select>
        )}
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Ano" required error={form.errors.year}>
          {(control) => <Input {...control} type="number" value={year} onChange={(e) => { setYear(e.target.value); form.clear("year"); }} />}
        </Field>
        <Field label="Período" required>
          {(control) => (
            <Select {...control} value={term} onChange={(e) => setTerm(e.target.value)}>
              <option value="1">1º semestre</option>
              <option value="2">2º semestre</option>
            </Select>
          )}
        </Field>
      </div>
    </FormModal>
  );
}

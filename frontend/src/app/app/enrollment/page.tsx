"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ListChecks } from "lucide-react";
import PageHeading from "@/components/PageHeading";
import { Badge, Button, Card, DataTable, EmptyState, SearchFilter, type Column } from "@/components/ui";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useServerClock } from "@/context/ClockContext";
import { useMessage } from "@/context/MessageContext";
import { useApi } from "@/hooks/useApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  ENROLLMENT_STATUS_LABELS,
  formatGrade,
  classTitle,
  enrollmentActions,
  formatIsoDate,
  formatSchedule,
  isEnrollmentWindowOpen,
  semesterLabel,
  statusTone,
} from "@/lib/academic";
import { buildQuery } from "@/lib/query";
import type { ClassView, EnrollmentView, Paginated, Semester } from "@/types";

/** The success message of the specification (MSG04). */
const SUCCESS_MESSAGE = "Operação realizada com sucesso.";
const REQUEST_MESSAGE =
  "Solicitação registrada. As vagas só são definidas depois do fim do período de inscrição.";

export default function EnrollmentPage() {
  const { request } = useApi();
  const { showMessage } = useMessage();
  const [search, setSearch] = useState("");
  const term = useDebouncedValue(search, 300);

  const [classes, setClasses] = useState<ClassView[]>([]);
  const [mine, setMine] = useState<EnrollmentView[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [toCancel, setToCancel] = useState<{ enrollment: EnrollmentView; action: "cancel" | "lock" } | null>(null);

  const { today } = useServerClock();

  const load = useCallback(async () => {
    setLoading(true);
    // Enrollments first: if the period just ended, the seats are decided by this
    // request, so the catalogue below already reflects the result.
    const enrollments = await request<EnrollmentView[]>("/enrollments/me");
    const [available, active] = await Promise.all([
      request<Paginated<ClassView>>(`/classes/available${buildQuery({ q: term || undefined, pageSize: 100 })}`),
      request<Semester[]>("/semesters?status=active"),
    ]);
    setClasses(available.ok ? available.data.items : []);
    setMine(enrollments.ok ? enrollments.data : []);
    setSemesters(active.ok ? active.data : []);
    setLoading(false);
  }, [request, term]);

  useEffect(() => {
    load();
  }, [load]);

  const calendarOf = useMemo(
    () => new Map(semesters.map((semester) => [semester.id, semester.calendar])),
    [semesters],
  );

  const enroll = async (cls: ClassView) => {
    setBusy(cls.id);
    // Validation (window, prerequisites, schedule conflict, seats) happens on the
    // server at the moment of confirmation; its message is shown as is (RU03).
    const result = await request("/enrollments", { method: "POST", body: JSON.stringify({ classId: cls.id }) });
    setBusy(null);
    if (result.ok) {
      showMessage({ type: "SUCCESS", messages: [REQUEST_MESSAGE] });
      load();
    }
  };

  const withdraw = async () => {
    if (!toCancel) return;
    const { enrollment, action } = toCancel;
    setToCancel(null);
    const result = await request(
      action === "cancel" ? `/enrollments/${enrollment.id}` : `/enrollments/${enrollment.id}/lock`,
      { method: action === "cancel" ? "DELETE" : "POST" },
    );
    if (result.ok) {
      showMessage({ type: "SUCCESS", messages: [SUCCESS_MESSAGE] });
      load();
    }
  };

  const windowCalendar = semesters[0]?.calendar;
  const windowOpen = windowCalendar ? isEnrollmentWindowOpen(windowCalendar, today) : false;
  // Once the period has ended, the screen is only about its outcome: what the
  // student requested this semester. The catalogue and the history are hidden.
  const periodEnded = windowCalendar ? today > windowCalendar.enrollmentEnd : false;

  const catalogueColumns: Column<ClassView>[] = [
    { key: "subject", header: "Disciplina", cell: (row) => <span><span className="font-medium text-slate-900">{row.subject.name}</span><span className="ml-2 font-mono text-xs text-slate-500">{row.subject.code} {row.code}</span></span> },
    { key: "teacher", header: "Professor", cell: (row) => row.teacher?.name ?? "-" },
    { key: "schedule", header: "Horário", cell: (row) => formatSchedule(row.schedules) },
    {
      key: "seats",
      header: "Vagas",
      align: "center",
      cell: (row) => (
        <span>
          {row.seats} vagas
          <span className={`block text-xs ${row.requestedCount > row.seats ? "font-semibold text-amber-700" : "text-slate-500"}`}>
            {row.requestedCount} solicitação(ões)
          </span>
        </span>
      ),
    },
    {
      key: "action",
      header: "",
      align: "right",
      cell: (row) =>
        row.alreadyEnrolled ? (
          <Badge tone={statusTone(row.myStatus ?? "confirmed")}>{row.myStatus === "requested" ? "Solicitada" : "Inscrito"}</Badge>
        ) : (
          <Button size="sm" loading={busy === row.id} disabled={!windowOpen} onClick={() => enroll(row)} aria-label={`Inscrever-se em ${classTitle(row)}`}>
            Inscrever-se
          </Button>
        ),
    },
  ];

  const actionsFor = (enrollment: EnrollmentView) =>
    enrollmentActions(
      enrollment.status,
      calendarOf.get(enrollment.class.semester.id)?.withdrawalDeadline,
      today,
    );

  // Passed subjects are history: read-only, and never offered again.
  const activeIds = new Set(semesters.map((semester) => semester.id));
  const current = periodEnded
    ? mine.filter((enrollment) => activeIds.has(enrollment.class.semester.id))
    : mine.filter((enrollment) => enrollment.status !== "approved");
  const passed = periodEnded ? [] : mine.filter((enrollment) => enrollment.status === "approved");

  const passedColumns: Column<EnrollmentView>[] = [
    { key: "class", header: "Disciplina", cell: (row) => <span className="font-medium text-slate-900">{row.class.subject.code} - {row.class.subject.name}</span> },
    { key: "semester", header: "Semestre", cell: (row) => semesterLabel(row.class.semester) },
    { key: "grade", header: "Média final", align: "center", cell: (row) => formatGrade(row.finalGrade) },
  ];

  const mineColumns: Column<EnrollmentView>[] = [
    { key: "class", header: "Turma", cell: (row) => <span className="font-medium text-slate-900">{classTitle(row.class)}</span> },
    { key: "semester", header: "Semestre", cell: (row) => semesterLabel(row.class.semester) },
    { key: "schedule", header: "Horário", cell: (row) => formatSchedule(row.class.schedules) },
    { key: "status", header: "Situação", cell: (row) => <Badge tone={statusTone(row.status)}>{ENROLLMENT_STATUS_LABELS[row.status]}</Badge> },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (row) => {
        const actions = actionsFor(row);
        if (!actions.cancel && !actions.lock) return null;
        return (
          <span className="flex justify-end gap-2">
            {actions.lock && <Button size="sm" variant="secondary" onClick={() => setToCancel({ enrollment: row, action: "lock" })}>Trancar</Button>}
            {actions.cancel && (
              <Button size="sm" variant="secondary" onClick={() => setToCancel({ enrollment: row, action: "cancel" })}>
                {row.status === "requested" ? "Cancelar solicitação" : "Cancelar"}
              </Button>
            )}
          </span>
        );
      },
    },
  ];

  return (
    <div className="p-6">
      <PageHeading title="Inscrição em turmas" description="Consulte as turmas abertas, com professor, horário e vagas, e inscreva-se." />

      {windowCalendar && (
        <p role="status" className={`mb-4 rounded-lg px-3 py-2 text-sm ${windowOpen ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>
          {windowOpen
            ? `Inscrições abertas até ${formatIsoDate(windowCalendar.enrollmentEnd)}. Inscrever-se registra uma solicitação: as vagas só são definidas depois do fim do período, e você acompanha o resultado em "Minhas inscrições".`
            : `O período de inscrição está fechado (${formatIsoDate(windowCalendar.enrollmentStart)} a ${formatIsoDate(windowCalendar.enrollmentEnd)}). As vagas foram decididas automaticamente: veja o resultado em "Minhas inscrições".`}
        </p>
      )}

      {!periodEnded && (
        <>
          <h2 className="mb-3 text-lg font-bold text-slate-900">Turmas abertas</h2>
          <div className="mb-3"><SearchFilter placeholder="Disciplina ou código" value={search} onChange={setSearch} /></div>
          <Card className="mb-8 overflow-hidden">
            <DataTable
              caption="Turmas abertas para inscrição"
              columns={catalogueColumns}
              rows={classes}
              loading={loading}
              getRowKey={(row) => row.id}
              empty={<EmptyState icon={<ListChecks className="h-5 w-5" />} title="Nenhuma turma encontrada" description="Não há turmas abertas para os critérios informados." />}
            />
          </Card>
        </>
      )}

      <h2 className="mb-1 text-lg font-bold text-slate-900">Minhas inscrições</h2>
      <p className="mb-3 text-sm text-slate-500">
        <strong>Solicitada</strong>: aguardando o fim do período. <strong>Cursando</strong>: vaga confirmada.{" "}
        <strong>Não alocado</strong>: havia mais pedidos que vagas.
      </p>
      <Card className="overflow-hidden">
        <DataTable
          caption="Minhas inscrições"
          columns={mineColumns}
          rows={current}
          loading={loading}
          getRowKey={(row) => row.id}
          empty={<EmptyState title="Você não solicitou turmas neste período" description={periodEnded ? "O período de inscrição terminou." : "Escolha uma turma acima para se inscrever."} />}
        />
      </Card>

      {passed.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-lg font-bold text-slate-900">Disciplinas aprovadas</h2>
          <Card className="overflow-hidden">
            <DataTable caption="Disciplinas aprovadas" columns={passedColumns} rows={passed} getRowKey={(row) => row.id} />
          </Card>
        </>
      )}

      <ConfirmDialog
        open={toCancel !== null}
        title={toCancel?.action === "lock" ? "Trancar inscrição" : toCancel?.enrollment.status === "requested" ? "Cancelar solicitação" : "Cancelar inscrição"}
        message={`${toCancel ? classTitle(toCancel.enrollment.class) : ""}: ${toCancel?.enrollment.status === "requested" ? "a solicitação será retirada." : "a vaga será liberada, e a ação só é possível até o prazo do calendário acadêmico."}`}
        confirmLabel={toCancel?.action === "lock" ? "Trancar" : "Cancelar inscrição"}
        cancelLabel="Voltar"
        onConfirm={withdraw}
        onClose={() => setToCancel(null)}
      />
    </div>
  );
}

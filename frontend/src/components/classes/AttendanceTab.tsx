"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Save } from "lucide-react";
import { Badge, Button, Card, DataTable, EmptyState, Field, Input, type Column } from "@/components/ui";
import { Checkbox } from "@/components/ui";
import { useServerClock } from "@/context/ClockContext";
import { useMessage } from "@/context/MessageContext";
import { useApi } from "@/hooks/useApi";
import { formatIsoDate, formatPercent } from "@/lib/academic";
import { downloadFile } from "@/lib/download";
import type { ClassView, RollCall } from "@/types";

interface AttendanceTabProps {
  cls: ClassView;
  /** The teacher in charge: only they can record attendance (RN09). */
  canEdit: boolean;
}

/** The maximum share of absences before failing (RN08). */
export const ABSENCE_LIMIT = 25;

type Row = RollCall["students"][number];

export default function AttendanceTab({ cls, canEdit }: AttendanceTabProps) {
  const { request } = useApi();
  const { showMessage } = useMessage();
  const { today } = useServerClock();
  const [date, setDate] = useState(today);
  const [roll, setRoll] = useState<RollCall | null>(null);
  const [present, setPresent] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await request<RollCall>(`/classes/${cls.id}/attendance?date=${date}`);
    if (result.ok) {
      setRoll(result.data);
      // Everyone starts present; the teacher marks the absences.
      setPresent(Object.fromEntries(result.data.students.map((s) => [s.enrollmentId, s.present ?? true])));
    } else {
      setRoll(null);
    }
    setLoading(false);
  }, [request, cls.id, date]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!roll) return;
    setSaving(true);
    const result = await request(`/classes/${cls.id}/attendance`, {
      method: "PUT",
      body: JSON.stringify({
        date,
        records: roll.students.map((s) => ({ enrollmentId: s.enrollmentId, present: present[s.enrollmentId] ?? true })),
      }),
    });
    setSaving(false);
    if (result.ok) {
      showMessage({ type: "SUCCESS", messages: [`Frequência de ${formatIsoDate(date)} registrada.`] });
      load();
    }
  };

  const exportReport = async (format: "csv" | "pdf") => {
    const error = await downloadFile(`/classes/${cls.id}/reports/attendance?format=${format}`, `frequencia.${format}`);
    if (error) showMessage({ type: "ERROR", messages: [error] });
  };

  const columns: Column<Row>[] = [
    { key: "name", header: "Aluno", cell: (row) => <span className="font-medium text-slate-900">{row.name}</span> },
    ...(canEdit
      ? [{
          key: "present",
          header: "Presente em " + formatIsoDate(date),
          align: "center" as const,
          cell: (row: Row) => (
            <Checkbox
              aria-label={`Presença de ${row.name}`}
              checked={present[row.enrollmentId] ?? true}
              onChange={(event) => setPresent((current) => ({ ...current, [row.enrollmentId]: event.target.checked }))}
            />
          ),
        }]
      : []),
    { key: "absences", header: "Faltas", align: "center", cell: (row) => row.absences },
    {
      key: "percent",
      header: "Faltas (%)",
      align: "center",
      cell: (row) =>
        row.absencePercent > ABSENCE_LIMIT ? (
          <Badge tone="danger">{formatPercent(row.absencePercent)} · acima do limite</Badge>
        ) : (
          formatPercent(row.absencePercent)
        ),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        {canEdit && (
          <Field label="Data da aula" hint="Somente dias de aula da turma, nunca datas futuras.">
            {(control) => <Input {...control} type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} />}
          </Field>
        )}
        {canEdit && (
          <Button icon={<Save className="h-4 w-4" />} loading={saving} disabled={!roll || roll.students.length === 0} onClick={save}>
            Registrar frequência
          </Button>
        )}
        <span className="ml-auto flex gap-2">
          <Button size="sm" variant="ghost" icon={<Download className="h-4 w-4" />} onClick={() => exportReport("csv")}>CSV</Button>
          <Button size="sm" variant="ghost" icon={<Download className="h-4 w-4" />} onClick={() => exportReport("pdf")}>PDF</Button>
        </span>
      </div>

      <Card className="overflow-hidden">
        <DataTable
          caption="Frequência da turma"
          columns={columns}
          rows={roll?.students ?? []}
          loading={loading}
          getRowKey={(row) => row.enrollmentId}
          empty={<EmptyState title="Nenhum aluno inscrito" description="A chamada aparece quando houver alunos inscritos." />}
        />
      </Card>
      {roll && (
        <p className="mt-2 text-xs text-slate-500">
          Aulas registradas: {roll.lessonDates.length}. O aluno é reprovado por falta acima de {ABSENCE_LIMIT}%, independentemente das notas.
        </p>
      )}
    </div>
  );
}

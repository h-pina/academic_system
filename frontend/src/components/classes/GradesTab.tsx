"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Lock, Plus, Save } from "lucide-react";
import PromptModal from "@/components/classes/PromptModal";
import { Badge, Button, Card, DataTable, EmptyState, Field, FormModal, Input, type Column } from "@/components/ui";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useMessage } from "@/context/MessageContext";
import { useApi } from "@/hooks/useApi";
import { RESULT_LABELS, formatGrade, statusTone } from "@/lib/academic";
import { downloadFile } from "@/lib/download";
import type { ClassGrades, ClassView, StudentSummary } from "@/types";

interface GradesTabProps {
  cls: ClassView;
  /** The teacher in charge: can define assessments and post grades. */
  canEdit: boolean;
  onChanged: () => void;
}

export default function GradesTab({ cls, canEdit, onChanged }: GradesTabProps) {
  const { request } = useApi();
  const { showMessage } = useMessage();
  const [data, setData] = useState<ClassGrades | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [assessmentForm, setAssessmentForm] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await request<ClassGrades>(`/classes/${cls.id}/grades`);
    setData(result.ok ? result.data : null);
    setDraft({});
    setLoading(false);
  }, [request, cls.id]);

  useEffect(() => {
    load();
  }, [load]);

  const key = (enrollmentId: number, assessmentId: number) => `${enrollmentId}:${assessmentId}`;
  const valueOf = (row: StudentSummary, assessmentId: number): string => {
    const edited = draft[key(row.enrollmentId, assessmentId)];
    if (edited !== undefined) return edited;
    const stored = row.grades[assessmentId];
    return stored === undefined ? "" : String(stored);
  };

  const save = async () => {
    if (!data) return;
    setSaving(true);
    let ok = true;
    for (const assessment of data.assessments) {
      const entries = Object.entries(draft)
        .filter(([k, v]) => k.endsWith(`:${assessment.id}`) && v.trim() !== "")
        .map(([k, v]) => ({ enrollmentId: Number(k.split(":")[0]), value: Number(v.replace(",", ".")) }));
      if (entries.length === 0) continue;
      if (entries.some((entry) => Number.isNaN(entry.value) || entry.value < 0 || entry.value > assessment.maxScore)) {
        showMessage({ type: "ERROR", messages: [`As notas de "${assessment.name}" devem estar entre 0 e ${assessment.maxScore}.`] });
        ok = false;
        break;
      }
      const result = await request(`/assessments/${assessment.id}/grades`, { method: "PUT", body: JSON.stringify({ entries }) });
      if (!result.ok) {
        ok = false;
        break;
      }
    }
    setSaving(false);
    if (ok) {
      showMessage({ type: "SUCCESS", messages: ["Notas salvas."] });
      load();
      onChanged();
    }
  };

  const createAssessment = async (payload: { name: string; weight: number; maxScore: number }) => {
    setSaving(true);
    const result = await request(`/classes/${cls.id}/assessments`, { method: "POST", body: JSON.stringify(payload) });
    setSaving(false);
    if (result.ok) {
      setAssessmentForm(false);
      load();
    }
  };

  const requestReopening = async (justification: string) => {
    setSaving(true);
    const result = await request(`/classes/${cls.id}/grade-reopenings`, { method: "POST", body: JSON.stringify({ justification }) });
    setSaving(false);
    if (result.ok) {
      showMessage({ type: "SUCCESS", messages: ["Solicitação enviada. A Administração vai analisá-la."] });
      setReopening(false);
    }
  };

  const finalize = async () => {
    setFinalizing(false);
    const result = await request(`/classes/${cls.id}/finalize`, { method: "POST" });
    if (result.ok) {
      showMessage({ type: "SUCCESS", messages: ["Turma encerrada. Os resultados foram registrados."] });
      load();
      onChanged();
    }
  };

  const exportReport = async (format: "csv" | "pdf") => {
    const error = await downloadFile(`/classes/${cls.id}/reports/grades?format=${format}`, `notas.${format}`);
    if (error) showMessage({ type: "ERROR", messages: [error] });
  };

  if (!data && !loading) return <EmptyState title="Não foi possível carregar as notas" />;
  const assessments = data?.assessments ?? [];
  const editable = canEdit && data?.gradesOpen && cls.status !== "rejected";

  const columns: Column<StudentSummary>[] = [
    { key: "name", header: "Aluno", cell: (row) => (<span><span className="font-medium text-slate-900">{row.name}</span><span className="ml-2 font-mono text-xs text-slate-500">{row.registrationNumber}</span></span>) },
    ...assessments.map((assessment) => ({
      key: `a${assessment.id}`,
      header: `${assessment.name} (peso ${assessment.weight})`,
      align: "center" as const,
      cell: (row: StudentSummary) =>
        editable ? (
          <Input
            aria-label={`${assessment.name} de ${row.name}`}
            inputMode="decimal"
            className="mx-auto w-20 text-center"
            value={valueOf(row, assessment.id)}
            onChange={(event) => setDraft((current) => ({ ...current, [key(row.enrollmentId, assessment.id)]: event.target.value }))}
          />
        ) : (
          formatGrade(row.grades[assessment.id])
        ),
    })),
    { key: "avg", header: "Média", align: "center", cell: (row) => formatGrade(row.finalGrade ?? row.partialAverage) },
    { key: "abs", header: "Faltas", align: "center", cell: (row) => `${row.absences} (${row.absencePercent}%)` },
    { key: "result", header: "Situação", cell: (row) => <Badge tone={statusTone(row.result)}>{RESULT_LABELS[row.result]}</Badge> },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {canEdit && cls.status === "approved" && (
          <Button size="sm" variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => setAssessmentForm(true)}>Nova avaliação</Button>
        )}
        {editable && (
          <Button size="sm" icon={<Save className="h-4 w-4" />} loading={saving} disabled={Object.keys(draft).length === 0} onClick={save}>Salvar notas</Button>
        )}
        {canEdit && data && !data.gradesOpen && (
          <Button size="sm" variant="secondary" icon={<Lock className="h-4 w-4" />} onClick={() => setReopening(true)}>Solicitar liberação do prazo</Button>
        )}
        {cls.status === "approved" && assessments.length > 0 && (
          <Button size="sm" variant="secondary" onClick={() => setFinalizing(true)}>Encerrar turma</Button>
        )}
        <span className="ml-auto flex gap-2">
          <Button size="sm" variant="ghost" icon={<Download className="h-4 w-4" />} onClick={() => exportReport("csv")}>CSV</Button>
          <Button size="sm" variant="ghost" icon={<Download className="h-4 w-4" />} onClick={() => exportReport("pdf")}>PDF</Button>
        </span>
      </div>

      {data && !data.gradesOpen && (
        <p role="status" className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          O prazo de lançamento de notas terminou. Novas notas só com liberação da Administração.
        </p>
      )}

      <Card className="overflow-hidden">
        <DataTable
          caption="Notas da turma"
          columns={columns}
          rows={data?.rows ?? []}
          loading={loading}
          getRowKey={(row) => row.enrollmentId}
          empty={<EmptyState title="Nenhum aluno inscrito" description="As notas aparecem quando houver alunos inscritos na turma." />}
        />
      </Card>
      {data && (
        <p className="mt-2 text-xs text-slate-500">
          Média mínima para aprovação: {formatGrade(data.minPassingGrade)}. Reprovação por falta acima de 25%.
        </p>
      )}

      {assessmentForm && <AssessmentModal loading={saving} onClose={() => setAssessmentForm(false)} onSave={createAssessment} />}
      {reopening && (
        <PromptModal title="Solicitar liberação do prazo" description="A Administração analisa o pedido e define até quando as notas ficam liberadas." label="Justificativa" submitLabel="Enviar solicitação" minLength={10} loading={saving} onClose={() => setReopening(false)} onSubmit={requestReopening} />
      )}
      <ConfirmDialog
        open={finalizing}
        title="Encerrar turma"
        message="Os resultados (aprovado ou reprovado) serão registrados para todos os alunos. Todos precisam ter todas as notas lançadas."
        confirmLabel="Encerrar turma"
        tone="neutral"
        onConfirm={finalize}
        onClose={() => setFinalizing(false)}
      />
    </div>
  );
}

function AssessmentModal({ loading, onClose, onSave }: { loading: boolean; onClose: () => void; onSave: (payload: { name: string; weight: number; maxScore: number }) => void }) {
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("1");
  const [maxScore, setMaxScore] = useState("10");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const found: Record<string, string> = {};
    if (name.trim().length < 2) found.name = "Informe o nome da avaliação.";
    if (!(Number(weight) > 0)) found.weight = "O peso deve ser maior que zero.";
    if (!(Number(maxScore) > 0)) found.maxScore = "A nota máxima deve ser maior que zero.";
    setErrors(found);
    if (Object.keys(found).length === 0) onSave({ name: name.trim(), weight: Number(weight), maxScore: Number(maxScore) });
  };

  return (
    <FormModal title="Nova avaliação" submitLabel="Criar" size="sm" loading={loading} errors={errors} onSubmit={submit} onClose={onClose}>
      <Field label="Nome" required error={errors.name}>{(c) => <Input {...c} value={name} onChange={(e) => setName(e.target.value)} />}</Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Peso" required error={errors.weight}>{(c) => <Input {...c} type="number" min={0.1} step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />}</Field>
        <Field label="Nota máxima" required error={errors.maxScore}>{(c) => <Input {...c} type="number" min={1} value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />}</Field>
      </div>
    </FormModal>
  );
}

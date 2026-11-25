"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Upload } from "lucide-react";
import PageHeading from "@/components/PageHeading";
import { Badge, Button, Card, EmptyState, Field, FormModal, Skeleton, Textarea } from "@/components/ui";
import { useMessage } from "@/context/MessageContext";
import { useApi } from "@/hooks/useApi";
import {
  RESULT_LABELS,
  SUBMISSION_STATE_LABELS,
  classTitle,
  formatDateTime,
  formatGrade,
  formatPercent,
  formatSchedule,
  semesterLabel,
  statusTone,
} from "@/lib/academic";
import type { AcademicPanel, PanelClass } from "@/types";

/** Share of absences from which the student is at risk (the limit is 25%, RN08). */
const ABSENCE_LIMIT = 25;

export default function PanelPage() {
  const { request } = useApi();
  const [panel, setPanel] = useState<AcademicPanel | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [sending, setSending] = useState<{ id: number; title: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    const result = await request<AcademicPanel>("/me/academic-panel", { silent: true });
    if (result.ok) setPanel(result.data);
    else setFailed(true);
    setLoading(false);
  }, [request]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-6">
      <PageHeading title="Painel acadêmico" description="Suas notas, frequência, atividades e avisos nas turmas em que você está inscrito." />

      {loading && <div className="flex flex-col gap-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-40 w-full" /></div>}

      {failed && (
        <Card className="p-6 text-center">
          <p className="mb-3 text-sm text-slate-700">Não foi possível atualizar o painel.</p>
          <Button onClick={load}>Tentar novamente</Button>
        </Card>
      )}

      {panel && !loading && panel.classes.length === 0 && (
        <Card><EmptyState icon={<BarChart3 className="h-5 w-5" />} title="Nenhuma turma por aqui ainda" description="Quando você se inscrever em turmas, suas notas, frequência e atividades aparecem neste painel." /></Card>
      )}

      {panel && !loading && (
        <div className="flex flex-col gap-5">
          {panel.classes.map((item) => (
            <ClassCard key={item.enrollmentId} item={item} minGrade={panel.minPassingGrade} onSend={(a) => setSending(a)} />
          ))}
        </div>
      )}

      {sending && <SubmitModal activity={sending} onClose={() => setSending(null)} onSent={() => { setSending(null); load(); }} />}
    </div>
  );
}

function ClassCard({ item, minGrade, onSend }: { item: PanelClass; minGrade: number; onSend: (activity: { id: number; title: string }) => void }) {
  const atRisk = item.attendance.absencePercent > ABSENCE_LIMIT;
  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{classTitle(item.class)}</h2>
          <p className="text-sm text-slate-500">
            {semesterLabel(item.class.semester)} · {item.class.teacher?.name ?? "-"} · {formatSchedule(item.class.schedules)}
          </p>
        </div>
        <Badge tone={statusTone(item.result)}>{RESULT_LABELS[item.result]}</Badge>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section aria-label="Notas">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Notas</h3>
          {item.grades.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma avaliação cadastrada.</p>
          ) : (
            <table className="w-full text-sm">
              <caption className="sr-only">Notas de {classTitle(item.class)}</caption>
              <tbody>
                {item.grades.map((grade) => (
                  <tr key={grade.assessmentId} className="border-b border-slate-100">
                    <th scope="row" className="py-1 pr-2 text-left font-normal text-slate-700">{grade.name} <span className="text-xs text-slate-400">(peso {grade.weight})</span></th>
                    <td className="py-1 text-right font-medium">{formatGrade(grade.value)}</td>
                  </tr>
                ))}
                <tr>
                  <th scope="row" className="pt-2 text-left font-semibold">Média</th>
                  <td className="pt-2 text-right font-bold">{formatGrade(item.finalGrade ?? item.partialAverage)}</td>
                </tr>
              </tbody>
            </table>
          )}
          <p className="mt-1 text-xs text-slate-500">Média mínima: {formatGrade(minGrade)}</p>
        </section>

        <section aria-label="Frequência">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Frequência</h3>
          {item.attendance.lessons === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma aula registrada ainda.</p>
          ) : (
            <>
              <p className="text-sm text-slate-700">{item.attendance.absences} falta(s) em {item.attendance.lessons} aula(s)</p>
              <div
                role="progressbar"
                aria-label="Faltas em relação ao limite"
                aria-valuenow={Math.min(item.attendance.absencePercent, 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
              >
                <div className={`h-full ${atRisk ? "bg-red-500" : "bg-brand-500"}`} style={{ width: `${Math.min(item.attendance.absencePercent, 100)}%` }} />
              </div>
              <p className={`mt-1 text-xs ${atRisk ? "font-semibold text-red-700" : "text-slate-500"}`}>
                {formatPercent(item.attendance.absencePercent)} de faltas{atRisk ? ": acima do limite de 25%, reprovação por falta" : " (limite de 25%)"}
              </p>
            </>
          )}
        </section>

        <section aria-label="Atividades">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Atividades</h3>
          {item.activities.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma atividade publicada.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {item.activities.map((activity) => (
                <li key={activity.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span>
                    <span className="font-medium text-slate-900">{activity.title}</span>
                    <span className="block text-xs text-slate-500">Prazo: {formatDateTime(activity.dueAt)}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge tone={statusTone(activity.state)}>{SUBMISSION_STATE_LABELS[activity.state]}</Badge>
                    {item.enrollmentStatus === "confirmed" && activity.state !== "overdue" && (
                      <Button size="sm" variant="secondary" icon={<Upload className="h-4 w-4" />} onClick={() => onSend({ id: activity.id, title: activity.title })}>
                        {activity.submittedAt ? "Reenviar" : "Enviar"}
                      </Button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {item.news.length > 0 && (
        <section aria-label="Avisos" className="mt-5 border-t border-slate-100 pt-4">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Avisos da turma</h3>
          <ul className="flex flex-col gap-2">
            {item.news.map((post) => (
              <li key={post.id} className="text-sm"><span className="font-medium text-slate-900">{post.title}</span> <span className="text-xs text-slate-500">{formatDateTime(post.publishedAt)}</span><p className="text-slate-600">{post.body}</p></li>
            ))}
          </ul>
        </section>
      )}
    </Card>
  );
}

function SubmitModal({ activity, onClose, onSent }: { activity: { id: number; title: string }; onClose: () => void; onSent: () => void }) {
  const { request } = useApi();
  const { showMessage } = useMessage();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!text.trim() && !file) {
      setError("Anexe um arquivo ou escreva uma resposta.");
      return;
    }
    if (file && file.size > 5 * 1024 * 1024) {
      setError("O arquivo excede o tamanho máximo de 5 MB.");
      return;
    }
    const body = new FormData();
    if (text.trim()) body.append("answerText", text.trim());
    if (file) body.append("file", file);
    setSaving(true);
    const result = await request(`/activities/${activity.id}/submissions`, { method: "POST", body });
    setSaving(false);
    if (result.ok) {
      showMessage({ type: "SUCCESS", messages: ["Atividade enviada."] });
      onSent();
    }
  };

  return (
    <FormModal title={`Enviar: ${activity.title}`} description="Enviar de novo substitui o envio anterior." submitLabel="Enviar" loading={saving} errors={{ file: error }} onSubmit={submit} onClose={onClose}>
      <Field label="Resposta" hint="Opcional se você anexar um arquivo.">
        {(c) => <Textarea {...c} rows={4} maxLength={5000} value={text} onChange={(e) => { setText(e.target.value); setError(undefined); }} />}
      </Field>
      <Field label="Arquivo" hint="PDF, imagem, texto, ZIP ou DOCX, até 5 MB." error={error}>
        {(c) => <input {...c} type="file" accept=".pdf,.png,.jpg,.jpeg,.txt,.zip,.docx" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(undefined); }} className="text-sm" />}
      </Field>
    </FormModal>
  );
}

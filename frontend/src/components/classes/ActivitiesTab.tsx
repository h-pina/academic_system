"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Download, Plus } from "lucide-react";
import { Button, Card, EmptyState, Field, FormModal, Input, Textarea } from "@/components/ui";
import { useServerClock } from "@/context/ClockContext";
import { useMessage } from "@/context/MessageContext";
import { useApi } from "@/hooks/useApi";
import { formatDateTime } from "@/lib/academic";
import { downloadFile } from "@/lib/download";
import type { ActivityView, ClassView, SubmissionView } from "@/types";

interface ActivitiesTabProps {
  cls: ClassView;
  canEdit: boolean;
}

export default function ActivitiesTab({ cls, canEdit }: ActivitiesTabProps) {
  const { request } = useApi();
  const { showMessage } = useMessage();
  const [activities, setActivities] = useState<ActivityView[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionView[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await request<ActivityView[]>(`/classes/${cls.id}/activities`);
    setActivities(result.ok ? result.data : []);
    setLoading(false);
  }, [request, cls.id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (activity: ActivityView) => {
    if (open === activity.id) return setOpen(null);
    const result = await request<SubmissionView[]>(`/activities/${activity.id}/submissions`);
    setSubmissions(result.ok ? result.data : []);
    setOpen(activity.id);
  };

  const create = async (payload: { title: string; description: string; dueAt: string; allowLateUntil?: string }) => {
    setSaving(true);
    const result = await request(`/classes/${cls.id}/activities`, { method: "POST", body: JSON.stringify(payload) });
    setSaving(false);
    if (result.ok) {
      showMessage({ type: "SUCCESS", messages: ["Atividade publicada para a turma."] });
      setForm(false);
      load();
    }
  };

  const download = async (submission: SubmissionView) => {
    const error = await downloadFile(`/submissions/${submission.id}/file`, submission.fileName ?? "envio");
    if (error) showMessage({ type: "ERROR", messages: [error] });
  };

  return (
    <div>
      {canEdit && cls.status === "approved" && (
        <div className="mb-4">
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => setForm(true)}>Nova atividade</Button>
        </div>
      )}

      {!loading && activities.length === 0 ? (
        <Card><EmptyState title="Nenhuma atividade publicada" description={canEdit ? "Publique uma atividade com prazo de entrega." : "Ainda não há atividades nesta turma."} /></Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {activities.map((activity) => (
            <li key={activity.id}>
              <Card className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-900">{activity.title}</h3>
                    <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{activity.description}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      Prazo: {formatDateTime(activity.dueAt)}
                      {activity.allowLateUntil && ` · aceita com atraso até ${formatDateTime(activity.allowLateUntil)}`}
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" icon={open === activity.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />} onClick={() => toggle(activity)}>
                    Envios
                  </Button>
                </div>
                {open === activity.id && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    {submissions.length === 0 ? (
                      <p className="text-sm text-slate-500">Nenhum envio ainda.</p>
                    ) : (
                      <ul className="flex flex-col gap-2 text-sm">
                        {submissions.map((submission) => (
                          <li key={submission.id} className="flex flex-wrap items-center justify-between gap-2">
                            <span>
                              <span className="font-medium text-slate-900">{submission.studentName}</span>
                              <span className="ml-2 text-slate-500">{formatDateTime(submission.submittedAt)}{submission.late && " · com atraso"}</span>
                              {submission.answerText && <span className="mt-1 block whitespace-pre-line text-slate-600">{submission.answerText}</span>}
                            </span>
                            {submission.hasFile && (
                              <Button size="sm" variant="ghost" icon={<Download className="h-4 w-4" />} onClick={() => download(submission)}>{submission.fileName}</Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}

      {form && <ActivityModal loading={saving} onClose={() => setForm(false)} onSave={create} />}
    </div>
  );
}

function ActivityModal({ loading, onClose, onSave }: { loading: boolean; onClose: () => void; onSave: (payload: { title: string; description: string; dueAt: string; allowLateUntil?: string }) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [lateUntil, setLateUntil] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { now } = useServerClock();

  const submit = () => {
    const found: Record<string, string> = {};
    if (title.trim().length < 2) found.title = "Informe o título.";
    if (description.trim().length < 2) found.description = "Descreva a atividade.";
    if (!dueAt) found.dueAt = "Informe a data e a hora limite.";
    else if (new Date(dueAt) <= now()) found.dueAt = "O prazo deve estar no futuro.";
    if (lateUntil && dueAt && new Date(lateUntil) <= new Date(dueAt)) found.lateUntil = "O aceite com atraso deve terminar depois do prazo.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSave({
      title: title.trim(),
      description: description.trim(),
      dueAt: new Date(dueAt).toISOString(),
      ...(lateUntil ? { allowLateUntil: new Date(lateUntil).toISOString() } : {}),
    });
  };

  return (
    <FormModal title="Nova atividade" submitLabel="Publicar" loading={loading} errors={errors} onSubmit={submit} onClose={onClose}>
      <Field label="Título" required error={errors.title}>{(c) => <Input {...c} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />}</Field>
      <Field label="Descrição" required error={errors.description}>{(c) => <Textarea {...c} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />}</Field>
      <Field label="Prazo de entrega" required error={errors.dueAt}>{(c) => <Input {...c} type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />}</Field>
      <Field label="Aceitar com atraso até" hint="Opcional. Sem isso, envios após o prazo são recusados." error={errors.lateUntil}>{(c) => <Input {...c} type="datetime-local" value={lateUntil} onChange={(e) => setLateUntil(e.target.value)} />}</Field>
    </FormModal>
  );
}

"use client";

import { useState } from "react";
import { Field, FormModal, Input, Select, Textarea } from "@/components/ui";
import type { NewsView } from "@/types";

export interface NewsPayload {
  title: string;
  body: string;
  classId?: number;
}

interface NewsFormModalProps {
  news: NewsView | null;
  /** Classes the author may post to. */
  classes: { id: number; label: string }[];
  /** Only the Administration can address the whole institution. */
  canBroadcast: boolean;
  /** Fixed target (when opened from a class). */
  fixedClassId?: number;
  loading: boolean;
  onClose: () => void;
  onSave: (payload: NewsPayload) => void;
}

export default function NewsFormModal({ news, classes, canBroadcast, fixedClassId, loading, onClose, onSave }: NewsFormModalProps) {
  const [title, setTitle] = useState(news?.title ?? "");
  const [body, setBody] = useState(news?.body ?? "");
  const [target, setTarget] = useState(String(fixedClassId ?? news?.classId ?? (canBroadcast ? "" : classes[0]?.id ?? "")));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const found: Record<string, string> = {};
    if (title.trim().length < 2) found.title = "Informe o título.";
    if (body.trim().length < 2) found.body = "Escreva o aviso.";
    if (!target && !canBroadcast) found.target = "Escolha a turma.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSave({ title: title.trim(), body: body.trim(), ...(target ? { classId: Number(target) } : {}) });
  };

  return (
    <FormModal title={news ? "Editar aviso" : "Novo aviso"} submitLabel={news ? "Salvar" : "Publicar"} loading={loading} errors={errors} onSubmit={submit} onClose={onClose}>
      {!news && fixedClassId === undefined && (
        <Field label="Destinatários" required error={errors.target}>
          {(c) => (
            <Select {...c} value={target} onChange={(e) => setTarget(e.target.value)}>
              {canBroadcast && <option value="">Toda a instituição</option>}
              {classes.map((item) => (<option key={item.id} value={item.id}>{item.label}</option>))}
            </Select>
          )}
        </Field>
      )}
      <Field label="Título" required error={errors.title}>{(c) => <Input {...c} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />}</Field>
      <Field label="Aviso" required error={errors.body}>{(c) => <Textarea {...c} rows={5} maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} />}</Field>
    </FormModal>
  );
}

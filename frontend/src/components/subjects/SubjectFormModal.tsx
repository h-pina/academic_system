"use client";

import { useMemo, useState } from "react";
import { Field } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { Checkbox, Input, Textarea } from "@/components/ui/Input";
import { useMessage } from "@/context/MessageContext";
import { MAX_WORKLOAD_HOURS, validateSubjectDraft } from "@/lib/validation";
import type { SubjectView } from "@/types";

export interface SubjectSavePayload {
  code: string;
  name: string;
  workloadHours: number;
  description: string;
  prerequisiteIds: number[];
}

interface SubjectFormModalProps {
  subject: SubjectView | null;
  /** Every other subject, offered as possible prerequisites. */
  candidates: SubjectView[];
  loading: boolean;
  onClose: () => void;
  onSave: (payload: SubjectSavePayload) => void;
}

export default function SubjectFormModal({
  subject,
  candidates,
  loading,
  onClose,
  onSave,
}: SubjectFormModalProps) {
  const { showMessage } = useMessage();
  const [code, setCode] = useState(subject?.code ?? "");
  const [name, setName] = useState(subject?.name ?? "");
  const [workloadHours, setWorkloadHours] = useState<number | "">(subject?.workloadHours ?? 60);
  const [description, setDescription] = useState(subject?.description ?? "");
  const [selected, setSelected] = useState<Set<number>>(
    new Set(subject?.prerequisites.map((item) => item.id) ?? []),
  );
  const [filter, setFilter] = useState("");

  const options = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return candidates
      .filter((candidate) => candidate.id !== subject?.id)
      .filter(
        (candidate) =>
          needle === "" ||
          candidate.code.toLowerCase().includes(needle) ||
          candidate.name.toLowerCase().includes(needle),
      );
  }, [candidates, filter, subject?.id]);

  const toggle = (id: number) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleSubmit = () => {
    const errors = validateSubjectDraft({ code, name, workloadHours, description });
    if (errors.length > 0) {
      showMessage({ type: "WARNING", messages: errors });
      return;
    }
    onSave({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      workloadHours: Number(workloadHours),
      description: description.trim(),
      prerequisiteIds: [...selected],
    });
  };

  return (
    <FormModal
      title={subject ? "Editar disciplina" : "Nova disciplina"}
      submitLabel={subject ? "Salvar alterações" : "Cadastrar"}
      size="lg"
      loading={loading}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Código" required>
          {(control) => (
            <Input
              {...control}
              maxLength={20}
              className="uppercase"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          )}
        </Field>
        <Field label="Carga horária (h)" required>
          {(control) => (
            <Input
              {...control}
              type="number"
              min={1}
              max={MAX_WORKLOAD_HOURS}
              value={workloadHours}
              onChange={(event) =>
                setWorkloadHours(event.target.value === "" ? "" : Number(event.target.value))
              }
            />
          )}
        </Field>
      </div>

      <Field label="Nome" required>
        {(control) => (
          <Input {...control} value={name} onChange={(event) => setName(event.target.value)} />
        )}
      </Field>

      <Field label="Descrição">
        {(control) => (
          <Textarea
            {...control}
            rows={2}
            maxLength={500}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        )}
      </Field>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-slate-700">
          Pré-requisitos ({selected.size} selecionado{selected.size === 1 ? "" : "s"})
        </legend>
        <Field label="Filtrar disciplinas" className="mb-2">
          {(control) => (
            <Input
              {...control}
              type="search"
              placeholder="Código ou nome"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
          )}
        </Field>
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
          {options.map((option) => (
            <label
              key={option.id}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50"
            >
              <Checkbox checked={selected.has(option.id)} onChange={() => toggle(option.id)} />
              <span className="font-mono text-xs text-slate-500">{option.code}</span>
              <span className="text-slate-800">{option.name}</span>
            </label>
          ))}
          {options.length === 0 && (
            <p className="px-2 py-3 text-center text-sm text-slate-400">
              Nenhuma disciplina encontrada.
            </p>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Uma disciplina não pode depender dela mesma, direta ou indiretamente.
        </p>
      </fieldset>
    </FormModal>
  );
}

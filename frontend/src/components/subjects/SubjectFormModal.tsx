"use client";

import { useMemo, useState } from "react";
import Button from "@/components/Button";
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
  const [workloadHours, setWorkloadHours] = useState<number | "">(
    subject?.workloadHours ?? 60,
  );
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

  const handleSave = () => {
    const errors = validateSubjectDraft({
      code,
      name,
      workloadHours,
      description,
    });
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
    <div className="modal-backdrop">
      <div className="modal-card max-h-[90vh] max-w-xl overflow-y-auto">
        <h3 className="modal-title">
          {subject ? "Editar disciplina" : "Nova disciplina"}
        </h3>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Código *</span>
              <input
                type="text"
                maxLength={20}
                className="field-input uppercase"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="field-label">Carga horária (h) *</span>
              <input
                type="number"
                min={1}
                max={MAX_WORKLOAD_HOURS}
                className="field-input"
                value={workloadHours}
                onChange={(event) =>
                  setWorkloadHours(
                    event.target.value === "" ? "" : Number(event.target.value),
                  )
                }
              />
            </label>
          </div>

          <label className="block">
            <span className="field-label">Nome *</span>
            <input
              type="text"
              className="field-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <label className="block">
            <span className="field-label">Descrição</span>
            <textarea
              rows={2}
              maxLength={500}
              className="field-input"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>

          <div>
            <span className="field-label">
              Pré-requisitos ({selected.size} selecionado
              {selected.size === 1 ? "" : "s"})
            </span>
            <input
              type="search"
              className="field-input mb-2"
              placeholder="Filtrar disciplinas"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
            />
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {options.map((option) => (
                <label
                  key={option.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(option.id)}
                    onChange={() => toggle(option.id)}
                  />
                  <span className="font-mono text-xs text-slate-500">
                    {option.code}
                  </span>
                  <span className="text-slate-800">{option.name}</span>
                </label>
              ))}
              {options.length === 0 && (
                <p className="px-2 py-3 text-center text-sm text-slate-400">
                  Nenhuma disciplina encontrada.
                </p>
              )}
            </div>
            <span className="field-hint">
              A API recusa ciclos (uma disciplina não pode depender dela
              mesma, direta ou indiretamente).
            </span>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4">
          <Button label="Cancelar" variant="cancel" onClick={onClose} />
          <Button
            label={subject ? "Salvar alterações" : "Cadastrar"}
            variant="save"
            loading={loading}
            onClick={handleSave}
          />
        </div>
      </div>
    </div>
  );
}

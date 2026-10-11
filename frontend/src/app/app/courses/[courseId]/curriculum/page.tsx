"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import PageHeading from "@/components/PageHeading";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox, Input, Select } from "@/components/ui/Input";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMessage } from "@/context/MessageContext";
import { useAllItems } from "@/hooks/useAllItems";
import { useApi } from "@/hooks/useApi";
import { usePermissions } from "@/hooks/usePermissions";
import { availableSubjects, fillSemesters } from "@/lib/curriculum";
import type { CurriculumSubject, CurriculumView, SubjectView } from "@/types";

export default function CurriculumPage() {
  const params = useParams<{ courseId: string }>();
  const courseId = Number(params.courseId);
  const { request } = useApi();
  const { showMessage } = useMessage();
  const { canManage } = usePermissions();

  const [curriculum, setCurriculum] = useState<CurriculumView | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [adding, setAdding] = useState<number | null>(null);
  const [toRemove, setToRemove] = useState<CurriculumSubject | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const result = await request<CurriculumView>(`/courses/${courseId}/curriculum`, {
      silent: true,
    });
    if (result.ok) {
      setCurriculum(result.data);
      setNotFound(false);
    } else {
      setNotFound(true);
    }
  }, [request, courseId]);

  useEffect(() => {
    load();
  }, [load]);

  const semesters = useMemo(
    () => (curriculum ? fillSemesters(curriculum.semesters, curriculum.totalSemesters) : []),
    [curriculum],
  );

  const mutate = async (
    path: string,
    init: RequestInit,
    successMessage: string,
  ): Promise<boolean> => {
    setBusy(true);
    const result = await request<CurriculumView | null>(path, init);
    setBusy(false);

    if (result.ok) {
      showMessage({ type: "SUCCESS", messages: [successMessage] });
      await load();
    }
    return result.ok;
  };

  const base = `/courses/${courseId}/curriculum`;

  const moveSubject = (item: CurriculumSubject, semester: number) =>
    mutate(
      `${base}/${item.subjectId}`,
      { method: "PATCH", body: JSON.stringify({ semester }) },
      "Disciplina movida de semestre.",
    );

  const toggleMandatory = (item: CurriculumSubject) =>
    mutate(
      `${base}/${item.subjectId}`,
      { method: "PATCH", body: JSON.stringify({ mandatory: !item.mandatory }) },
      "Obrigatoriedade atualizada.",
    );

  const confirmRemove = async () => {
    if (!toRemove) return;
    const target = toRemove;
    setToRemove(null);
    await mutate(`${base}/${target.subjectId}`, { method: "DELETE" }, "Disciplina removida da matriz.");
  };

  const addSubject = async (subjectId: number, semester: number, mandatory: boolean) => {
    const ok = await mutate(
      base,
      { method: "POST", body: JSON.stringify({ subjectId, semester, mandatory }) },
      "Disciplina adicionada à matriz.",
    );
    if (ok) setAdding(null);
  };

  if (notFound) {
    return (
      <div className="p-6">
        <Card>
          <EmptyState
            title="Curso não encontrado"
            description="Volte para a lista de cursos e escolha outro."
          />
        </Card>
      </div>
    );
  }

  if (!curriculum) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  const placedIds = new Set(
    curriculum.semesters.flatMap((entry) => entry.items.map((item) => item.subjectId)),
  );

  return (
    <div className="p-6">
      <PageHeading
        title={`Matriz curricular — ${curriculum.courseName}`}
        description={`${curriculum.totalSemesters} semestres · ${curriculum.totalWorkloadHours} h no total`}
      />

      <div className="space-y-4">
        {semesters.map((entry) => (
          <Card
            key={entry.semester}
            className="overflow-hidden"
            role="region"
            aria-labelledby={`semester-${entry.semester}`}
          >
            <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
              <h2 id={`semester-${entry.semester}`} className="text-sm font-semibold text-slate-700">
                {entry.semester}º semestre
                <span className="ml-2 font-normal tabular-nums text-slate-500">
                  {entry.workloadHours} h
                </span>
              </h2>
              {canManage && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Plus className="h-4 w-4" />}
                  onClick={() => setAdding(entry.semester)}
                >
                  Adicionar disciplina
                </Button>
              )}
            </header>

            {entry.items.length === 0 ? (
              <p className="px-4 py-4 text-sm text-slate-400">
                Nenhuma disciplina neste semestre.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {entry.items.map((item) => (
                  <li
                    key={item.subjectId}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
                  >
                    <span className="w-24 font-mono text-xs text-slate-500">{item.code}</span>
                    <span className="min-w-[10rem] flex-1 font-medium text-slate-900">
                      {item.name}
                    </span>
                    <span className="text-sm tabular-nums text-slate-500">
                      {item.workloadHours} h
                    </span>
                    <Badge tone={item.mandatory ? "success" : "neutral"}>
                      {item.mandatory ? "Obrigatória" : "Optativa"}
                    </Badge>
                    <span className="min-w-[8rem] text-xs text-slate-500">
                      {item.prerequisites.length > 0
                        ? `Requer: ${item.prerequisites.map((p) => p.code).join(", ")}`
                        : ""}
                    </span>

                    {canManage && (
                      <div className="flex items-center gap-2">
                        <Select
                          aria-label={`Semestre de ${item.name}`}
                          className="!w-auto py-1"
                          value={entry.semester}
                          disabled={busy}
                          onChange={(event) => moveSubject(item, Number(event.target.value))}
                        >
                          {semesters.map((option) => (
                            <option key={option.semester} value={option.semester}>
                              {option.semester}º
                            </option>
                          ))}
                        </Select>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => toggleMandatory(item)}
                        >
                          {item.mandatory ? "Tornar optativa" : "Tornar obrigatória"}
                        </Button>
                        <IconButton
                          label={`Remover ${item.name} da matriz`}
                          onClick={() => setToRemove(item)}
                          className="hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </IconButton>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>

      {adding !== null && (
        <AddSubjectModal
          semester={adding}
          placedIds={placedIds}
          busy={busy}
          onClose={() => setAdding(null)}
          onAdd={addSubject}
        />
      )}

      <ConfirmDialog
        open={toRemove !== null}
        title="Remover da matriz"
        message={`"${toRemove?.name}" será removida da matriz deste curso. A disciplina continua cadastrada.`}
        confirmLabel="Remover"
        onConfirm={confirmRemove}
        onClose={() => setToRemove(null)}
      />
    </div>
  );
}

interface AddSubjectModalProps {
  semester: number;
  placedIds: ReadonlySet<number>;
  busy: boolean;
  onClose: () => void;
  onAdd: (subjectId: number, semester: number, mandatory: boolean) => void;
}

function AddSubjectModal({ semester, placedIds, busy, onClose, onAdd }: AddSubjectModalProps) {
  const subjects = useAllItems<SubjectView>("/subjects");
  const [term, setTerm] = useState("");
  const [mandatory, setMandatory] = useState(true);

  const options = availableSubjects(subjects.items, placedIds, term);

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={`Adicionar ao ${semester}º semestre`}
      description="Escolha a disciplina que entra neste semestre."
      size="lg"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      <div className="space-y-3">
        <Field label="Buscar disciplina">
          {(control) => (
            <Input
              {...control}
              type="search"
              placeholder="Código ou nome"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
            />
          )}
        </Field>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <Checkbox checked={mandatory} onChange={(event) => setMandatory(event.target.checked)} />
          Disciplina obrigatória
        </label>

        <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
          {options.map((subject) => (
            <li key={subject.id}>
              <button
                type="button"
                disabled={busy}
                onClick={() => onAdd(subject.id, semester, mandatory)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-brand-50 disabled:opacity-50"
              >
                <span className="w-24 font-mono text-xs text-slate-500">{subject.code}</span>
                <span className="flex-1 text-slate-900">{subject.name}</span>
                <span className="tabular-nums text-slate-500">{subject.workloadHours} h</span>
              </button>
            </li>
          ))}
          {!subjects.loading && options.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-slate-400">
              Nenhuma disciplina disponível.
            </li>
          )}
        </ul>
      </div>
    </Modal>
  );
}

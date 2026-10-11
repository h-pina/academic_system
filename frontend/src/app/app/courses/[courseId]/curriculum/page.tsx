"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import Button from "@/components/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { StatusBadge } from "@/components/ui/Badge";
import { useMessage } from "@/context/MessageContext";
import { useAllItems } from "@/hooks/useAllItems";
import { useApi } from "@/hooks/useApi";
import { usePermissions } from "@/hooks/usePermissions";
import { availableSubjects, fillSemesters } from "@/lib/curriculum";
import type {
  CurriculumSubject,
  CurriculumView,
  SubjectView,
} from "@/types";

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
    const result = await request<CurriculumView>(
      `/courses/${courseId}/curriculum`,
      { silent: true },
    );
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
    () =>
      curriculum
        ? fillSemesters(curriculum.semesters, curriculum.totalSemesters)
        : [],
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
    await mutate(
      `${base}/${target.subjectId}`,
      { method: "DELETE" },
      "Disciplina removida da matriz.",
    );
  };

  const addSubject = async (
    subjectId: number,
    semester: number,
    mandatory: boolean,
  ) => {
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
        <div className="card p-8 text-center text-sm text-slate-500">
          Curso não encontrado.
        </div>
      </div>
    );
  }

  if (!curriculum) {
    return <div className="p-6 text-sm text-slate-500">Carregando matriz…</div>;
  }

  const placedIds = new Set(
    curriculum.semesters.flatMap((entry) => entry.items.map((i) => i.subjectId)),
  );

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/app/courses"
            className="mb-1 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600"
          >
            <ArrowLeft className="h-4 w-4" /> Cursos
          </Link>
          <h2 className="text-lg font-semibold text-slate-900">
            Matriz curricular — {curriculum.courseName}
          </h2>
          <p className="text-sm text-slate-500">
            {curriculum.totalSemesters} semestres · {curriculum.totalWorkloadHours}{" "}
            h no total
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {semesters.map((entry) => (
          <section key={entry.semester} className="card overflow-hidden">
            <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
              <h3 className="text-sm font-semibold text-slate-700">
                {entry.semester}º semestre
                <span className="ml-2 font-normal text-slate-500">
                  {entry.workloadHours} h
                </span>
              </h3>
              {canManage && (
                <button
                  type="button"
                  onClick={() => setAdding(entry.semester)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-brand-600 transition-colors hover:bg-brand-50"
                >
                  <Plus className="h-4 w-4" /> Adicionar disciplina
                </button>
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
                    <span className="w-24 font-mono text-xs text-slate-500">
                      {item.code}
                    </span>
                    <span className="min-w-[10rem] flex-1 font-medium text-slate-900">
                      {item.name}
                    </span>
                    <span className="text-sm text-slate-500">
                      {item.workloadHours} h
                    </span>
                    <StatusBadge
                      label={item.mandatory ? "Obrigatória" : "Optativa"}
                      tone={item.mandatory ? "success" : "neutral"}
                    />
                    <span className="min-w-[8rem] text-xs text-slate-500">
                      {item.prerequisites.length > 0
                        ? `Requer: ${item.prerequisites.map((p) => p.code).join(", ")}`
                        : ""}
                    </span>

                    {canManage && (
                      <div className="flex items-center gap-1">
                        <select
                          aria-label="Mover para o semestre"
                          className="rounded-lg border border-slate-300 bg-surface px-2 py-1 text-sm"
                          value={entry.semester}
                          disabled={busy}
                          onChange={(event) =>
                            moveSubject(item, Number(event.target.value))
                          }
                        >
                          {semesters.map((option) => (
                            <option key={option.semester} value={option.semester}>
                              {option.semester}º
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => toggleMandatory(item)}
                          className="rounded-lg border border-slate-300 bg-surface px-2 py-1 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                        >
                          {item.mandatory ? "Tornar optativa" : "Tornar obrigatória"}
                        </button>
                        <Button
                          variant="delete"
                          hint="Remover da matriz"
                          onClick={() => setToRemove(item)}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
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
        message={`Remover "${toRemove?.name}" da matriz deste curso? A disciplina continua cadastrada.`}
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

function AddSubjectModal({
  semester,
  placedIds,
  busy,
  onClose,
  onAdd,
}: AddSubjectModalProps) {
  const subjects = useAllItems<SubjectView>("/subjects");
  const [term, setTerm] = useState("");
  const [mandatory, setMandatory] = useState(true);

  const options = availableSubjects(subjects.items, placedIds, term);

  return (
    <div className="modal-backdrop">
      <div className="modal-card max-h-[90vh] max-w-xl overflow-y-auto">
        <h3 className="modal-title">Adicionar ao {semester}º semestre</h3>

        <input
          type="search"
          className="field-input mb-3"
          placeholder="Buscar disciplina"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
        />

        <label className="mb-3 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={mandatory}
            onChange={(event) => setMandatory(event.target.checked)}
          />
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
                <span className="w-24 font-mono text-xs text-slate-500">
                  {subject.code}
                </span>
                <span className="flex-1 text-slate-900">{subject.name}</span>
                <span className="text-slate-500">{subject.workloadHours} h</span>
              </button>
            </li>
          ))}
          {!subjects.loading && options.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-slate-400">
              Nenhuma disciplina disponível.
            </li>
          )}
        </ul>

        <div className="mt-6 flex justify-end border-t border-slate-200 pt-4">
          <Button label="Fechar" variant="close" onClick={onClose} />
        </div>
      </div>
    </div>
  );
}

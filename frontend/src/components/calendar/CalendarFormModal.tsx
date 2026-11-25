"use client";

import { useState } from "react";
import { Field } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { Input } from "@/components/ui/Input";
import { useFormErrors } from "@/hooks/useFormErrors";
import { calendarProblems, type CalendarDraft } from "@/lib/academic";
import type { FieldErrors } from "@/lib/fieldErrors";
import type { AcademicCalendar } from "@/types";

interface CalendarFormModalProps {
  calendar: AcademicCalendar | null;
  loading: boolean;
  errors?: FieldErrors;
  onClose: () => void;
  onSave: (payload: CalendarDraft) => void;
}

const DATE_FIELDS: { key: Exclude<keyof CalendarDraft, "description">; label: string; hint?: string }[] = [
  { key: "startDate", label: "Início do período letivo" },
  { key: "endDate", label: "Fim do período letivo" },
  { key: "enrollmentStart", label: "Início das inscrições" },
  { key: "enrollmentEnd", label: "Fim das inscrições" },
  {
    key: "withdrawalDeadline",
    label: "Prazo de cancelamento e trancamento",
    hint: "Depois dessa data o aluno não cancela nem tranca a inscrição.",
  },
  {
    key: "gradesDeadline",
    label: "Prazo de lançamento de notas",
    hint: "Depois dele, só com liberação da Administração.",
  },
];

export default function CalendarFormModal({
  calendar,
  loading,
  errors: serverErrors,
  onClose,
  onSave,
}: CalendarFormModalProps) {
  const form = useFormErrors(serverErrors);
  const [draft, setDraft] = useState<CalendarDraft>({
    description: calendar?.description ?? "",
    startDate: calendar?.startDate ?? "",
    endDate: calendar?.endDate ?? "",
    enrollmentStart: calendar?.enrollmentStart ?? "",
    enrollmentEnd: calendar?.enrollmentEnd ?? "",
    withdrawalDeadline: calendar?.withdrawalDeadline ?? "",
    gradesDeadline: calendar?.gradesDeadline ?? "",
  });

  const set = (key: keyof CalendarDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
    form.clear(key);
  };

  const handleSubmit = () => {
    const found = calendarProblems(draft);
    if (Object.keys(found).length > 0) {
      form.setErrors(found as FieldErrors);
      return;
    }
    onSave({ ...draft, description: draft.description.trim() });
  };

  return (
    <FormModal
      title={calendar ? "Editar calendário" : "Novo calendário acadêmico"}
      submitLabel={calendar ? "Salvar alterações" : "Cadastrar"}
      loading={loading}
      errors={form.errors}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <Field label="Descrição" required error={form.errors.description}>
        {(control) => (
          <Input {...control} maxLength={120} value={draft.description} onChange={(e) => set("description", e.target.value)} />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        {DATE_FIELDS.map((field) => (
          <Field key={field.key} label={field.label} hint={field.hint} required error={form.errors[field.key]}>
            {(control) => (
              <Input {...control} type="date" value={draft[field.key]} onChange={(e) => set(field.key, e.target.value)} />
            )}
          </Field>
        ))}
      </div>
    </FormModal>
  );
}

"use client";

import { useState } from "react";
import { Field } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { Input, Textarea } from "@/components/ui/Input";

interface PromptModalProps {
  title: string;
  description?: string;
  label: string;
  submitLabel: string;
  /** `date`, a long text, or a short text. */
  kind?: "text" | "textarea" | "date";
  minLength?: number;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
}

/** Asks for one value (a reason, a justification, a date) before an action. */
export default function PromptModal({
  title,
  description,
  label,
  submitLabel,
  kind = "textarea",
  minLength = 1,
  loading,
  onClose,
  onSubmit,
}: PromptModalProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();

  const handleSubmit = () => {
    if (value.trim().length < minLength) {
      setError(
        kind === "date"
          ? "Informe a data."
          : `Escreva pelo menos ${minLength} caracteres.`,
      );
      return;
    }
    onSubmit(value.trim());
  };

  return (
    <FormModal
      title={title}
      description={description}
      submitLabel={submitLabel}
      size="sm"
      loading={loading}
      errors={{ value: error }}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <Field label={label} required error={error}>
        {(control) =>
          kind === "textarea" ? (
            <Textarea {...control} rows={4} maxLength={500} value={value} onChange={(e) => { setValue(e.target.value); setError(undefined); }} />
          ) : (
            <Input {...control} type={kind} value={value} onChange={(e) => { setValue(e.target.value); setError(undefined); }} />
          )
        }
      </Field>
    </FormModal>
  );
}

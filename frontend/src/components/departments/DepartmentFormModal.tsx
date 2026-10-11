"use client";

import { useState } from "react";
import { Field } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { Input } from "@/components/ui/Input";
import { useFormErrors } from "@/hooks/useFormErrors";
import type { FieldErrors } from "@/lib/fieldErrors";
import { departmentFieldErrors } from "@/lib/validation";
import type { Department } from "@/types";

interface DepartmentFormModalProps {
  department: Department | null;
  loading: boolean;
  /** Validation errors returned by the API, keyed by field. */
  errors?: FieldErrors;
  onClose: () => void;
  onSave: (payload: { name: string; code: string }) => void;
}

export default function DepartmentFormModal({
  department,
  loading,
  errors: serverErrors,
  onClose,
  onSave,
}: DepartmentFormModalProps) {
  const form = useFormErrors(serverErrors);
  const [name, setName] = useState(department?.name ?? "");
  const [code, setCode] = useState(department?.code ?? "");

  const handleSubmit = () => {
    const found = departmentFieldErrors({ name, code });
    if (Object.keys(found).length > 0) {
      form.setErrors(found as FieldErrors);
      return;
    }
    onSave({ name: name.trim(), code: code.trim().toUpperCase() });
  };

  return (
    <FormModal
      title={department ? "Editar departamento" : "Novo departamento"}
      submitLabel={department ? "Salvar alterações" : "Cadastrar"}
      size="sm"
      loading={loading}
      errors={form.errors}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <Field label="Nome" required error={form.errors.name}>
        {(control) => (
          <Input
            {...control}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              form.clear("name");
            }}
          />
        )}
      </Field>

      <Field label="Código" required error={form.errors.code} hint="Ex.: DCC. Deve ser único.">
        {(control) => (
          <Input
            {...control}
            maxLength={20}
            className="uppercase"
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              form.clear("code");
            }}
          />
        )}
      </Field>
    </FormModal>
  );
}

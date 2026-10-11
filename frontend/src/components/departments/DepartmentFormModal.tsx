"use client";

import { useState } from "react";
import { Field } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { Input } from "@/components/ui/Input";
import { useMessage } from "@/context/MessageContext";
import { validateDepartmentDraft } from "@/lib/validation";
import type { Department } from "@/types";

interface DepartmentFormModalProps {
  department: Department | null;
  loading: boolean;
  onClose: () => void;
  onSave: (payload: { name: string; code: string }) => void;
}

export default function DepartmentFormModal({
  department,
  loading,
  onClose,
  onSave,
}: DepartmentFormModalProps) {
  const { showMessage } = useMessage();
  const [name, setName] = useState(department?.name ?? "");
  const [code, setCode] = useState(department?.code ?? "");

  const handleSubmit = () => {
    const errors = validateDepartmentDraft({ name, code });
    if (errors.length > 0) {
      showMessage({ type: "WARNING", messages: errors });
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
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <Field label="Nome" required>
        {(control) => (
          <Input {...control} value={name} onChange={(event) => setName(event.target.value)} />
        )}
      </Field>

      <Field label="Código" required hint="Ex.: DCC. Deve ser único.">
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
    </FormModal>
  );
}

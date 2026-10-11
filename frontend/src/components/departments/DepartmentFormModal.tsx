"use client";

import { useState } from "react";
import Button from "@/components/Button";
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

  const handleSave = () => {
    const errors = validateDepartmentDraft({ name, code });
    if (errors.length > 0) {
      showMessage({ type: "WARNING", messages: errors });
      return;
    }
    onSave({ name: name.trim(), code: code.trim().toUpperCase() });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card max-w-md">
        <h3 className="modal-title">
          {department ? "Editar departamento" : "Novo departamento"}
        </h3>

        <div className="space-y-4">
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
            <span className="field-label">Código *</span>
            <input
              type="text"
              maxLength={20}
              className="field-input uppercase"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
            <span className="field-hint">Ex.: DCC. Deve ser único.</span>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4">
          <Button label="Cancelar" variant="cancel" onClick={onClose} />
          <Button
            label={department ? "Salvar alterações" : "Cadastrar"}
            variant="save"
            loading={loading}
            onClick={handleSave}
          />
        </div>
      </div>
    </div>
  );
}

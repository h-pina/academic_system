"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import { useMessage } from "@/context/MessageContext";
import { useApi } from "@/hooks/useApi";
import { isValidCpf, sanitizeCpf } from "@/lib/cpf";
import { formatCpf } from "@/lib/format";
import type { User } from "@/types";

export interface UserDraft {
  cpf: string;
  name: string;
  email: string;
  password?: string;
}

interface UserFormModalProps {
  user: User | UserDraft;
  editing: boolean;
  loading: boolean;
  onClose: () => void;
  onSave: (draft: UserDraft) => void;
}

export default function UserFormModal({
  user,
  editing,
  loading,
  onClose,
  onSave,
}: UserFormModalProps) {
  const { showMessage } = useMessage();
  const { request } = useApi();

  const [draft, setDraft] = useState<UserDraft>({
    cpf: user.cpf,
    name: user.name,
    email: user.email,
    password: "",
  });

  useEffect(() => {
    setDraft({
      cpf: user.cpf,
      name: user.name,
      email: user.email,
      password: "",
    });
  }, [user]);

  const checkCpfTaken = async () => {
    const cleanCpf = sanitizeCpf(draft.cpf);
    if (cleanCpf.length !== 11) return;

    const result = await request<{ exists: boolean }>(
      `/users/${cleanCpf}/exists`,
    );
    if (result.ok && result.data.exists) {
      showMessage({
        type: "WARNING",
        messages: ["Já existe um usuário com este CPF."],
      });
    }
  };

  const handleSave = () => {
    const cleanCpf = sanitizeCpf(draft.cpf);

    if (!editing && !isValidCpf(cleanCpf)) {
      showMessage({
        type: "WARNING",
        messages: ["Informe um CPF válido."],
      });
      return;
    }
    if (draft.name.trim().length < 3) {
      showMessage({
        type: "WARNING",
        messages: ["O nome deve ter pelo menos 3 caracteres."],
      });
      return;
    }
    if (!editing && draft.password && draft.password.length < 8) {
      showMessage({
        type: "WARNING",
        messages: ["A senha deve ter pelo menos 8 caracteres."],
      });
      return;
    }

    onSave({
      cpf: cleanCpf,
      name: draft.name.trim(),
      email: draft.email.trim(),
      password: draft.password ? draft.password : undefined,
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card max-w-lg">
        <h3 className="modal-title">{editing ? "Editar usuário" : "Novo usuário"}</h3>

        <div className="space-y-4">
          <label className="block">
            <span className="field-label">CPF *</span>
            <input
              type="text"
              maxLength={14}
              className="field-input"
              value={editing ? formatCpf(draft.cpf) : draft.cpf}
              onChange={(event) =>
                setDraft((prev) => ({
                  ...prev,
                  cpf: event.target.value.replace(/\D/g, ""),
                }))
              }
              onBlur={editing ? undefined : checkCpfTaken}
              readOnly={editing}
              disabled={editing}
            />
          </label>

          <label className="block">
            <span className="field-label">Nome *</span>
            <input
              type="text"
              className="field-input"
              value={draft.name}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, name: event.target.value }))
              }
            />
          </label>

          <label className="block">
            <span className="field-label">E-mail *</span>
            <input
              type="email"
              className="field-input"
              value={draft.email}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, email: event.target.value }))
              }
            />
          </label>

          {!editing && (
            <label className="block">
              <span className="field-label">Senha</span>
              <input
                type="password"
                className="field-input"
                value={draft.password ?? ""}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
              />
              <span className="field-hint">
                Deixe em branco para que a pessoa defina a senha no primeiro acesso.
              </span>
            </label>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4">
          <Button label="Cancelar" variant="cancel" onClick={onClose} />
          <Button
            label={editing ? "Salvar alterações" : "Cadastrar"}
            variant="save"
            loading={loading}
            onClick={handleSave}
          />
        </div>
      </div>
    </div>
  );
}

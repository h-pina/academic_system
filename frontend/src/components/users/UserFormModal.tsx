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
        messages: ["A user with this CPF is already registered."],
      });
    }
  };

  const handleSave = () => {
    const cleanCpf = sanitizeCpf(draft.cpf);

    if (!editing && !isValidCpf(cleanCpf)) {
      showMessage({
        type: "WARNING",
        messages: ["Please enter a valid CPF."],
      });
      return;
    }
    if (draft.name.trim().length < 3) {
      showMessage({
        type: "WARNING",
        messages: ["Name must be at least 3 characters long."],
      });
      return;
    }
    if (!editing && draft.password && draft.password.length < 8) {
      showMessage({
        type: "WARNING",
        messages: ["The password must be at least 8 characters long."],
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
        <h3 className="modal-title">{editing ? "Edit user" : "New user"}</h3>

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
            <span className="field-label">Name *</span>
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
            <span className="field-label">Email *</span>
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
              <span className="field-label">Password</span>
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
                Leave blank to let the user set it on first sign-in.
              </span>
            </label>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4">
          <Button label="Cancel" variant="cancel" onClick={onClose} />
          <Button
            label={editing ? "Save changes" : "Create"}
            variant="save"
            loading={loading}
            onClick={handleSave}
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import { useMessage } from "@/context/MessageContext";
import { useApi } from "@/hooks/useApi";
import { sanitizeCpf } from "@/lib/cpf";
import { formatCpf } from "@/lib/format";
import {
  PROFILE_STATUS_LABELS,
  STAFF_ROLE_LABELS,
  toOptions,
} from "@/lib/labels";
import { validateStaffDraft } from "@/lib/validation";
import type { ProfileStatus, StaffRole, StaffView } from "@/types";

export interface StaffSavePayload {
  cpf: string;
  name?: string;
  email?: string;
  role: StaffRole;
  status?: ProfileStatus;
}

interface StaffFormModalProps {
  /** `null` creates a new staff member; otherwise the one being edited. */
  staff: StaffView | null;
  loading: boolean;
  onClose: () => void;
  onSave: (payload: StaffSavePayload) => void;
}

export default function StaffFormModal({
  staff,
  loading,
  onClose,
  onSave,
}: StaffFormModalProps) {
  const editing = staff !== null;
  const { showMessage } = useMessage();
  const { request } = useApi();

  const [cpf, setCpf] = useState(staff?.cpf ?? "");
  const [name, setName] = useState(staff?.name ?? "");
  const [email, setEmail] = useState(staff?.email ?? "");
  const [role, setRole] = useState<StaffRole>(staff?.role ?? "secretary");
  const [status, setStatus] = useState<ProfileStatus>(staff?.status ?? "active");
  const [existingUser, setExistingUser] = useState(false);

  useEffect(() => {
    setExistingUser(false);
  }, [cpf]);

  const checkExistingPerson = async () => {
    const digits = sanitizeCpf(cpf);
    if (editing || digits.length !== 11) return;

    const result = await request<{ exists: boolean }>(
      `/users/${digits}/exists`,
      { silent: true },
    );
    if (result.ok) setExistingUser(result.data.exists);
  };

  const handleSave = () => {
    const errors = editing
      ? []
      : validateStaffDraft({ cpf, name, email }, { existingUser });

    if (errors.length > 0) {
      showMessage({ type: "WARNING", messages: errors });
      return;
    }

    onSave(
      editing
        ? { cpf: staff.cpf, role, status }
        : {
            cpf: sanitizeCpf(cpf),
            ...(existingUser ? {} : { name: name.trim(), email: email.trim() }),
            role,
          },
    );
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card max-w-lg">
        <h3 className="modal-title">
          {editing ? "Editar funcionário" : "Novo funcionário"}
        </h3>

        <div className="space-y-4">
          {editing ? (
            <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
              <p className="font-semibold text-slate-900">{staff.name}</p>
              <p className="text-slate-500">CPF {formatCpf(staff.cpf)}</p>
            </div>
          ) : (
            <>
              <label className="block">
                <span className="field-label">CPF *</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={14}
                  className="field-input"
                  value={formatCpf(cpf)}
                  onChange={(event) => setCpf(event.target.value.replace(/\D/g, ""))}
                  onBlur={checkExistingPerson}
                />
                {existingUser && (
                  <span className="field-hint">
                    Esta pessoa já está cadastrada: nome e e-mail serão mantidos.
                  </span>
                )}
              </label>

              <label className="block">
                <span className="field-label">Nome *</span>
                <input
                  type="text"
                  className="field-input"
                  value={name}
                  disabled={existingUser}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>

              <label className="block">
                <span className="field-label">E-mail *</span>
                <input
                  type="email"
                  className="field-input"
                  value={email}
                  disabled={existingUser}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>
            </>
          )}

          <label className="block">
            <span className="field-label">Papel *</span>
            <select
              className="field-input"
              value={role}
              onChange={(event) => setRole(event.target.value as StaffRole)}
            >
              {toOptions(STAFF_ROLE_LABELS).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="field-hint">
              O administrador também tem todas as permissões da secretaria.
            </span>
          </label>

          {editing && (
            <label className="block">
              <span className="field-label">Situação *</span>
              <select
                className="field-input"
                value={status}
                onChange={(event) => setStatus(event.target.value as ProfileStatus)}
              >
                {toOptions(PROFILE_STATUS_LABELS).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
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

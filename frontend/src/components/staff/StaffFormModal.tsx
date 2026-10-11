"use client";

import { useEffect, useState } from "react";
import { Field } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { Input, Select } from "@/components/ui/Input";
import { useMessage } from "@/context/MessageContext";
import { useApi } from "@/hooks/useApi";
import { sanitizeCpf } from "@/lib/cpf";
import { formatCpf } from "@/lib/format";
import { PROFILE_STATUS_LABELS, STAFF_ROLE_LABELS, toOptions } from "@/lib/labels";
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

    const result = await request<{ exists: boolean }>(`/users/${digits}/exists`, {
      silent: true,
    });
    if (result.ok) setExistingUser(result.data.exists);
  };

  const handleSubmit = () => {
    const errors = editing ? [] : validateStaffDraft({ cpf, name, email }, { existingUser });

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
    <FormModal
      title={editing ? "Editar funcionário" : "Novo funcionário"}
      submitLabel={editing ? "Salvar alterações" : "Cadastrar"}
      loading={loading}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      {editing ? (
        <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
          <p className="font-semibold text-slate-900">{staff.name}</p>
          <p className="text-slate-500">CPF {formatCpf(staff.cpf)}</p>
        </div>
      ) : (
        <>
          <Field
            label="CPF"
            required
            hint={
              existingUser
                ? "Esta pessoa já está cadastrada: nome e e-mail serão mantidos."
                : undefined
            }
          >
            {(control) => (
              <Input
                {...control}
                inputMode="numeric"
                maxLength={14}
                value={formatCpf(cpf)}
                onChange={(event) => setCpf(event.target.value.replace(/\D/g, ""))}
                onBlur={checkExistingPerson}
              />
            )}
          </Field>

          <Field label="Nome" required>
            {(control) => (
              <Input
                {...control}
                value={name}
                disabled={existingUser}
                onChange={(event) => setName(event.target.value)}
              />
            )}
          </Field>

          <Field label="E-mail" required>
            {(control) => (
              <Input
                {...control}
                type="email"
                value={email}
                disabled={existingUser}
                onChange={(event) => setEmail(event.target.value)}
              />
            )}
          </Field>
        </>
      )}

      <Field
        label="Papel"
        required
        hint="O administrador também tem todas as permissões da secretaria."
      >
        {(control) => (
          <Select
            {...control}
            value={role}
            onChange={(event) => setRole(event.target.value as StaffRole)}
          >
            {toOptions(STAFF_ROLE_LABELS).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        )}
      </Field>

      {editing && (
        <Field label="Situação" required>
          {(control) => (
            <Select
              {...control}
              value={status}
              onChange={(event) => setStatus(event.target.value as ProfileStatus)}
            >
              {toOptions(PROFILE_STATUS_LABELS).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}
    </FormModal>
  );
}

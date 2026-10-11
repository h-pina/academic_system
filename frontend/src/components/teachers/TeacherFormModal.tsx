"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import { useMessage } from "@/context/MessageContext";
import { useApi } from "@/hooks/useApi";
import { sanitizeCpf } from "@/lib/cpf";
import { formatCpf } from "@/lib/format";
import {
  PROFILE_STATUS_LABELS,
  TEACHER_TITLE_LABELS,
  toOptions,
} from "@/lib/labels";
import { validateTeacherDraft } from "@/lib/validation";
import type {
  Department,
  ProfileStatus,
  TeacherTitle,
  TeacherView,
} from "@/types";

export interface TeacherSavePayload {
  cpf: string;
  name?: string;
  email?: string;
  departmentId: number;
  title: TeacherTitle;
  status?: ProfileStatus;
}

interface TeacherFormModalProps {
  /** `null` creates a new teacher; otherwise the teacher being edited. */
  teacher: TeacherView | null;
  departments: Department[];
  loading: boolean;
  onClose: () => void;
  onSave: (payload: TeacherSavePayload) => void;
}

export default function TeacherFormModal({
  teacher,
  departments,
  loading,
  onClose,
  onSave,
}: TeacherFormModalProps) {
  const editing = teacher !== null;
  const { showMessage } = useMessage();
  const { request } = useApi();

  const [cpf, setCpf] = useState(teacher?.cpf ?? "");
  const [name, setName] = useState(teacher?.name ?? "");
  const [email, setEmail] = useState(teacher?.email ?? "");
  const [departmentId, setDepartmentId] = useState(teacher?.departmentId ?? 0);
  const [title, setTitle] = useState<TeacherTitle | "">(teacher?.title ?? "");
  const [status, setStatus] = useState<ProfileStatus>(teacher?.status ?? "active");
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
      ? validateTeacherDraft(
          { cpf: teacher.cpf, name: teacher.name, email: teacher.email, departmentId, title },
          { existingUser: true },
        )
      : validateTeacherDraft(
          { cpf, name, email, departmentId, title },
          { existingUser },
        );

    if (errors.length > 0) {
      showMessage({ type: "WARNING", messages: errors });
      return;
    }

    onSave(
      editing
        ? {
            cpf: teacher.cpf,
            departmentId,
            title: title as TeacherTitle,
            status,
          }
        : {
            cpf: sanitizeCpf(cpf),
            ...(existingUser ? {} : { name: name.trim(), email: email.trim() }),
            departmentId,
            title: title as TeacherTitle,
          },
    );
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card max-w-lg">
        <h3 className="modal-title">
          {editing ? "Editar professor" : "Novo professor"}
        </h3>

        <div className="space-y-4">
          {editing ? (
            <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
              <p className="font-semibold text-slate-900">{teacher.name}</p>
              <p className="text-slate-500">CPF {formatCpf(teacher.cpf)}</p>
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
            <span className="field-label">Departamento *</span>
            <select
              className="field-input"
              value={departmentId}
              onChange={(event) => setDepartmentId(Number(event.target.value))}
            >
              <option value={0} disabled>
                -- Selecione o departamento --
              </option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name} ({department.code})
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="field-label">Titulação *</span>
            <select
              className="field-input"
              value={title}
              onChange={(event) => setTitle(event.target.value as TeacherTitle | "")}
            >
              <option value="" disabled>
                -- Selecione a titulação --
              </option>
              {toOptions(TEACHER_TITLE_LABELS).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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

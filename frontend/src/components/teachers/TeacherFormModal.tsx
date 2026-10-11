"use client";

import { useEffect, useState } from "react";
import { Field } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { Input, Select } from "@/components/ui/Input";
import { useMessage } from "@/context/MessageContext";
import { useApi } from "@/hooks/useApi";
import { sanitizeCpf } from "@/lib/cpf";
import { formatCpf } from "@/lib/format";
import { PROFILE_STATUS_LABELS, TEACHER_TITLE_LABELS, toOptions } from "@/lib/labels";
import { validateTeacherDraft } from "@/lib/validation";
import type { Department, ProfileStatus, TeacherTitle, TeacherView } from "@/types";

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

    const result = await request<{ exists: boolean }>(`/users/${digits}/exists`, {
      silent: true,
    });
    if (result.ok) setExistingUser(result.data.exists);
  };

  const handleSubmit = () => {
    const errors = editing
      ? validateTeacherDraft(
          { cpf: teacher.cpf, name: teacher.name, email: teacher.email, departmentId, title },
          { existingUser: true },
        )
      : validateTeacherDraft({ cpf, name, email, departmentId, title }, { existingUser });

    if (errors.length > 0) {
      showMessage({ type: "WARNING", messages: errors });
      return;
    }

    onSave(
      editing
        ? { cpf: teacher.cpf, departmentId, title: title as TeacherTitle, status }
        : {
            cpf: sanitizeCpf(cpf),
            ...(existingUser ? {} : { name: name.trim(), email: email.trim() }),
            departmentId,
            title: title as TeacherTitle,
          },
    );
  };

  return (
    <FormModal
      title={editing ? "Editar professor" : "Novo professor"}
      submitLabel={editing ? "Salvar alterações" : "Cadastrar"}
      loading={loading}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      {editing ? (
        <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
          <p className="font-semibold text-slate-900">{teacher.name}</p>
          <p className="text-slate-500">CPF {formatCpf(teacher.cpf)}</p>
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

      <Field label="Departamento" required>
        {(control) => (
          <Select
            {...control}
            value={departmentId}
            onChange={(event) => setDepartmentId(Number(event.target.value))}
          >
            <option value={0} disabled>
              Selecione o departamento
            </option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name} ({department.code})
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field label="Titulação" required>
        {(control) => (
          <Select
            {...control}
            value={title}
            onChange={(event) => setTitle(event.target.value as TeacherTitle | "")}
          >
            <option value="" disabled>
              Selecione a titulação
            </option>
            {toOptions(TEACHER_TITLE_LABELS).map((option) => (
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

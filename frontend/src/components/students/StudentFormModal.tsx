"use client";

import { useEffect, useState } from "react";
import { Field } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { Input, Select } from "@/components/ui/Input";
import { useApi } from "@/hooks/useApi";
import { useFormErrors } from "@/hooks/useFormErrors";
import { sanitizeCpf } from "@/lib/cpf";
import type { FieldErrors } from "@/lib/fieldErrors";
import { formatCpf } from "@/lib/format";
import { STUDENT_STATUS_LABELS, toOptions } from "@/lib/labels";
import { studentFieldErrors } from "@/lib/validation";
import type { CourseView, StudentStatus, StudentView } from "@/types";

export interface StudentSavePayload {
  cpf: string;
  name?: string;
  email?: string;
  courseId: number;
  entryYear: number;
  status?: StudentStatus;
}

interface StudentFormModalProps {
  /** `null` creates a new student; otherwise the student being edited. */
  student: StudentView | null;
  courses: CourseView[];
  loading: boolean;
  /** Validation errors returned by the API, keyed by field. */
  errors?: FieldErrors;
  onClose: () => void;
  onSave: (payload: StudentSavePayload) => void;
}

export default function StudentFormModal({
  student,
  courses,
  loading,
  errors: serverErrors,
  onClose,
  onSave,
}: StudentFormModalProps) {
  const editing = student !== null;
  const { request } = useApi();
  const form = useFormErrors(serverErrors);

  const [cpf, setCpf] = useState(student?.cpf ?? "");
  const [name, setName] = useState(student?.name ?? "");
  const [email, setEmail] = useState(student?.email ?? "");
  const [courseId, setCourseId] = useState(student?.courseId ?? 0);
  const [entryYear, setEntryYear] = useState<number | "">(
    student?.entryYear ?? new Date().getFullYear(),
  );
  const [status, setStatus] = useState<StudentStatus>(student?.status ?? "active");
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
    const found = editing
      ? studentFieldErrors(
          { cpf: student.cpf, name: student.name, email: student.email, courseId, entryYear },
          { existingUser: true },
        )
      : studentFieldErrors({ cpf, name, email, courseId, entryYear }, { existingUser });

    if (Object.keys(found).length > 0) {
      form.setErrors(found as FieldErrors);
      return;
    }

    onSave(
      editing
        ? { cpf: student.cpf, courseId, entryYear: Number(entryYear), status }
        : {
            cpf: sanitizeCpf(cpf),
            ...(existingUser ? {} : { name: name.trim(), email: email.trim() }),
            courseId,
            entryYear: Number(entryYear),
          },
    );
  };

  return (
    <FormModal
      title={editing ? "Editar aluno" : "Novo aluno"}
      submitLabel={editing ? "Salvar alterações" : "Cadastrar"}
      loading={loading}
      errors={form.errors}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      {editing ? (
        <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
          <p className="font-semibold text-slate-900">{student.name}</p>
          <p className="text-slate-500">
            CPF {formatCpf(student.cpf)} · Matrícula {student.registrationNumber ?? "—"}
          </p>
        </div>
      ) : (
        <>
          <Field
            label="CPF"
            required
            error={form.errors.cpf}
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
                onChange={(event) => {
                  setCpf(event.target.value.replace(/\D/g, ""));
                  form.clear("cpf");
                }}
                onBlur={checkExistingPerson}
              />
            )}
          </Field>

          <Field label="Nome" required error={form.errors.name}>
            {(control) => (
              <Input
                {...control}
                value={name}
                disabled={existingUser}
                onChange={(event) => {
                  setName(event.target.value);
                  form.clear("name");
                }}
              />
            )}
          </Field>

          <Field label="E-mail" required error={form.errors.email}>
            {(control) => (
              <Input
                {...control}
                type="email"
                value={email}
                disabled={existingUser}
                onChange={(event) => {
                  setEmail(event.target.value);
                  form.clear("email");
                }}
              />
            )}
          </Field>
        </>
      )}

      <Field label="Curso" required error={form.errors.courseId}>
        {(control) => (
          <Select
            {...control}
            value={courseId}
            onChange={(event) => {
              setCourseId(Number(event.target.value));
              form.clear("courseId");
            }}
          >
            <option value={0} disabled>
              Selecione o curso
            </option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name} ({course.code})
              </option>
            ))}
          </Select>
        )}
      </Field>

      <Field
        label="Ano de ingresso"
        required
        error={form.errors.entryYear}
        hint={
          editing ? undefined : "A matrícula é gerada automaticamente a partir do ano de ingresso."
        }
      >
        {(control) => (
          <Input
            {...control}
            type="number"
            value={entryYear}
            onChange={(event) => {
              setEntryYear(event.target.value === "" ? "" : Number(event.target.value));
              form.clear("entryYear");
            }}
          />
        )}
      </Field>

      {editing && (
        <Field label="Situação" required>
          {(control) => (
            <Select
              {...control}
              value={status}
              onChange={(event) => setStatus(event.target.value as StudentStatus)}
            >
              {toOptions(STUDENT_STATUS_LABELS).map((option) => (
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

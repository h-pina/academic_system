"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import { useMessage } from "@/context/MessageContext";
import { useApi } from "@/hooks/useApi";
import { sanitizeCpf } from "@/lib/cpf";
import { formatCpf } from "@/lib/format";
import { STUDENT_STATUS_LABELS, toOptions } from "@/lib/labels";
import { validateStudentDraft } from "@/lib/validation";
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
  onClose: () => void;
  onSave: (payload: StudentSavePayload) => void;
}

export default function StudentFormModal({
  student,
  courses,
  loading,
  onClose,
  onSave,
}: StudentFormModalProps) {
  const editing = student !== null;
  const { showMessage } = useMessage();
  const { request } = useApi();

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

    const result = await request<{ exists: boolean }>(
      `/users/${digits}/exists`,
      { silent: true },
    );
    if (result.ok) setExistingUser(result.data.exists);
  };

  const handleSave = () => {
    const errors = editing
      ? validateStudentDraft(
          { cpf: student.cpf, name: student.name, email: student.email, courseId, entryYear },
          { existingUser: true },
        )
      : validateStudentDraft(
          { cpf, name, email, courseId, entryYear },
          { existingUser },
        );

    if (errors.length > 0) {
      showMessage({ type: "WARNING", messages: errors });
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
    <div className="modal-backdrop">
      <div className="modal-card max-w-lg">
        <h3 className="modal-title">
          {editing ? "Editar aluno" : "Novo aluno"}
        </h3>

        <div className="space-y-4">
          {editing ? (
            <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
              <p className="font-semibold text-slate-900">{student.name}</p>
              <p className="text-slate-500">
                CPF {formatCpf(student.cpf)} · Matrícula{" "}
                {student.registrationNumber ?? "—"}
              </p>
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
            <span className="field-label">Curso *</span>
            <select
              className="field-input"
              value={courseId}
              onChange={(event) => setCourseId(Number(event.target.value))}
            >
              <option value={0} disabled>
                -- Selecione o curso --
              </option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name} ({course.code})
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="field-label">Ano de ingresso *</span>
            <input
              type="number"
              className="field-input"
              value={entryYear}
              onChange={(event) =>
                setEntryYear(event.target.value === "" ? "" : Number(event.target.value))
              }
            />
            {!editing && (
              <span className="field-hint">
                A matrícula é gerada automaticamente a partir do ano de ingresso.
              </span>
            )}
          </label>

          {editing && (
            <label className="block">
              <span className="field-label">Situação *</span>
              <select
                className="field-input"
                value={status}
                onChange={(event) => setStatus(event.target.value as StudentStatus)}
              >
                {toOptions(STUDENT_STATUS_LABELS).map((option) => (
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

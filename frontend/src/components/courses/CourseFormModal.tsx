"use client";

import { useState } from "react";
import Button from "@/components/Button";
import { useMessage } from "@/context/MessageContext";
import { COURSE_STATUS_LABELS, toOptions } from "@/lib/labels";
import { MAX_SEMESTERS, validateCourseDraft } from "@/lib/validation";
import type { CourseStatus, CourseView, Department } from "@/types";

export interface CourseSavePayload {
  name: string;
  code: string;
  departmentId: number;
  totalSemesters: number;
  status: CourseStatus;
}

interface CourseFormModalProps {
  course: CourseView | null;
  departments: Department[];
  loading: boolean;
  onClose: () => void;
  onSave: (payload: CourseSavePayload) => void;
}

export default function CourseFormModal({
  course,
  departments,
  loading,
  onClose,
  onSave,
}: CourseFormModalProps) {
  const { showMessage } = useMessage();
  const [name, setName] = useState(course?.name ?? "");
  const [code, setCode] = useState(course?.code ?? "");
  const [departmentId, setDepartmentId] = useState(course?.departmentId ?? 0);
  const [totalSemesters, setTotalSemesters] = useState<number | "">(
    course?.totalSemesters ?? 8,
  );
  const [status, setStatus] = useState<CourseStatus>(course?.status ?? "active");

  const handleSave = () => {
    const errors = validateCourseDraft({
      name,
      code,
      departmentId,
      totalSemesters,
    });
    if (errors.length > 0) {
      showMessage({ type: "WARNING", messages: errors });
      return;
    }
    onSave({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      departmentId,
      totalSemesters: Number(totalSemesters),
      status,
    });
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card max-w-lg">
        <h3 className="modal-title">{course ? "Editar curso" : "Novo curso"}</h3>

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
          </label>

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
            <span className="field-label">Número de semestres *</span>
            <input
              type="number"
              min={1}
              max={MAX_SEMESTERS}
              className="field-input"
              value={totalSemesters}
              onChange={(event) =>
                setTotalSemesters(
                  event.target.value === "" ? "" : Number(event.target.value),
                )
              }
            />
          </label>

          <label className="block">
            <span className="field-label">Situação *</span>
            <select
              className="field-input"
              value={status}
              onChange={(event) => setStatus(event.target.value as CourseStatus)}
            >
              {toOptions(COURSE_STATUS_LABELS).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span className="field-hint">
              Cursos inativos não aceitam novos alunos.
            </span>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4">
          <Button label="Cancelar" variant="cancel" onClick={onClose} />
          <Button
            label={course ? "Salvar alterações" : "Cadastrar"}
            variant="save"
            loading={loading}
            onClick={handleSave}
          />
        </div>
      </div>
    </div>
  );
}

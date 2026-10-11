"use client";

import { useState } from "react";
import { Field } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { Input, Select } from "@/components/ui/Input";
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

  const handleSubmit = () => {
    const errors = validateCourseDraft({ name, code, departmentId, totalSemesters });
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
    <FormModal
      title={course ? "Editar curso" : "Novo curso"}
      submitLabel={course ? "Salvar alterações" : "Cadastrar"}
      loading={loading}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <Field label="Nome" required>
        {(control) => (
          <Input {...control} value={name} onChange={(event) => setName(event.target.value)} />
        )}
      </Field>

      <Field label="Código" required>
        {(control) => (
          <Input
            {...control}
            maxLength={20}
            className="uppercase"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
        )}
      </Field>

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

      <Field label="Número de semestres" required>
        {(control) => (
          <Input
            {...control}
            type="number"
            min={1}
            max={MAX_SEMESTERS}
            value={totalSemesters}
            onChange={(event) =>
              setTotalSemesters(event.target.value === "" ? "" : Number(event.target.value))
            }
          />
        )}
      </Field>

      <Field label="Situação" required hint="Cursos inativos não aceitam novos alunos.">
        {(control) => (
          <Select
            {...control}
            value={status}
            onChange={(event) => setStatus(event.target.value as CourseStatus)}
          >
            {toOptions(COURSE_STATUS_LABELS).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        )}
      </Field>
    </FormModal>
  );
}

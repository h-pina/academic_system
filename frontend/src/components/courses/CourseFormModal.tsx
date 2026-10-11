"use client";

import { useState } from "react";
import { Field } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { Input, Select } from "@/components/ui/Input";
import { useFormErrors } from "@/hooks/useFormErrors";
import type { FieldErrors } from "@/lib/fieldErrors";
import { COURSE_STATUS_LABELS, toOptions } from "@/lib/labels";
import { MAX_SEMESTERS, courseFieldErrors } from "@/lib/validation";
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
  /** Validation errors returned by the API, keyed by field. */
  errors?: FieldErrors;
  onClose: () => void;
  onSave: (payload: CourseSavePayload) => void;
}

export default function CourseFormModal({
  course,
  departments,
  loading,
  errors: serverErrors,
  onClose,
  onSave,
}: CourseFormModalProps) {
  const form = useFormErrors(serverErrors);
  const [name, setName] = useState(course?.name ?? "");
  const [code, setCode] = useState(course?.code ?? "");
  const [departmentId, setDepartmentId] = useState(course?.departmentId ?? 0);
  const [totalSemesters, setTotalSemesters] = useState<number | "">(
    course?.totalSemesters ?? 8,
  );
  const [status, setStatus] = useState<CourseStatus>(course?.status ?? "active");

  const handleSubmit = () => {
    const found = courseFieldErrors({ name, code, departmentId, totalSemesters });
    if (Object.keys(found).length > 0) {
      form.setErrors(found as FieldErrors);
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
      errors={form.errors}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      <Field label="Nome" required error={form.errors.name}>
        {(control) => (
          <Input
            {...control}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              form.clear("name");
            }}
          />
        )}
      </Field>

      <Field label="Código" required error={form.errors.code}>
        {(control) => (
          <Input
            {...control}
            maxLength={20}
            className="uppercase"
            value={code}
            onChange={(event) => {
              setCode(event.target.value);
              form.clear("code");
            }}
          />
        )}
      </Field>

      <Field label="Departamento" required error={form.errors.departmentId}>
        {(control) => (
          <Select
            {...control}
            value={departmentId}
            onChange={(event) => {
              setDepartmentId(Number(event.target.value));
              form.clear("departmentId");
            }}
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

      <Field label="Número de semestres" required error={form.errors.totalSemesters}>
        {(control) => (
          <Input
            {...control}
            type="number"
            min={1}
            max={MAX_SEMESTERS}
            value={totalSemesters}
            onChange={(event) => {
              setTotalSemesters(event.target.value === "" ? "" : Number(event.target.value));
              form.clear("totalSemesters");
            }}
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

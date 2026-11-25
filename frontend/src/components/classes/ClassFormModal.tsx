"use client";

import { useState } from "react";
import ScheduleEditor from "@/components/classes/ScheduleEditor";
import { Field } from "@/components/ui/Field";
import { FormModal } from "@/components/ui/FormModal";
import { Input, Select } from "@/components/ui/Input";
import { useFormErrors } from "@/hooks/useFormErrors";
import { scheduleProblems, semesterLabel, type SlotDraft } from "@/lib/academic";
import type { FieldErrors } from "@/lib/fieldErrors";
import type { Semester } from "@/types";

export interface ClassSavePayload {
  semesterId?: number;
  subjectId: number;
  teacherId?: number;
  seats: number;
  schedules: SlotDraft[];
}

interface ClassFormModalProps {
  /** `create`: the Administration creates; `request`: a teacher asks for a class. */
  mode: "create" | "request";
  semesters: Semester[];
  subjects: { id: number; code: string; name: string }[];
  teachers: { id: number; name: string }[];
  loading: boolean;
  errors?: FieldErrors;
  onClose: () => void;
  onSave: (payload: ClassSavePayload) => void;
}

export default function ClassFormModal({
  mode,
  semesters,
  subjects,
  teachers,
  loading,
  errors: serverErrors,
  onClose,
  onSave,
}: ClassFormModalProps) {
  const form = useFormErrors(serverErrors);
  const open = semesters.filter((semester) => semester.status !== "closed");
  const [semesterId, setSemesterId] = useState(String(open[0]?.id ?? ""));
  const [subjectId, setSubjectId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [seats, setSeats] = useState("30");
  const [slots, setSlots] = useState<SlotDraft[]>([{ weekday: 1, startTime: "08:00", endTime: "10:00" }]);

  const handleSubmit = () => {
    const found: FieldErrors = {};
    if (mode === "create" && !semesterId) found.semesterId = "Escolha o semestre.";
    if (!subjectId) found.subjectId = "Escolha a disciplina.";
    const count = Number(seats);
    if (!Number.isInteger(count) || count < 1 || count > 500) {
      found.seats = "Informe entre 1 e 500 vagas.";
    }
    if (mode === "request" && slots.length === 0) found.schedules = "Sugira ao menos um horário.";
    const problems = scheduleProblems(slots);
    if (problems.length > 0) found.schedules = problems[0];
    if (Object.keys(found).length > 0) {
      form.setErrors(found);
      return;
    }
    onSave({
      ...(mode === "create" ? { semesterId: Number(semesterId) } : {}),
      subjectId: Number(subjectId),
      ...(mode === "create" && teacherId ? { teacherId: Number(teacherId) } : {}),
      seats: count,
      schedules: slots,
    });
  };

  return (
    <FormModal
      title={mode === "create" ? "Nova turma" : "Solicitar turma"}
      description={
        mode === "request"
          ? "A solicitação fica pendente até a Administração aprová-la."
          : "A turma só abre para inscrição depois de aprovada."
      }
      submitLabel={mode === "create" ? "Criar turma" : "Enviar solicitação"}
      loading={loading}
      errors={form.errors}
      onSubmit={handleSubmit}
      onClose={onClose}
    >
      {mode === "create" && (
        <Field label="Semestre" required error={form.errors.semesterId}>
          {(control) => (
            <Select {...control} value={semesterId} onChange={(e) => { setSemesterId(e.target.value); form.clear("semesterId"); }}>
              <option value="">Selecione</option>
              {open.map((semester) => (
                <option key={semester.id} value={semester.id}>
                  {semesterLabel(semester)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}

      <Field label="Disciplina" required error={form.errors.subjectId}>
        {(control) => (
          <Select {...control} value={subjectId} onChange={(e) => { setSubjectId(e.target.value); form.clear("subjectId"); }}>
            <option value="">Selecione</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.code} - {subject.name}
              </option>
            ))}
          </Select>
        )}
      </Field>

      {mode === "create" && (
        <Field label="Professor" hint="Pode ser definido depois, mas é necessário para aprovar.">
          {(control) => (
            <Select {...control} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              <option value="">Definir depois</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}

      <Field label="Vagas" required error={form.errors.seats}>
        {(control) => (
          <Input
            {...control}
            type="number"
            min={1}
            max={500}
            value={seats}
            onChange={(e) => { setSeats(e.target.value); form.clear("seats"); }}
          />
        )}
      </Field>

      <ScheduleEditor value={slots} onChange={setSlots} error={form.errors.schedules} />
    </FormModal>
  );
}

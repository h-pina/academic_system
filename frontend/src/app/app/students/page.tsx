"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import ConfirmModal from "@/components/ConfirmModal";
import Pagination from "@/components/Pagination";
import StatusBadge from "@/components/StatusBadge";
import StudentFormModal, {
  type StudentSavePayload,
} from "@/components/students/StudentFormModal";
import { useMessage } from "@/context/MessageContext";
import { useApi } from "@/hooks/useApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePagedList } from "@/hooks/usePagedList";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCpf } from "@/lib/format";
import { STUDENT_STATUS_LABELS, statusTone, toOptions } from "@/lib/labels";
import type {
  CourseView,
  Paginated,
  StudentStatus,
  StudentView,
} from "@/types";

const PAGE_SIZE = 20;

export default function StudentsPage() {
  const { request } = useApi();
  const { showMessage } = useMessage();
  const { isAdmin, canManage } = usePermissions();

  const [search, setSearch] = useState("");
  const [courseId, setCourseId] = useState("");
  const [status, setStatus] = useState<StudentStatus | "">("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const [courses, setCourses] = useState<CourseView[]>([]);
  const [form, setForm] = useState<{ student: StudentView | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [toRemove, setToRemove] = useState<StudentView | null>(null);

  const { items, total, loading, reload } = usePagedList<StudentView>(
    "/students",
    { q: debouncedSearch, courseId, status },
    page,
    PAGE_SIZE,
  );

  useEffect(() => {
    (async () => {
      const result = await request<Paginated<CourseView>>("/courses?pageSize=100");
      if (result.ok) setCourses(result.data.items);
    })();
  }, [request]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, courseId, status]);

  const handleSave = async (payload: StudentSavePayload) => {
    const editing = form?.student ?? null;
    setSaving(true);
    const result = editing
      ? await request(`/students/${editing.userId}`, {
          method: "PATCH",
          body: JSON.stringify({
            courseId: payload.courseId,
            entryYear: payload.entryYear,
            status: payload.status,
          }),
        })
      : await request("/students", {
          method: "POST",
          body: JSON.stringify(payload),
        });
    setSaving(false);

    if (result.ok) {
      showMessage({
        type: "SUCCESS",
        messages: [editing ? "Aluno atualizado." : "Aluno cadastrado."],
      });
      setForm(null);
      reload();
    }
  };

  const handleRemove = async () => {
    if (!toRemove) return;
    const target = toRemove;
    setToRemove(null);

    const result = await request(`/students/${target.userId}`, {
      method: "DELETE",
    });
    if (result.ok) {
      showMessage({ type: "SUCCESS", messages: ["Vínculo de aluno removido."] });
      reload();
    }
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="min-w-[14rem] flex-1">
          <span className="field-label">Buscar</span>
          <input
            type="search"
            className="field-input"
            placeholder="Nome, matrícula ou CPF"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <label>
          <span className="field-label">Curso</span>
          <select
            className="field-input"
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
          >
            <option value="">Todos</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="field-label">Situação</span>
          <select
            className="field-input"
            value={status}
            onChange={(event) => setStatus(event.target.value as StudentStatus | "")}
          >
            <option value="">Todas</option>
            {toOptions(STUDENT_STATUS_LABELS).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {canManage && (
          <Button
            label="Novo aluno"
            variant="add"
            onClick={() => setForm({ student: null })}
          />
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Matrícula</th>
                <th>Nome</th>
                <th>CPF</th>
                <th>Curso</th>
                <th>Ingresso</th>
                <th>Situação</th>
                {canManage && <th className="w-28 text-center">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((student) => (
                <tr key={student.userId}>
                  <td className="font-mono text-xs text-slate-600">
                    {student.registrationNumber ?? "—"}
                  </td>
                  <td className="font-medium text-slate-900">{student.name}</td>
                  <td className="font-mono text-xs text-slate-600">
                    {formatCpf(student.cpf)}
                  </td>
                  <td>{student.courseName}</td>
                  <td>{student.entryYear}</td>
                  <td>
                    <StatusBadge
                      label={STUDENT_STATUS_LABELS[student.status]}
                      tone={statusTone(student.status)}
                    />
                  </td>
                  {canManage && (
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="edit"
                          hint="Editar aluno"
                          onClick={() => setForm({ student })}
                        />
                        {isAdmin && (
                          <Button
                            variant="delete"
                            hint="Remover vínculo de aluno"
                            onClick={() => setToRemove(student)}
                          />
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr>
                  <td
                    colSpan={canManage ? 7 : 6}
                    className="px-4 py-10 text-center text-sm text-slate-400"
                  >
                    Nenhum aluno encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          onChange={setPage}
        />
      </div>

      {form && (
        <StudentFormModal
          student={form.student}
          courses={courses.filter(
            (course) =>
              course.status === "active" || course.id === form.student?.courseId,
          )}
          loading={saving}
          onClose={() => setForm(null)}
          onSave={handleSave}
        />
      )}

      <ConfirmModal
        open={toRemove !== null}
        title="Remover vínculo de aluno"
        message={`Remover o vínculo de aluno de "${toRemove?.name}"? A pessoa continua cadastrada; para encerrar o vínculo preservando o histórico, prefira alterar a situação.`}
        confirmLabel="Remover"
        onConfirm={handleRemove}
        onClose={() => setToRemove(null)}
      />
    </div>
  );
}

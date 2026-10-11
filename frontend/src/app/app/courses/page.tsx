"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ListTree } from "lucide-react";
import Button from "@/components/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import CourseFormModal, {
  type CourseSavePayload,
} from "@/components/courses/CourseFormModal";
import Pagination from "@/components/ui/Pagination";
import { StatusBadge } from "@/components/ui/Badge";
import { useMessage } from "@/context/MessageContext";
import { useApi } from "@/hooks/useApi";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePagedList } from "@/hooks/usePagedList";
import { usePermissions } from "@/hooks/usePermissions";
import { COURSE_STATUS_LABELS, statusTone, toOptions } from "@/lib/labels";
import type { CourseStatus, CourseView, Department } from "@/types";

const PAGE_SIZE = 20;

export default function CoursesPage() {
  const { request } = useApi();
  const { showMessage } = useMessage();
  const { isAdmin, canManage } = usePermissions();

  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState<CourseStatus | "">("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState<{ course: CourseView | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [toRemove, setToRemove] = useState<CourseView | null>(null);

  const { items, total, loading, reload } = usePagedList<CourseView>(
    "/courses",
    { q: debouncedSearch, departmentId, status },
    page,
    PAGE_SIZE,
  );

  useEffect(() => {
    (async () => {
      const result = await request<Department[]>("/departments");
      if (result.ok) setDepartments(result.data);
    })();
  }, [request]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, departmentId, status]);

  const handleSave = async (payload: CourseSavePayload) => {
    const editing = form?.course ?? null;
    setSaving(true);
    const result = await request(
      editing ? `/courses/${editing.id}` : "/courses",
      { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) },
    );
    setSaving(false);

    if (result.ok) {
      showMessage({
        type: "SUCCESS",
        messages: [editing ? "Curso atualizado." : "Curso cadastrado."],
      });
      setForm(null);
      reload();
    }
  };

  const handleRemove = async () => {
    if (!toRemove) return;
    const target = toRemove;
    setToRemove(null);

    const result = await request(`/courses/${target.id}`, { method: "DELETE" });
    if (result.ok) {
      showMessage({ type: "SUCCESS", messages: ["Curso excluído."] });
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
            placeholder="Nome ou código"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <label>
          <span className="field-label">Departamento</span>
          <select
            className="field-input"
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
          >
            <option value="">Todos</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="field-label">Situação</span>
          <select
            className="field-input"
            value={status}
            onChange={(event) => setStatus(event.target.value as CourseStatus | "")}
          >
            <option value="">Todas</option>
            {toOptions(COURSE_STATUS_LABELS).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {canManage && (
          <Button
            label="Novo curso"
            variant="add"
            onClick={() => setForm({ course: null })}
          />
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nome</th>
                <th>Departamento</th>
                <th className="text-center">Semestres</th>
                <th className="text-center">Alunos</th>
                <th>Situação</th>
                <th className="w-36 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((course) => (
                <tr key={course.id}>
                  <td className="font-mono text-xs text-slate-600">{course.code}</td>
                  <td className="font-medium text-slate-900">{course.name}</td>
                  <td>{course.departmentName}</td>
                  <td className="text-center">{course.totalSemesters}</td>
                  <td className="text-center">{course.studentCount}</td>
                  <td>
                    <StatusBadge
                      label={COURSE_STATUS_LABELS[course.status]}
                      tone={statusTone(course.status)}
                    />
                  </td>
                  <td>
                    <div className="flex items-center justify-center gap-1">
                      <Link
                        href={`/app/courses/${course.id}/curriculum`}
                        title="Ver matriz curricular"
                        className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-600"
                      >
                        <ListTree className="h-4 w-4" />
                      </Link>
                      {canManage && (
                        <Button
                          variant="edit"
                          hint="Editar curso"
                          onClick={() => setForm({ course })}
                        />
                      )}
                      {isAdmin && (
                        <Button
                          variant="delete"
                          hint="Excluir curso"
                          onClick={() => setToRemove(course)}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-sm text-slate-400"
                  >
                    Nenhum curso encontrado.
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
        <CourseFormModal
          course={form.course}
          departments={departments}
          loading={saving}
          onClose={() => setForm(null)}
          onSave={handleSave}
        />
      )}

      <ConfirmDialog
        open={toRemove !== null}
        title="Excluir curso"
        message={`Excluir o curso "${toRemove?.name}" e a sua matriz curricular? Só é possível se não houver alunos; caso contrário, inative o curso.`}
        onConfirm={handleRemove}
        onClose={() => setToRemove(null)}
      />
    </div>
  );
}

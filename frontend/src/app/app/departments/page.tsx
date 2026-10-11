"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/Button";
import ConfirmModal from "@/components/ConfirmModal";
import DepartmentFormModal from "@/components/departments/DepartmentFormModal";
import { useMessage } from "@/context/MessageContext";
import { useApi } from "@/hooks/useApi";
import { usePermissions } from "@/hooks/usePermissions";
import type { Department } from "@/types";

export default function DepartmentsPage() {
  const { request } = useApi();
  const { showMessage } = useMessage();
  const { isAdmin, canManage } = usePermissions();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState<{ department: Department | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [toRemove, setToRemove] = useState<Department | null>(null);

  const load = useCallback(async () => {
    const result = await request<Department[]>("/departments");
    setDepartments(result.ok ? result.data : []);
    setLoaded(true);
  }, [request]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (payload: { name: string; code: string }) => {
    const editing = form?.department ?? null;
    setSaving(true);
    const result = await request(
      editing ? `/departments/${editing.id}` : "/departments",
      { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) },
    );
    setSaving(false);

    if (result.ok) {
      showMessage({
        type: "SUCCESS",
        messages: [editing ? "Departamento atualizado." : "Departamento cadastrado."],
      });
      setForm(null);
      load();
    }
  };

  const handleRemove = async () => {
    if (!toRemove) return;
    const target = toRemove;
    setToRemove(null);

    const result = await request(`/departments/${target.id}`, { method: "DELETE" });
    if (result.ok) {
      showMessage({ type: "SUCCESS", messages: ["Departamento excluído."] });
      load();
    }
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {departments.length} departamento{departments.length === 1 ? "" : "s"}
        </p>
        {canManage && (
          <Button
            label="Novo departamento"
            variant="add"
            onClick={() => setForm({ department: null })}
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
                <th className="text-center">Cursos</th>
                <th className="text-center">Professores</th>
                {canManage && <th className="w-28 text-center">Ações</th>}
              </tr>
            </thead>
            <tbody>
              {departments.map((department) => (
                <tr key={department.id}>
                  <td className="font-mono text-xs text-slate-600">
                    {department.code}
                  </td>
                  <td className="font-medium text-slate-900">{department.name}</td>
                  <td className="text-center">{department.courseCount}</td>
                  <td className="text-center">{department.teacherCount}</td>
                  {canManage && (
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="edit"
                          hint="Editar departamento"
                          onClick={() => setForm({ department })}
                        />
                        {isAdmin && (
                          <Button
                            variant="delete"
                            hint="Excluir departamento"
                            onClick={() => setToRemove(department)}
                          />
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {loaded && departments.length === 0 && (
                <tr>
                  <td
                    colSpan={canManage ? 5 : 4}
                    className="px-4 py-10 text-center text-sm text-slate-400"
                  >
                    Nenhum departamento cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {form && (
        <DepartmentFormModal
          department={form.department}
          loading={saving}
          onClose={() => setForm(null)}
          onSave={handleSave}
        />
      )}

      <ConfirmModal
        open={toRemove !== null}
        title="Excluir departamento"
        message={`Excluir o departamento "${toRemove?.name}"? Só é possível se ele não tiver cursos nem professores.`}
        onConfirm={handleRemove}
        onClose={() => setToRemove(null)}
      />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import DepartmentFormModal from "@/components/departments/DepartmentFormModal";
import PageHeading from "@/components/PageHeading";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { useMessage } from "@/context/MessageContext";
import { useApi } from "@/hooks/useApi";
import { usePermissions } from "@/hooks/usePermissions";
import type { Department } from "@/types";

export default function DepartmentsPage() {
  const { request } = useApi();
  const { showMessage } = useMessage();
  const { isAdmin, canManage } = usePermissions();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<{ department: Department | null } | null>(null);
  const [saving, setSaving] = useState(false);
  const [toRemove, setToRemove] = useState<Department | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await request<Department[]>("/departments");
    setDepartments(result.ok ? result.data : []);
    setLoading(false);
  }, [request]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (payload: { name: string; code: string }) => {
    const editing = form?.department ?? null;
    setSaving(true);
    const result = await request(editing ? `/departments/${editing.id}` : "/departments", {
      method: editing ? "PATCH" : "POST",
      body: JSON.stringify(payload),
    });
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

  const columns: Column<Department>[] = [
    {
      key: "code",
      header: "Código",
      cell: (row) => <span className="font-mono text-xs text-slate-600">{row.code}</span>,
    },
    {
      key: "name",
      header: "Departamento",
      cell: (row) => <span className="font-medium text-slate-900">{row.name}</span>,
    },
    { key: "courses", header: "Cursos", align: "center", cell: (row) => row.courseCount },
    { key: "teachers", header: "Professores", align: "center", cell: (row) => row.teacherCount },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "Ações",
            align: "center" as const,
            className: "w-28",
            cell: (row: Department) => (
              <span className="flex items-center justify-center gap-1">
                <IconButton label={`Editar ${row.name}`} onClick={() => setForm({ department: row })}>
                  <Pencil className="h-4 w-4" />
                </IconButton>
                {isAdmin && (
                  <IconButton
                    label={`Excluir ${row.name}`}
                    onClick={() => setToRemove(row)}
                    className="hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </IconButton>
                )}
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="p-6">
      <PageHeading
        title="Departamentos"
        description="Unidades acadêmicas que reúnem cursos e professores."
        actions={
          canManage && (
            <Button
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setForm({ department: null })}
            >
              Novo departamento
            </Button>
          )
        }
      />

      <Card className="overflow-hidden">
        <DataTable
          caption="Departamentos"
          columns={columns}
          rows={departments}
          loading={loading}
          getRowKey={(row) => row.id}
          empty={
            <EmptyState
              icon={<Building2 className="h-5 w-5" />}
              title="Nenhum departamento cadastrado"
              description={
                canManage
                  ? "Cadastre o primeiro departamento para poder criar cursos e professores."
                  : "Ainda não há departamentos cadastrados."
              }
            />
          }
        />
      </Card>

      {form && (
        <DepartmentFormModal
          department={form.department}
          loading={saving}
          onClose={() => setForm(null)}
          onSave={handleSave}
        />
      )}

      <ConfirmDialog
        open={toRemove !== null}
        title="Excluir departamento"
        message={`O departamento "${toRemove?.name}" será excluído. Isso só é possível se ele não tiver cursos nem professores.`}
        onConfirm={handleRemove}
        onClose={() => setToRemove(null)}
      />
    </div>
  );
}

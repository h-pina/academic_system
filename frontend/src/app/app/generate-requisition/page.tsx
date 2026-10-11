"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/Button";
import RequisitionFormModal from "@/components/requisitions/RequisitionFormModal";
import { useMessage } from "@/context/MessageContext";
import { useApi } from "@/hooks/useApi";
import { formatDate } from "@/lib/format";
import {
  REQUISITION_STATUS_LABELS,
  type MaterialRequisition,
  type RequisitionListItem,
  type RequisitionPayload,
} from "@/types";

const MSG_CREATED =
  "Material requisition created and forwarded for the manager's approval.";
const MSG_RESUBMITTED =
  "Material requisition updated and resubmitted for approval.";

const STATUS_BADGE: Record<string, string> = {
  AWAITING_APPROVAL: "bg-brand-50 text-brand-700 ring-1 ring-brand-200",
  AWAITING_CHANGES: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  CANCELLED: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
};

export default function GenerateRequisitionPage() {
  const { request } = useApi();
  const { showMessage } = useMessage();

  const [requisitions, setRequisitions] = useState<RequisitionListItem[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MaterialRequisition | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const result = await request<RequisitionListItem[]>("/requisitions");
    setRequisitions(result.ok ? result.data : []);
  }, [request]);

  useEffect(() => {
    load();
  }, [load]);

  const handleNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = async (id: number) => {
    const result = await request<MaterialRequisition>(`/requisitions/${id}`);
    if (result.ok) {
      setEditing(result.data);
      setFormOpen(true);
    }
  };

  const handleSubmit = async (payload: RequisitionPayload, id?: number) => {
    setBusy(true);
    const result = id
      ? await request(`/requisitions/${id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        })
      : await request("/requisitions", {
          method: "POST",
          body: JSON.stringify(payload),
        });
    setBusy(false);

    if (result.ok) {
      showMessage({
        type: "SUCCESS",
        messages: [id ? MSG_RESUBMITTED : MSG_CREATED],
      });
      setFormOpen(false);
      setEditing(null);
      load();
    }
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {requisitions.length} requisition
          {requisitions.length === 1 ? "" : "s"}
        </p>
        <Button
          label="New requisition"
          variant="add"
          onClick={handleNew}
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th className="text-center">RM</th>
                <th className="text-center">Date</th>
                <th className="text-center">Items</th>
                <th className="text-center">Priority</th>
                <th className="text-center">Status</th>
                <th className="w-24 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requisitions.map((rm) => (
                <tr key={rm.id}>
                  <td className="text-center font-medium text-slate-900">
                    #{rm.id}
                  </td>
                  <td className="text-center">
                    {formatDate(String(rm.createdAt).slice(0, 10))}
                  </td>
                  <td className="text-center">{rm.itemCount}</td>
                  <td className="text-center">
                    {rm.priorityRequested ? "Yes" : "No"}
                  </td>
                  <td className="text-center">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_BADGE[rm.status] ?? "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {REQUISITION_STATUS_LABELS[rm.status] ?? rm.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center justify-center">
                      {rm.status === "AWAITING_CHANGES" ? (
                        <Button
                          variant="edit"
                          hint="Edit and resubmit this requisition"
                          onClick={() => handleEdit(rm.id)}
                        />
                      ) : (
                        <span className="text-xs text-slate-300">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {requisitions.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-slate-400"
                  >
                    You have not generated any material requisitions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {formOpen && (
        <RequisitionFormModal
          key={editing?.id ?? "new"}
          requisition={editing}
          loading={busy}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

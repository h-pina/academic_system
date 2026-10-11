"use client";

import { useMemo, useState } from "react";
import Button from "@/components/Button";
import { useMessage } from "@/context/MessageContext";
import { useUser } from "@/context/UserContext";
import { formatCpf } from "@/lib/format";
import {
  MAX_REQUISITION_ITEMS,
  MIN_REQUISITION_ITEMS,
  type MaterialRequisition,
  type RequisitionPayload,
} from "@/types";

interface DraftItem {
  description: string;
  quantity: number;
}

interface RequisitionFormModalProps {
  requisition: MaterialRequisition | null;
  loading: boolean;
  onClose: () => void;
  onSubmit: (payload: RequisitionPayload, id?: number) => void;
}

const MSG_TOO_MANY_ITEMS =
  "Item limit exceeded. A material requisition can have at most 10 items.";
const MSG_NO_ITEMS = "A material requisition must have at least one item.";

const todayIso = () => new Date().toISOString().slice(0, 10);

export default function RequisitionFormModal({
  requisition,
  loading,
  onClose,
  onSubmit,
}: RequisitionFormModalProps) {
  const { profile } = useUser();
  const { showMessage } = useMessage();

  const editing = requisition !== null;

  const [items, setItems] = useState<DraftItem[]>(
    () =>
      requisition?.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
      })) ?? [],
  );
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");

  const [priorityRequested, setPriorityRequested] = useState(
    requisition?.priorityRequested ?? false,
  );
  const [priorityJustification, setPriorityJustification] = useState(
    requisition?.priorityJustification ?? "",
  );

  const requesterName = requisition?.requesterName ?? profile?.name ?? "";
  const requesterCpf = requisition?.requesterCpf ?? profile?.cpf ?? "";
  const displayDate = requisition?.createdAt ?? todayIso();

  const totalUnits = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const handleAddItem = () => {
    const cleanDescription = description.trim();
    const parsedQuantity = Number(quantity);

    if (cleanDescription.length < 2) {
      showMessage({
        type: "WARNING",
        messages: ["Enter an item description (at least 2 characters)."],
      });
      return;
    }
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      showMessage({
        type: "WARNING",
        messages: ["Quantity must be a whole number of at least 1."],
      });
      return;
    }
    if (items.length >= MAX_REQUISITION_ITEMS) {
      showMessage({ type: "WARNING", messages: [MSG_TOO_MANY_ITEMS] });
      return;
    }

    setItems((prev) => [
      ...prev,
      { description: cleanDescription, quantity: parsedQuantity },
    ]);
    setDescription("");
    setQuantity("1");
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (items.length < MIN_REQUISITION_ITEMS) {
      showMessage({ type: "WARNING", messages: [MSG_NO_ITEMS] });
      return;
    }
    if (items.length > MAX_REQUISITION_ITEMS) {
      showMessage({ type: "WARNING", messages: [MSG_TOO_MANY_ITEMS] });
      return;
    }
    if (priorityRequested && priorityJustification.trim().length < 5) {
      showMessage({
        type: "WARNING",
        messages: [
          "Describe the reason for the prioritization request (at least 5 characters).",
        ],
      });
      return;
    }

    onSubmit(
      {
        items,
        priorityRequested,
        priorityJustification: priorityRequested
          ? priorityJustification.trim()
          : undefined,
      },
      requisition?.id,
    );
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-card flex max-h-[90vh] max-w-2xl flex-col overflow-hidden">
        <h3 className="modal-title shrink-0">
          {editing
            ? `Edit material requisition #${requisition?.id}`
            : "New material requisition"}
        </h3>

        <div className="-mx-1 flex-1 overflow-y-auto px-1">
          {editing && requisition?.reviewerNote && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <span className="font-semibold">Reviewer instructions: </span>
              {requisition.reviewerNote}
            </div>
          )}

          <div className="mb-5 grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-3">
            <div>
              <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                Date
              </span>
              <span className="text-slate-800">{displayDate}</span>
            </div>
            <div>
              <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                Requester
              </span>
              <span className="text-slate-800">{requesterName}</span>
            </div>
            <div>
              <span className="block text-xs font-medium uppercase tracking-wide text-slate-400">
                Code
              </span>
              <span className="text-slate-800">
                {requesterCpf ? formatCpf(requesterCpf) : "-"}
              </span>
            </div>
          </div>

          <div className="mb-2 flex items-end gap-2">
            <label className="flex-1">
              <span className="field-label">Item description</span>
              <input
                type="text"
                className="field-input"
                value={description}
                maxLength={255}
                onChange={(event) => setDescription(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddItem();
                  }
                }}
              />
            </label>
            <label className="w-20">
              <span className="field-label">Qty</span>
              <input
                type="number"
                min={1}
                className="field-input"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
              />
            </label>
            <Button label="Add" variant="add" onClick={handleAddItem} />
          </div>
          <p className="mb-3 text-xs text-slate-500">
            {items.length}/{MAX_REQUISITION_ITEMS} items
            {items.length > 0 && ` · ${totalUnits} unit(s) total`}
          </p>

          <div className="mb-5 overflow-hidden rounded-lg border border-slate-200">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-10">#</th>
                  <th>Description</th>
                  <th className="text-right">Quantity</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{item.description}</td>
                    <td className="text-right">{item.quantity}</td>
                    <td className="text-center">
                      <Button
                        variant="delete"
                        hint="Remove this item"
                        onClick={() => handleRemoveItem(index)}
                      />
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-3 py-6 text-center text-slate-400"
                    >
                      No items added yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              checked={priorityRequested}
              onChange={(event) => setPriorityRequested(event.target.checked)}
            />
            <span>Request supply prioritization (works)</span>
          </label>
          {priorityRequested && (
            <label className="mt-3 block">
              <span className="field-label">
                Works observation / justification *
              </span>
              <textarea
                className="field-input"
                rows={3}
                maxLength={1000}
                value={priorityJustification}
                onChange={(event) =>
                  setPriorityJustification(event.target.value)
                }
              />
            </label>
          )}
        </div>

        <div className="mt-4 flex shrink-0 justify-end gap-3 border-t border-slate-200 pt-4">
          <Button label="Cancel" variant="cancel" onClick={onClose} />
          <Button
            label={editing ? "Resubmit" : "Submit for approval"}
            variant="save"
            loading={loading}
            onClick={handleSubmit}
          />
        </div>
      </div>
    </div>
  );
}

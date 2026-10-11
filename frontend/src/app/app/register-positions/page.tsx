"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/Button";
import ConfirmModal from "@/components/ConfirmModal";
import PositionFormModal from "@/components/positions/PositionFormModal";
import { useMessage } from "@/context/MessageContext";
import { useApi } from "@/hooks/useApi";
import type { Position } from "@/types";

const EMPTY_POSITION: Position = { id: 0, name: "" };

export default function RegisterPositionsPage() {
  const { request } = useApi();
  const { showMessage } = useMessage();

  const [positions, setPositions] = useState<Position[]>([]);
  const [busy, setBusy] = useState(false);

  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [positionToDelete, setPositionToDelete] = useState<Position | null>(null);

  const loadPositions = useCallback(async () => {
    const result = await request<Position[]>("/positions", { auth: false });
    setPositions(result.ok ? result.data : []);
  }, [request]);

  useEffect(() => {
    loadPositions();
  }, [loadPositions]);

  const handleNew = () => {
    setEditingPosition(EMPTY_POSITION);
    setIsEditing(false);
  };

  const handleEdit = async (id: number) => {
    const result = await request<Position>(`/positions/${id}`);
    if (result.ok) {
      setEditingPosition(result.data);
      setIsEditing(true);
    }
  };

  const handleSave = async (position: Position) => {
    if (position.name.trim().length < 2) {
      showMessage({
        type: "WARNING",
        messages: ["Position name must be at least 2 characters long."],
      });
      return;
    }

    setBusy(true);
    const result =
      position.id > 0
        ? await request(`/positions/${position.id}`, {
            method: "PUT",
            body: JSON.stringify({ name: position.name.trim() }),
          })
        : await request(`/positions`, {
            method: "POST",
            body: JSON.stringify({ name: position.name.trim() }),
          });
    setBusy(false);

    if (result.ok) {
      showMessage({
        type: "SUCCESS",
        messages: [
          position.id > 0 ? "Position updated." : "Position created.",
        ],
      });
      setEditingPosition(null);
      loadPositions();
    }
  };

  const handleDeleteConfirm = async () => {
    if (!positionToDelete) return;
    const target = positionToDelete;
    setPositionToDelete(null);

    const result = await request(`/positions/${target.id}`, {
      method: "DELETE",
    });
    if (result.ok) {
      showMessage({ type: "SUCCESS", messages: ["Position deleted."] });
      loadPositions();
    }
  };

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {positions.length} position{positions.length === 1 ? "" : "s"}
        </p>
        <Button label="Add position" variant="add" onClick={handleNew} />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Position name</th>
                <th className="w-32 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => (
                <tr key={position.id}>
                  <td className="font-medium text-slate-900">
                    {position.name}
                  </td>
                  <td>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="edit"
                        hint="Edit this position"
                        onClick={() => handleEdit(position.id)}
                      />
                      <Button
                        variant="delete"
                        hint="Delete this position"
                        onClick={() => setPositionToDelete(position)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
              {positions.length === 0 && (
                <tr>
                  <td
                    colSpan={2}
                    className="px-4 py-10 text-center text-sm text-slate-400"
                  >
                    No positions registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingPosition && (
        <PositionFormModal
          key={editingPosition.id}
          position={editingPosition}
          editing={isEditing}
          loading={busy}
          onClose={() => setEditingPosition(null)}
          onSave={handleSave}
        />
      )}

      <ConfirmModal
        open={positionToDelete !== null}
        title="Confirm deletion"
        message={`Are you sure you want to delete the position "${positionToDelete?.name}"? This action cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onClose={() => setPositionToDelete(null)}
      />
    </div>
  );
}

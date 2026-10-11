"use client";

import { useEffect, useState } from "react";
import Button from "@/components/Button";
import type { Position } from "@/types";

interface PositionFormModalProps {
  position: Position;
  editing: boolean;
  loading: boolean;
  onClose: () => void;
  onSave: (position: Position) => void;
}

export default function PositionFormModal({
  position,
  editing,
  loading,
  onClose,
  onSave,
}: PositionFormModalProps) {
  const [draft, setDraft] = useState<Position>(position);

  useEffect(() => {
    setDraft(position);
  }, [position]);

  return (
    <div className="modal-backdrop">
      <div className="modal-card max-w-md">
        <h3 className="modal-title">
          {editing ? "Edit position" : "New position"}
        </h3>

        <label className="block">
          <span className="field-label">Position name *</span>
          <input
            type="text"
            className="field-input"
            autoFocus
            value={draft.name}
            onChange={(event) =>
              setDraft((prev) => ({ ...prev, name: event.target.value }))
            }
          />
        </label>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-4">
          <Button label="Cancel" variant="cancel" onClick={onClose} />
          <Button
            label={editing ? "Save changes" : "Create"}
            variant="save"
            loading={loading}
            onClick={() => onSave(draft)}
          />
        </div>
      </div>
    </div>
  );
}

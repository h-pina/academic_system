"use client";

import { useId, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

interface FormModalProps {
  title: string;
  description?: string;
  submitLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  size?: "sm" | "md" | "lg";
  onSubmit: () => void;
  onClose: () => void;
  children: ReactNode;
}

/**
 * A dialog around a form: Enter submits, the footer holds Cancel and the
 * submit action, and the form is submitted by the footer button through the
 * `form` attribute so both live in the right place of the dialog.
 */
export function FormModal({
  title,
  description,
  submitLabel,
  cancelLabel = "Cancelar",
  loading = false,
  size = "md",
  onSubmit,
  onClose,
  children,
}: FormModalProps) {
  const formId = useId();

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={title}
      description={description}
      size={size}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button type="submit" form={formId} loading={loading}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="space-y-4"
      >
        {children}
      </form>
    </Modal>
  );
}

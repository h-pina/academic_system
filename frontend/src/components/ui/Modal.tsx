"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const SIZES = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" } as const;

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Short explanation announced with the title. */
  description?: string;
  size?: keyof typeof SIZES;
  /** Actions, rendered right-aligned under the content. */
  footer?: ReactNode;
  children?: ReactNode;
}

/**
 * Accessible dialog: focus is trapped and returned to the trigger, Esc and
 * the close button dismiss it, and the page behind is inert. Built on the
 * Radix dialog primitive.
 */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  footer,
  children,
}: ModalProps) {
  // Modals here are opened from application state, not from a Dialog.Trigger,
  // so the element that opened the dialog is remembered to give focus back.
  const openerRef = useRef<HTMLElement | null>(null);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 animate-fade-in bg-slate-900/40 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 animate-scale-in flex-col rounded-2xl border border-slate-200 bg-surface p-6 shadow-panel focus:outline-none",
            SIZES[size],
          )}
          {...(description ? {} : { "aria-describedby": undefined })}
          onOpenAutoFocus={() => {
            openerRef.current =
              document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            openerRef.current?.focus();
          }}
        >
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-200 pb-3">
            <div>
              <Dialog.Title className="font-display text-lg font-bold text-slate-900">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-sm text-slate-500">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Fechar"
              className="-mr-2 -mt-1 rounded-full p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

          {footer && (
            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

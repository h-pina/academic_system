"use client";

import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type ToastType = "ERROR" | "WARNING" | "SUCCESS";

const TONES = {
  ERROR: {
    wrap: "border-red-200 bg-red-50 text-red-800",
    icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
    role: "alert" as const,
  },
  WARNING: {
    wrap: "border-amber-200 bg-amber-50 text-amber-900",
    icon: <Info className="h-5 w-5 text-amber-500" />,
    role: "status" as const,
  },
  SUCCESS: {
    wrap: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    role: "status" as const,
  },
};

interface ToastProps {
  type: ToastType;
  messages: string[];
  onDismiss: () => void;
}

/** A transient message. Errors are announced assertively, the rest politely. */
export function Toast({ type, messages, onDismiss }: ToastProps) {
  const tone = TONES[type];

  return (
    <div
      role={tone.role}
      aria-live={type === "ERROR" ? "assertive" : "polite"}
      className={cn(
        "pointer-events-auto flex w-full max-w-md animate-slide-up items-start gap-3 rounded-xl border px-4 py-3 shadow-panel",
        tone.wrap,
      )}
    >
      <span className="mt-0.5 shrink-0">{tone.icon}</span>
      <ul className="flex-1 space-y-1 text-sm">
        {messages.map((line, index) => (
          <li key={index}>{line}</li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Fechar aviso"
        className="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

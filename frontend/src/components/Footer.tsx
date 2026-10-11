"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useMessage } from "@/context/MessageContext";

export default function Footer() {
  const { message, visible, hideMessage } = useMessage();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!visible || !message || message.type !== "ERROR") return;

    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        hideMessage();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [visible, message, hideMessage]);

  if (!message || !visible) return null;

  const tone = {
    ERROR: {
      wrap: "border-red-200 bg-red-50 text-red-800",
      icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
    },
    WARNING: {
      wrap: "border-amber-200 bg-amber-50 text-amber-900",
      icon: <Info className="h-5 w-5 text-amber-500" />,
    },
    SUCCESS: {
      wrap: "border-emerald-200 bg-emerald-50 text-emerald-800",
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
    },
  }[message.type];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 sm:justify-end">
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 shadow-panel animate-slide-up ${tone.wrap}`}
      >
        <span className="mt-0.5 shrink-0">{tone.icon}</span>
        <ul className="flex-1 space-y-1 text-sm">
          {message.messages.map((line, index) => (
            <li key={index}>{line}</li>
          ))}
        </ul>
        <button
          onClick={hideMessage}
          className="shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

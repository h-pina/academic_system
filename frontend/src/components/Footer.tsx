"use client";

import { useEffect, useRef } from "react";
import { Toast } from "@/components/ui/Toast";
import { useMessage } from "@/context/MessageContext";

/** Hosts the transient messages raised through `useMessage`. */
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

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center p-4 sm:justify-end">
      <div ref={ref} className="w-full max-w-md">
        <Toast
          type={message.type}
          messages={message.messages}
          onDismiss={hideMessage}
        />
      </div>
    </div>
  );
}

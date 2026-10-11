"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppMessage } from "@/types";

interface MessageContextValue {
  message: AppMessage | null;
  visible: boolean;
  showMessage: (message: AppMessage) => void;
  hideMessage: () => void;
}

const MessageContext = createContext<MessageContextValue | undefined>(undefined);

const AUTO_DISMISS_MS = 6000;

export function MessageProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<AppMessage | null>(null);
  const [visible, setVisible] = useState(false);

  const showMessage = useCallback((next: AppMessage) => {
    if (!next || !Array.isArray(next.messages) || next.messages.length === 0) {
      return;
    }
    setMessage(next);
    setVisible(true);
  }, []);

  const hideMessage = useCallback(() => {
    setVisible(false);
    setTimeout(() => setMessage(null), 300);
  }, []);

  useEffect(() => {
    if (!visible || !message || message.type === "ERROR") return;
    const timer = setTimeout(hideMessage, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [visible, message, hideMessage]);

  const value = useMemo<MessageContextValue>(
    () => ({ message, visible, showMessage, hideMessage }),
    [message, visible, showMessage, hideMessage],
  );

  return (
    <MessageContext.Provider value={value}>{children}</MessageContext.Provider>
  );
}

export function useMessage(): MessageContextValue {
  const context = useContext(MessageContext);
  if (!context) {
    throw new Error("useMessage must be used inside a MessageProvider");
  }
  return context;
}

"use client";

import type { ReactNode } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { LoadingProvider } from "@/context/LoadingContext";
import { MessageProvider } from "@/context/MessageContext";
import { UserProvider } from "@/context/UserContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <LoadingProvider>
        <MessageProvider>
          <UserProvider>{children}</UserProvider>
        </MessageProvider>
      </LoadingProvider>
    </ErrorBoundary>
  );
}

"use client";

import type { ReactNode } from "react";
import ErrorBoundary from "@/components/ErrorBoundary";
import { LoadingProvider } from "@/context/LoadingContext";
import { MessageProvider } from "@/context/MessageContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { UserProvider } from "@/context/UserContext";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LoadingProvider>
          <MessageProvider>
            <UserProvider>{children}</UserProvider>
          </MessageProvider>
        </LoadingProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

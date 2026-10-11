"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface LoadingContextValue {
  loading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextValue | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState(0);

  const startLoading = useCallback(() => setPending((count) => count + 1), []);
  const stopLoading = useCallback(
    () => setPending((count) => Math.max(0, count - 1)),
    [],
  );

  const value = useMemo<LoadingContextValue>(
    () => ({ loading: pending > 0, startLoading, stopLoading }),
    [pending, startLoading, stopLoading],
  );

  return (
    <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>
  );
}

export function useLoading(): LoadingContextValue {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used inside a LoadingProvider");
  }
  return context;
}

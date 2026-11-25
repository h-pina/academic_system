"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useApi } from "@/hooks/useApi";
import { todayIso } from "@/lib/academic";

interface ServerClock {
  now: string;
  today: string;
  simulated: boolean;
  canTravel: boolean;
}

interface ClockContextValue {
  /** The server's date (`YYYY-MM-DD`), which every deadline rule uses. */
  today: string;
  /** The server's current time, kept moving between refreshes. */
  now: () => Date;
  simulated: boolean;
  canTravel: boolean;
  travel: (body: { date: string } | { days: number }) => Promise<boolean>;
  reset: () => Promise<boolean>;
}

const ClockContext = createContext<ClockContextValue | undefined>(undefined);

/**
 * The deadlines are checked by the server against its own clock, which can be
 * moved in development. The screens must read the same clock, not the
 * browser's, or they would disagree with the API about what is open.
 */
export function ClockProvider({ children }: { children: ReactNode }) {
  const { request } = useApi();
  const [clock, setClock] = useState<ServerClock | null>(null);
  const received = useRef(0);

  useEffect(() => {
    (async () => {
      const result = await request<ServerClock>("/clock", { silent: true });
      if (result.ok) {
        received.current = Date.now();
        setClock(result.data);
      }
    })();
  }, [request]);

  const change = useCallback(
    async (method: "PUT" | "DELETE", body?: object) => {
      const result = await request<ServerClock>("/clock", {
        method,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      if (!result.ok) return false;
      // Everything on the page was computed with the old date.
      window.location.reload();
      return true;
    },
    [request],
  );

  const value = useMemo<ClockContextValue>(
    () => ({
      today: clock?.today ?? todayIso(),
      now: () =>
        clock ? new Date(new Date(clock.now).getTime() + (Date.now() - received.current)) : new Date(),
      simulated: clock?.simulated ?? false,
      canTravel: clock?.canTravel ?? false,
      travel: (body) => change("PUT", body),
      reset: () => change("DELETE"),
    }),
    [clock, change],
  );

  return <ClockContext.Provider value={value}>{children}</ClockContext.Provider>;
}

export function useServerClock(): ClockContextValue {
  const context = useContext(ClockContext);
  if (!context) throw new Error("useServerClock must be used inside <ClockProvider>");
  return context;
}

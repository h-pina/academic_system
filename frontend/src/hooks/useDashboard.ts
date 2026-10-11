"use client";

import { useCallback, useEffect, useState } from "react";
import { useApi } from "@/hooks/useApi";
import type { DashboardData } from "@/types";

/** Loads `/dashboard` for the signed-in user (silently; screens show their own states). */
export function useDashboard(enabled = true) {
  const { request } = useApi();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await request<DashboardData>("/dashboard", { silent: true });
    setData(result.ok ? result.data : null);
    setFailed(!result.ok);
    setLoading(false);
  }, [request]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  return { data, loading, failed, reload: load };
}

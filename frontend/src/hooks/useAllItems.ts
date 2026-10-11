"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { buildQuery } from "@/lib/query";
import type { Paginated } from "@/types";

const PAGE_SIZE = 100;
const MAX_PAGES = 50;

/**
 * Loads every page of a paginated endpoint (the API caps `pageSize`), for
 * selects and pickers that need the complete list.
 */
export function useAllItems<T>(
  path: string,
  filters: Record<string, string | number | boolean | null | undefined> = {},
  enabled = true,
) {
  const { request } = useApi();
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [version, setVersion] = useState(0);
  const latest = useRef(0);

  const filterKey = buildQuery(filters);

  useEffect(() => {
    if (!enabled) return;
    const ticket = ++latest.current;
    setLoading(true);

    (async () => {
      const all: T[] = [];
      for (let page = 1; page <= MAX_PAGES; page++) {
        const query = buildQuery({
          ...Object.fromEntries(new URLSearchParams(filterKey)),
          page,
          pageSize: PAGE_SIZE,
        });
        const result = await request<Paginated<T>>(`${path}${query}`);
        if (ticket !== latest.current) return;
        if (!result.ok) break;

        all.push(...result.data.items);
        if (all.length >= result.data.total) break;
      }
      if (ticket !== latest.current) return;
      setItems(all);
      setLoading(false);
    })();
  }, [request, path, filterKey, enabled, version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);
  return { items, loading, reload };
}

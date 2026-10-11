"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { buildQuery } from "@/lib/query";
import type { Paginated } from "@/types";

type Filters = Record<string, string | number | boolean | null | undefined>;

interface PagedListResult<T> {
  items: T[];
  total: number;
  loading: boolean;
  reload: () => void;
}

/**
 * Loads a paginated API list and reloads it when the filters or page change.
 * Responses that arrive out of order are discarded.
 */
export function usePagedList<T>(
  path: string,
  filters: Filters,
  page: number,
  pageSize: number,
): PagedListResult<T> {
  const { request } = useApi();
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const latest = useRef(0);

  const query = buildQuery({ ...filters, page, pageSize });

  useEffect(() => {
    const ticket = ++latest.current;
    setLoading(true);

    (async () => {
      const result = await request<Paginated<T>>(`${path}${query}`);
      if (ticket !== latest.current) return;

      setItems(result.ok ? result.data.items : []);
      setTotal(result.ok ? result.data.total : 0);
      setLoading(false);
    })();
  }, [request, path, query, version]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);

  return { items, total, loading, reload };
}

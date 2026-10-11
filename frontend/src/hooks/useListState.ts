"use client";

import { useCallback, useMemo } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useQueryState } from "@/hooks/useQueryState";
import { parsePage } from "@/lib/queryState";
import { parseSort, type SortState } from "@/lib/sort";

/**
 * Everything a paginated list screen keeps in the URL: filters (including
 * the search text `q`), page and sort. Changing a filter or the sort returns
 * to the first page.
 */
export function useListState<F extends string>(
  filterDefaults: Record<F, string>,
  sortFields: readonly string[] = [],
) {
  const defaults = {
    ...filterDefaults,
    page: "1",
    sort: "",
    order: "asc",
  } as Record<string, string>;

  const { state, update, ready } = useQueryState(defaults);

  const filters = useMemo(() => {
    const result = {} as Record<F, string>;
    for (const key of Object.keys(filterDefaults) as F[]) {
      result[key] = state[key] ?? filterDefaults[key];
    }
    return result;
    // `filterDefaults` is a stable literal per screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const page = parsePage(state.page);
  const sort = parseSort(state.sort, state.order, sortFields);
  const debouncedSearch = useDebouncedValue(state.q ?? "");

  const setFilter = useCallback(
    (key: F, value: string) => update({ [key]: value, page: "1" }),
    [update],
  );
  const setPage = useCallback(
    (next: number) => update({ page: String(next) }),
    [update],
  );
  const setSort = useCallback(
    (next: SortState) =>
      update({ sort: next.field ?? "", order: next.order, page: "1" }),
    [update],
  );

  /** Query parameters for the list request (search is debounced). */
  const requestParams = useMemo(
    () => ({
      ...filters,
      ...("q" in filters ? { q: debouncedSearch } : {}),
      sort: sort.field,
      order: sort.field ? sort.order : undefined,
    }),
    [filters, debouncedSearch, sort.field, sort.order],
  );

  const isFiltered = Object.entries(filters).some(
    ([key, value]) => value !== "" && value !== (filterDefaults as Record<string, string>)[key],
  );

  return { ready, filters, requestParams, page, sort, isFiltered, setFilter, setPage, setSort };
}

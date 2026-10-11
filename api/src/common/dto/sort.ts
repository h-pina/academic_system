/**
 * Sorting for list endpoints. Each endpoint declares which query values map
 * to which columns, so a client can never order by an arbitrary column.
 */
export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = (typeof SORT_ORDERS)[number];

export interface ResolvedSort {
  column: string;
  direction: 'ASC' | 'DESC';
}

export function resolveSort(
  sort: string | undefined,
  order: SortOrder | undefined,
  columns: Record<string, string>,
  fallback: ResolvedSort,
): ResolvedSort {
  const column = sort ? columns[sort] : undefined;
  if (!column) {
    return fallback;
  }
  return { column, direction: order === 'desc' ? 'DESC' : 'ASC' };
}

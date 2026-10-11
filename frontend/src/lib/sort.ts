export type SortOrder = "asc" | "desc";

export interface SortState {
  /** `undefined` means the list's default order. */
  field?: string;
  order: SortOrder;
}

export const NO_SORT: SortState = { field: undefined, order: "asc" };

/**
 * What a click on a column header does: a new column sorts ascending, the
 * same column flips to descending, and a third click returns to the default.
 */
export function nextSort(current: SortState, field: string): SortState {
  if (current.field !== field) return { field, order: "asc" };
  if (current.order === "asc") return { field, order: "desc" };
  return NO_SORT;
}

export function ariaSort(
  current: SortState,
  field: string,
): "ascending" | "descending" | "none" {
  if (current.field !== field) return "none";
  return current.order === "asc" ? "ascending" : "descending";
}

/** Reads a sort from query-string values, ignoring anything unknown. */
export function parseSort(
  field: string | undefined,
  order: string | undefined,
  allowed: readonly string[],
): SortState {
  if (!field || !allowed.includes(field)) return NO_SORT;
  return { field, order: order === "desc" ? "desc" : "asc" };
}

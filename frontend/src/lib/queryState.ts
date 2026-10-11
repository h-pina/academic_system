/**
 * State kept in the URL query string (filters, search, page, sort), so a
 * reload or a shared link shows the same list.
 */
export type QueryState = Record<string, string>;

/** Reads the known keys from a query string; missing keys take their default. */
export function parseQueryState(
  search: string,
  defaults: QueryState,
): QueryState {
  const params = new URLSearchParams(search);
  const state: QueryState = {};

  for (const key of Object.keys(defaults)) {
    state[key] = params.get(key) ?? defaults[key];
  }
  return state;
}

/** Builds a query string with only the values that differ from the defaults. */
export function serializeQueryState(
  state: QueryState,
  defaults: QueryState,
): string {
  const params = new URLSearchParams();

  for (const key of Object.keys(defaults)) {
    const value = (state[key] ?? "").trim();
    if (value !== "" && value !== defaults[key]) params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

/** A page number from the URL: 1 for anything that is not a positive integer. */
export function parsePage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

type Primitive = string | number | boolean | null | undefined;

/**
 * Builds a query string from filters, skipping empty values so the API
 * does not receive `status=` or `courseId=undefined`.
 */
export function buildQuery(params: Record<string, Primitive>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text === "") continue;
    search.set(key, text);
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

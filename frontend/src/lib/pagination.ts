export interface PageRange {
  from: number;
  to: number;
  totalPages: number;
}

/** The 1-based range of items shown on a page, and the number of pages. */
export function pageRange(
  page: number,
  pageSize: number,
  total: number,
): PageRange {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return { from: 0, to: 0, totalPages };

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return { from, to, totalPages };
}

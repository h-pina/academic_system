"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/ui/Skeleton";
import { ariaSort, nextSort, type SortState } from "@/lib/sort";

export interface Column<Row> {
  /** Stable key for the column. */
  key: string;
  header: ReactNode;
  cell: (row: Row) => ReactNode;
  align?: "left" | "center" | "right";
  /** Extra classes for the header and cells (width, hiding on mobile...). */
  className?: string;
  /** Makes the header a sort control; the value is sent to `onSortChange`. */
  sortKey?: string;
}

interface DataTableProps<Row> {
  columns: Column<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string | number;
  /** Accessible name of the table, announced by screen readers. */
  caption: string;
  loading?: boolean;
  /** Rows of skeleton shown while `loading` and there are no rows yet. */
  skeletonRows?: number;
  /** Shown when there are no rows and nothing is loading. */
  empty?: ReactNode;
  /** Makes each row an actionable item (mouse, Enter and Space). */
  onRowClick?: (row: Row) => void;
  /** Current sort, for columns that declare a `sortKey`. */
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
}

const ALIGN = { left: "text-left", center: "text-center", right: "text-right" };

/**
 * A table with a sticky header, horizontal scroll that keyboard users can
 * reach, loading skeletons and an empty state.
 */
export function DataTable<Row>({
  columns,
  rows,
  getRowKey,
  caption,
  loading = false,
  skeletonRows = 5,
  empty,
  onRowClick,
  sort,
  onSortChange,
}: DataTableProps<Row>) {
  const showSkeleton = loading && rows.length === 0;
  const showEmpty = !loading && rows.length === 0;

  const onKeyDown = (event: KeyboardEvent, row: Row) => {
    if (!onRowClick) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onRowClick(row);
    }
  };

  return (
    <div
      className="overflow-x-auto"
      role="region"
      aria-label={caption}
      tabIndex={0}
    >
      <table className="w-full border-collapse text-sm" aria-busy={loading}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={
                  column.sortKey && sort ? ariaSort(sort, column.sortKey) : undefined
                }
                className={cn(
                  "sticky top-0 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500",
                  ALIGN[column.align ?? "left"],
                  column.className,
                )}
              >
                {column.sortKey && sort && onSortChange ? (
                  <button
                    type="button"
                    onClick={() => onSortChange(nextSort(sort, column.sortKey as string))}
                    className="inline-flex items-center gap-1 rounded uppercase tracking-wide hover:text-slate-900"
                  >
                    {column.header}
                    {sort.field === column.sortKey ? (
                      sort.order === "asc" ? (
                        <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-40" aria-hidden="true" />
                    )}
                  </button>
                ) : (
                  column.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {showSkeleton &&
            Array.from({ length: skeletonRows }, (_, index) => (
              <tr key={`skeleton-${index}`} data-testid="skeleton-row">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="border-b border-slate-100 px-4 py-3.5"
                  >
                    <Skeleton className="h-4 w-3/4" />
                  </td>
                ))}
              </tr>
            ))}

          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              tabIndex={onRowClick ? 0 : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={onRowClick ? (event) => onKeyDown(event, row) : undefined}
              className={cn(
                "transition-colors hover:bg-slate-50/70",
                onRowClick && "cursor-pointer focus-visible:bg-brand-50",
              )}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    "border-b border-slate-100 px-4 py-3 align-middle text-slate-700",
                    ALIGN[column.align ?? "left"],
                    column.className,
                  )}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}

          {showEmpty && (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10">
                {empty ?? (
                  <p className="text-center text-sm text-slate-400">
                    Nenhum registro encontrado.
                  </p>
                )}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

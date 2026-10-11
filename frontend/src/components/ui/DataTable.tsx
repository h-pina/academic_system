"use client";

import type { KeyboardEvent, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/ui/Skeleton";

export interface Column<Row> {
  /** Stable key for the column. */
  key: string;
  header: ReactNode;
  cell: (row: Row) => ReactNode;
  align?: "left" | "center" | "right";
  /** Extra classes for the header and cells (width, hiding on mobile...). */
  className?: string;
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
                className={cn(
                  "sticky top-0 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500",
                  ALIGN[column.align ?? "left"],
                  column.className,
                )}
              >
                {column.header}
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

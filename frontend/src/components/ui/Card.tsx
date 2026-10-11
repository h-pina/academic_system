import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** A raised surface: the container of a table, a form or a block of content. */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn("rounded-xl border border-slate-200 bg-surface shadow-card", className)}
    />
  );
}

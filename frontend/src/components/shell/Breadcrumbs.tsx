import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Crumb } from "@/lib/shell";

/** Where the user is. The last crumb is the current page. */
export default function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Você está em" className="border-b border-slate-200 bg-surface px-4 py-2.5 sm:px-6">
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden="true" />
              )}
              {crumb.href && !last ? (
                <Link
                  href={crumb.href}
                  className="text-slate-500 no-underline hover:text-brand-600"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className={last ? "font-semibold text-slate-900" : "text-slate-500"}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

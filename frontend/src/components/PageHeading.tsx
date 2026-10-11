import type { ReactNode } from "react";

interface PageHeadingProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

/** Title block shared by the screens: what this is, and what you can do. */
export default function PageHeading({
  title,
  description,
  actions,
}: PageHeadingProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-slate-500">{description}</p>
        )}
      </div>
      {actions}
    </div>
  );
}

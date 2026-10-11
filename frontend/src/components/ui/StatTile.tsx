import { cn } from "@/lib/cn";

const TONES = {
  blue: "bg-tile-blue",
  coral: "bg-tile-coral",
  sun: "bg-tile-sun",
  mint: "bg-tile-mint",
} as const;

interface StatTileProps {
  label: string;
  value: string | number;
  tone?: keyof typeof TONES;
  /** Secondary line, e.g. a comparison or a unit. */
  hint?: string;
  className?: string;
}

/** A headline indicator: one number, what it is, optionally a note. */
export function StatTile({
  label,
  value,
  tone = "blue",
  hint,
  className,
}: StatTileProps) {
  return (
    <div className={cn("flex flex-col gap-0.5 rounded-xl p-4", TONES[tone], className)}>
      <span className="font-display text-3xl font-extrabold leading-none tabular-nums text-slate-900">
        {value}
      </span>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {hint && <span className="text-xs text-slate-600">{hint}</span>}
    </div>
  );
}

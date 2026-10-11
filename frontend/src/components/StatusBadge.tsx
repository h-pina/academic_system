import type { Tone } from "@/lib/labels";

const TONE_STYLES: Record<Tone, string> = {
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-700",
  neutral: "bg-slate-100 text-slate-600",
};

interface StatusBadgeProps {
  label: string;
  tone?: Tone;
}

export default function StatusBadge({
  label,
  tone = "neutral",
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_STYLES[tone]}`}
    >
      {label}
    </span>
  );
}

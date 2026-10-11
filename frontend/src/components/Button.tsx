import type { ButtonHTMLAttributes } from "react";
import {
  ArrowLeft,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";

export type ButtonVariant =
  | "add"
  | "save"
  | "cancel"
  | "edit"
  | "delete"
  | "close"
  | "back";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  variant: ButtonVariant;
  loading?: boolean;
  hint?: string;
}

const FULL_STYLES: Record<ButtonVariant, string> = {
  save: "bg-brand-600 hover:bg-brand-700 text-white shadow-card",
  cancel: "bg-surface hover:bg-slate-50 text-slate-700 border border-slate-300",
  add: "bg-brand-600 hover:bg-brand-700 text-white shadow-card",
  edit: "bg-surface hover:bg-slate-50 text-slate-700 border border-slate-300",
  delete: "bg-red-600 hover:bg-red-700 text-white shadow-card",
  close: "bg-surface hover:bg-slate-50 text-slate-700 border border-slate-300",
  back: "bg-surface hover:bg-slate-50 text-slate-700 border border-slate-300",
};

const ICON_ONLY_STYLES: Record<ButtonVariant, string> = {
  save: "text-brand-600 hover:bg-brand-50",
  cancel: "text-slate-500 hover:bg-slate-100",
  add: "text-brand-600 hover:bg-brand-50",
  edit: "text-slate-500 hover:bg-slate-100 hover:text-brand-600",
  delete: "text-slate-400 hover:bg-red-50 hover:text-red-600",
  close: "text-slate-500 hover:bg-slate-100",
  back: "text-slate-500 hover:bg-slate-100",
};

const ICONS: Record<ButtonVariant, LucideIcon> = {
  save: Save,
  cancel: X,
  add: Plus,
  edit: Pencil,
  delete: Trash2,
  close: X,
  back: ArrowLeft,
};

export default function Button({
  label,
  variant,
  loading = false,
  hint = "",
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  const hasLabel = Boolean(label && label.trim().length > 0);
  const Icon = ICONS[variant];

  return (
    <button
      {...rest}
      title={hint}
      disabled={loading || disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
        hasLabel
          ? `px-4 py-2 text-sm ${FULL_STYLES[variant]}`
          : `p-1.5 ${ICON_ONLY_STYLES[variant]}`
      } ${className}`}
    >
      {loading ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <>
          <Icon className="h-4 w-4" />
          {hasLabel && <span>{label}</span>}
        </>
      )}
    </button>
  );
}

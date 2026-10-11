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
import { Button as UiButton, IconButton } from "@/components/ui/Button";

/**
 * Adapter that keeps the original action-oriented API (`variant="edit"`,
 * `label`...) while rendering the component library's buttons, so every
 * screen already shares one look. New code should use `@/components/ui`.
 */
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

const ICONS: Record<ButtonVariant, LucideIcon> = {
  save: Save,
  cancel: X,
  add: Plus,
  edit: Pencil,
  delete: Trash2,
  close: X,
  back: ArrowLeft,
};

const STYLE: Record<ButtonVariant, "primary" | "secondary" | "ghost" | "danger"> = {
  save: "primary",
  add: "primary",
  cancel: "secondary",
  edit: "secondary",
  close: "secondary",
  back: "secondary",
  delete: "danger",
};

const ACCESSIBLE_NAME: Record<ButtonVariant, string> = {
  save: "Salvar",
  cancel: "Cancelar",
  add: "Adicionar",
  edit: "Editar",
  delete: "Excluir",
  close: "Fechar",
  back: "Voltar",
};

export default function Button({
  label,
  variant,
  loading = false,
  hint = "",
  className,
  ...rest
}: ButtonProps) {
  const Icon = ICONS[variant];
  const hasLabel = Boolean(label && label.trim().length > 0);

  if (hasLabel) {
    return (
      <UiButton
        {...rest}
        variant={STYLE[variant]}
        loading={loading}
        title={hint || undefined}
        icon={<Icon className="h-4 w-4" />}
        className={className}
      >
        {label}
      </UiButton>
    );
  }

  return (
    <IconButton
      {...rest}
      label={hint || ACCESSIBLE_NAME[variant]}
      variant={variant === "delete" ? "ghost" : "ghost"}
      loading={loading}
      className={
        variant === "delete"
          ? "text-slate-400 hover:bg-red-50 hover:text-red-600"
          : variant === "edit"
            ? "hover:text-brand-600"
            : className
      }
    >
      <Icon className="h-4 w-4" />
    </IconButton>
  );
}

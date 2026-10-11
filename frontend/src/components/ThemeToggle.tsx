"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { THEME_LABELS, nextPreference } from "@/lib/theme";

const ICONS = { light: Sun, dark: Moon, system: Monitor } as const;

/** Cycles light, dark and system; the label names the current choice. */
export default function ThemeToggle() {
  const { preference, cyclePreference } = useTheme();
  const Icon = ICONS[preference];
  const next = THEME_LABELS[nextPreference(preference)];

  return (
    <button
      type="button"
      onClick={cyclePreference}
      title={`${THEME_LABELS[preference]}. Clique para: ${next}`}
      aria-label={`${THEME_LABELS[preference]}. Clique para alternar para: ${next}`}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-surface text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

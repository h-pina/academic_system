"use client";

import { Menu } from "lucide-react";

interface ContentHeaderProps {
  title: string;
  onToggleMenu: () => void;
}

export default function ContentHeader({
  title,
  onToggleMenu,
}: ContentHeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-surface px-4 sm:px-6">
      <button
        onClick={onToggleMenu}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
      >
        <Menu className="h-4 w-4" />
        <span className="hidden sm:inline">Menu</span>
      </button>

      <h1 className="truncate text-sm font-semibold text-slate-900">{title}</h1>
    </header>
  );
}

"use client";

import { Menu as MenuIcon } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import ThemeToggle from "@/components/ThemeToggle";
import UserMenu from "@/components/shell/UserMenu";
import { IconButton } from "@/components/ui/Button";

interface TopBarProps {
  user: { name: string; roleLabel: string } | null;
  /** Whether the menu button acts on a visible sidebar (desktop) or a drawer. */
  menuLabel: string;
  showMenuButton: boolean;
  onMenu: () => void;
  onShortcuts: () => void;
  onSignOut: () => void;
}

export default function TopBar({
  user,
  menuLabel,
  showMenuButton,
  onMenu,
  onShortcuts,
  onSignOut,
}: TopBarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-surface px-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        {showMenuButton && (
          <IconButton label={menuLabel} onClick={onMenu}>
            <MenuIcon className="h-5 w-5" />
          </IconButton>
        )}
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark size={36} />
          <div className="hidden min-w-0 leading-tight sm:block">
            <p className="truncate font-display text-sm font-bold tracking-tight text-slate-900">
              Sistema Acadêmico
            </p>
            <p className="text-xs text-slate-500">Gestão acadêmica</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        {user && (
          <UserMenu
            name={user.name}
            roleLabel={user.roleLabel}
            onShortcuts={onShortcuts}
            onSignOut={onSignOut}
          />
        )}
      </div>
    </header>
  );
}

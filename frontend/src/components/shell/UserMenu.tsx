"use client";

import * as Menu from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { ChevronDown, Keyboard, LogOut, UserRound } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";

interface UserMenuProps {
  name: string;
  roleLabel: string;
  onShortcuts: () => void;
  onSignOut: () => void;
}

const ITEM =
  "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900";

/** The signed-in person: their data, shortcuts and sign out. */
export default function UserMenu({
  name,
  roleLabel,
  onShortcuts,
  onSignOut,
}: UserMenuProps) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`Menu de ${name}`}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-slate-100"
      >
        <Avatar name={name} size="md" />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block text-sm font-medium text-slate-900">{name}</span>
          <span className="block text-xs text-slate-500">{roleLabel}</span>
        </span>
        <ChevronDown className="h-4 w-4 text-slate-400" aria-hidden="true" />
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[14rem] animate-scale-in rounded-xl border border-slate-200 bg-surface p-1.5 shadow-panel"
        >
          <div className="px-3 py-2">
            <p className="text-sm font-semibold text-slate-900">{name}</p>
            <p className="text-xs text-slate-500">{roleLabel || "Sem vínculo"}</p>
          </div>
          <Menu.Separator className="my-1 h-px bg-slate-200" />

          <Menu.Item asChild>
            <Link href="/app/profile" className={`${ITEM} no-underline`}>
              <UserRound className="h-4 w-4 text-slate-400" /> Meus dados
            </Link>
          </Menu.Item>
          <Menu.Item className={ITEM} onSelect={onShortcuts}>
            <Keyboard className="h-4 w-4 text-slate-400" /> Atalhos de teclado
          </Menu.Item>
          <Menu.Separator className="my-1 h-px bg-slate-200" />
          <Menu.Item className={ITEM} onSelect={onSignOut}>
            <LogOut className="h-4 w-4 text-slate-400" /> Sair
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}

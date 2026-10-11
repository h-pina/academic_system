"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import SideNav from "@/components/shell/SideNav";
import type { NavSection } from "@/config/navigation";

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sections: NavSection[];
  pathname: string;
}

/** The navigation as a drawer on small screens: focus is trapped, Esc closes it. */
export default function MobileNav({
  open,
  onOpenChange,
  sections,
  pathname,
}: MobileNavProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-slate-900/40 backdrop-blur-sm lg:hidden" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 left-0 z-50 flex w-[min(20rem,85vw)] flex-col bg-surface shadow-panel focus:outline-none lg:hidden"
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4">
            <Dialog.Title className="flex items-center gap-3 font-display text-sm font-bold text-slate-900">
              <BrandMark size={32} />
              Sistema Acadêmico
            </Dialog.Title>
            <Dialog.Close
              aria-label="Fechar menu"
              className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <SideNav
              sections={sections}
              pathname={pathname}
              onNavigate={() => onOpenChange(false)}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

"use client";

import { Modal } from "@/components/ui/Modal";

const SHORTCUTS = [
  { keys: "/", action: "Ir para o campo de busca da página" },
  { keys: "M", action: "Abrir ou recolher o menu" },
  { keys: "Esc", action: "Fechar janelas e menus abertos" },
  { keys: "Tab", action: "Avançar entre os controles" },
];

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Atalhos de teclado"
      description="Funcionam fora de campos de texto."
      size="sm"
    >
      <dl className="space-y-3">
        {SHORTCUTS.map((shortcut) => (
          <div key={shortcut.keys} className="flex items-center justify-between gap-4 text-sm">
            <dd className="text-slate-600">{shortcut.action}</dd>
            <dt>
              <kbd className="rounded-md border border-slate-300 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-700">
                {shortcut.keys}
              </kbd>
            </dt>
          </div>
        ))}
      </dl>
    </Modal>
  );
}

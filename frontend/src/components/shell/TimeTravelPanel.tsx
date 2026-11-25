"use client";

import { useState } from "react";
import { Clock, RotateCcw, X } from "lucide-react";
import MonthCalendar, { type DayMarker } from "@/components/shell/MonthCalendar";
import { Button } from "@/components/ui";
import { formatIsoDate, type TravelTarget } from "@/lib/academic";

interface TimeTravelPanelProps {
  /** The system's current day. */
  today: string;
  simulated: boolean;
  /** Whether the environment lets the clock be moved. */
  canControl: boolean;
  targets: TravelTarget[];
  markers: Record<string, DayMarker[]>;
  onTravel: (body: { date: string } | { days: number }) => void;
  onReset: () => void;
}

/**
 * Development tool: a floating widget to move the server's clock and see what
 * happens when a period ends. Pick a day on the calendar, or use a shortcut.
 * While the date is simulated everyone sees a notice.
 */
export default function TimeTravelPanel({ today, simulated, canControl, targets, markers, onTravel, onReset }: TimeTravelPanelProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(today);

  if (!simulated && !canControl) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end text-sm">
      {open && canControl && (
        <section aria-label="Viagem no tempo" className="mb-2 w-72 rounded-xl border border-slate-200 bg-surface p-4 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Viagem no tempo</h2>
            <button type="button" aria-label="Fechar viagem no tempo" onClick={() => setOpen(false)} className="rounded p-1 text-slate-500 hover:bg-slate-100">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <p className="mb-3 text-slate-600">
            Hoje no sistema: <strong>{formatIsoDate(today)}</strong>
            {simulated ? " (simulado)" : " (real)"}. Vale para todos os usuários. Só para desenvolvimento.
          </p>

          <MonthCalendar value={selected} today={today} markers={markers} onSelect={setSelected} />
          <p className="mb-3 mt-1 text-xs text-slate-500">Os pontos marcam os prazos do semestre em progresso.</p>

          <Button size="sm" className="mb-3 w-full" disabled={selected === today} onClick={() => onTravel({ date: selected })}>
            Ir para {formatIsoDate(selected)}
          </Button>

          <div className="mb-3 flex flex-wrap gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => onTravel({ days: -1 })}>−1 dia</Button>
            <Button size="sm" variant="secondary" onClick={() => onTravel({ days: 1 })}>+1 dia</Button>
            <Button size="sm" variant="secondary" onClick={() => onTravel({ days: 7 })}>+7 dias</Button>
          </div>

          {targets.length > 0 && (
            <div className="mb-3 flex flex-col gap-1.5">
              {targets.map((target) => (
                <Button key={target.label} size="sm" variant="secondary" onClick={() => onTravel({ date: target.date })}>
                  {target.label} ({formatIsoDate(target.date)})
                </Button>
              ))}
            </div>
          )}

          {simulated && (
            <Button size="sm" variant="ghost" icon={<RotateCcw className="h-4 w-4" />} onClick={onReset}>
              Voltar ao tempo real
            </Button>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={() => {
          if (!canControl) return;
          setSelected(today);
          setOpen((current) => !current);
        }}
        aria-expanded={canControl ? open : undefined}
        aria-label={simulated ? `Data simulada: ${formatIsoDate(today)}` : "Viagem no tempo"}
        title={simulated ? `Data simulada: ${formatIsoDate(today)}` : "Viagem no tempo"}
        className={`relative inline-flex h-12 w-12 items-center justify-center rounded-full shadow-panel transition-transform hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/30 ${simulated ? "bg-amber-400 text-amber-950" : "bg-brand-600 text-white"} ${canControl ? "cursor-pointer" : "cursor-default"}`}
      >
        <Clock className="h-6 w-6" aria-hidden="true" />
        {simulated && (
          <span aria-hidden="true" className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full border-2 border-white bg-red-500" />
        )}
      </button>
    </div>
  );
}

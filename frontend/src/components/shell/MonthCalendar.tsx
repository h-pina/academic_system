"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { WEEKDAY_HEADERS, WEEKDAY_NAMES, addMonths, monthGrid, monthOf, monthTitle } from "@/lib/monthGrid";

export interface DayMarker {
  /** Short description, announced and shown as a tooltip. */
  label: string;
}

interface MonthCalendarProps {
  /** The chosen day (`YYYY-MM-DD`). */
  value: string;
  /** The system's current day, outlined. */
  today: string;
  /** Days worth noticing (deadlines), by ISO date. */
  markers?: Record<string, DayMarker[]>;
  onSelect: (date: string) => void;
}

/** A month grid to pick a day. Arrow buttons change the month. */
export default function MonthCalendar({ value, today, markers = {}, onSelect }: MonthCalendarProps) {
  const [view, setView] = useState(monthOf(value));
  const weeks = monthGrid(view);
  const title = monthTitle(view);

  return (
    <div role="group" aria-label="Calendário">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" aria-label="Mês anterior" onClick={() => setView(addMonths(view, -1))} className="rounded p-1 text-slate-600 hover:bg-slate-100">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
        <p aria-live="polite" className="font-semibold capitalize text-slate-900">{title}</p>
        <button type="button" aria-label="Próximo mês" onClick={() => setView(addMonths(view, 1))} className="rounded p-1 text-slate-600 hover:bg-slate-100">
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <table className="w-full table-fixed border-collapse text-center text-sm">
        <thead>
          <tr>
            {WEEKDAY_HEADERS.map((letter, index) => (
              <th key={index} scope="col" className="pb-1 text-xs font-medium text-slate-500">
                <span aria-hidden="true">{letter}</span>
                <span className="sr-only">{WEEKDAY_NAMES[index]}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, row) => (
            <tr key={row}>
              {week.map((date, column) => {
                if (!date) return <td key={column} />;
                const marked = markers[date] ?? [];
                const selected = date === value;
                const label = [`${Number(date.slice(8))} de ${title}`, ...marked.map((m) => m.label), date === today ? "dia atual do sistema" : ""]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <td key={column} className="p-0.5">
                    <button
                      type="button"
                      aria-label={label}
                      aria-pressed={selected}
                      title={marked.map((m) => m.label).join(" · ") || undefined}
                      onClick={() => onSelect(date)}
                      className={cn(
                        "relative h-8 w-full rounded-lg text-sm transition-colors",
                        selected ? "bg-brand-600 font-semibold text-white" : "text-slate-800 hover:bg-slate-100",
                        date === today && !selected && "ring-2 ring-inset ring-brand-500",
                      )}
                    >
                      {Number(date.slice(8))}
                      {marked.length > 0 && (
                        <span aria-hidden="true" className={cn("absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full", selected ? "bg-white" : "bg-amber-500")} />
                      )}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

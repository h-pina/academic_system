"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button, IconButton } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { WEEKDAYS, type SlotDraft } from "@/lib/academic";

interface ScheduleEditorProps {
  value: SlotDraft[];
  onChange: (slots: SlotDraft[]) => void;
  error?: string;
}

/** Weekly meetings of a class: weekday, start, end and room. */
export default function ScheduleEditor({ value, onChange, error }: ScheduleEditorProps) {
  const update = (index: number, patch: Partial<SlotDraft>) =>
    onChange(value.map((slot, i) => (i === index ? { ...slot, ...patch } : slot)));

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1.5 text-sm font-medium text-slate-700">Horários</legend>
      {value.map((slot, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          <Select
            aria-label={`Dia da semana do horário ${index + 1}`}
            className="w-40"
            value={slot.weekday}
            onChange={(event) => update(index, { weekday: Number(event.target.value) })}
          >
            {WEEKDAYS.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </Select>
          <Input
            type="time"
            aria-label={`Início do horário ${index + 1}`}
            className="w-28"
            value={slot.startTime}
            onChange={(event) => update(index, { startTime: event.target.value })}
          />
          <span aria-hidden="true">–</span>
          <Input
            type="time"
            aria-label={`Término do horário ${index + 1}`}
            className="w-28"
            value={slot.endTime}
            onChange={(event) => update(index, { endTime: event.target.value })}
          />
          <Input
            aria-label={`Sala do horário ${index + 1}`}
            placeholder="Sala"
            className="w-28"
            maxLength={40}
            value={slot.room ?? ""}
            onChange={(event) => update(index, { room: event.target.value })}
          />
          <IconButton
            label={`Remover horário ${index + 1}`}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
            className="hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </IconButton>
        </div>
      ))}
      <div>
        <Button
          variant="secondary"
          size="sm"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => onChange([...value, { weekday: 1, startTime: "08:00", endTime: "10:00" }])}
        >
          Adicionar horário
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </fieldset>
  );
}

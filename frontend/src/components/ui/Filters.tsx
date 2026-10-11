"use client";

import { Field } from "@/components/ui/Field";
import { Input, Select } from "@/components/ui/Input";

interface SearchFilterProps {
  label?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}

/** A labelled search box for a list (the "/" shortcut focuses it). */
export function SearchFilter({
  label = "Buscar",
  placeholder,
  value,
  onChange,
}: SearchFilterProps) {
  return (
    <Field label={label} className="min-w-[14rem] flex-1">
      {(control) => (
        <Input
          {...control}
          type="search"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </Field>
  );
}

interface SelectFilterProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string | number; label: string }[];
  /** Text of the "no filter" option. */
  allLabel?: string;
}

export function SelectFilter({
  label,
  value,
  onChange,
  options,
  allLabel = "Todos",
}: SelectFilterProps) {
  return (
    <Field label={label}>
      {(control) => (
        <Select
          {...control}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{allLabel}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

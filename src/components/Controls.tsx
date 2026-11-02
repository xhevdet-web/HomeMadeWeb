import i18n from "../i18n";
import { useState, type ReactNode } from "react";
import { Icon } from "./Icon";

export function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/** Controlled chip row when `value`/`onChange` are given, otherwise keeps its own state. */
export function ChipGroup({ options, value, defaultValue = 0, onChange, label }: {
  options: string[];
  value?: number;
  defaultValue?: number;
  onChange?: (index: number) => void;
  label?: string;
}) {
  const [own, setOwn] = useState(defaultValue);
  const selected = value ?? own;
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {options.map((o, i) => (
        <Chip
          key={o}
          selected={i === selected}
          onClick={() => {
            setOwn(i);
            onChange?.(i);
          }}
        >
          {o}
        </Chip>
      ))}
    </div>
  );
}

export function Stepper({ value, onChange, label, min = 1, max = Infinity }: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  min?: number;
  max?: number;
}) {
  const btn =
    "flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-secondary disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border p-1" role="group" aria-label={label}>
      <button type="button" className={btn} onClick={() => onChange(value - 1)} disabled={value <= min} aria-label={i18n.t("controls.decrease", { label })}>
        <Icon name="minus" size={16} />
      </button>
      <span className="w-8 text-center font-display font-semibold" aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} onClick={() => onChange(value + 1)} disabled={value >= max} aria-label={i18n.t("controls.increase", { label })}>
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? "bg-primary" : "bg-secondary"}`}
    >
      <span
        className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-foreground transition-transform duration-300 ${
          checked ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

export const inputClass =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/40 focus:outline-none";

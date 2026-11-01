import { useEffect, useRef, useState } from "react";
import type { Component, MeasuredSize } from "../../api/models";
import { Icon } from "../../components/Icon";
import { money } from "../../lib/format";
import { BottomSheet } from "../../studio/BottomSheet";
import { useDragSource } from "../../studio/dnd/hooks";
import { playOnce } from "../../studio/ui";
import { stockState, typeLabel } from "../data";
import { PieceSwatch } from "./JewelryCanvas";
import { STEP_MM, TOLERANCE_MM, toPiece, type Piece } from "./logic";

const cmText = (mm: number) => String(Math.round(mm) / 10);

/** "14.2 / 17.5 cm used" with a thin progress bar; green "Complete" within ±2 mm. */
export function MeasurementBar({ noun, usedMm, lengthMm, size, onLength }: {
  noun: string;
  usedMm: number;
  lengthMm: number;
  size: MeasuredSize | null;
  onLength: (mm: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const complete = Math.abs(usedMm - lengthMm) <= TOLERANCE_MM;
  const pct = Math.min(100, (usedMm / Math.max(1, lengthMm)) * 100);
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-2.5" aria-label={`${cmText(usedMm)} of ${cmText(lengthMm)} cm used`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2 text-sm">
          <span className={`font-display font-semibold ${complete ? "text-success" : ""}`}>
            {complete ? `${noun[0].toUpperCase()}${noun.slice(1)} complete` : `${cmText(usedMm)} / ${cmText(lengthMm)} cm`}
          </span>
          {!complete && <span className="text-xs text-muted-foreground">used</span>}
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
          <div className={`h-full rounded-full transition-[width] duration-300 ${complete ? "bg-success" : "bg-primary"}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      {size && (
        <button type="button" onClick={() => setOpen(true)} className="min-h-11 shrink-0 rounded-full px-3 text-sm font-semibold text-primary hover:bg-secondary">
          Change length
        </button>
      )}
      {size && <LengthSheet open={open} onClose={() => setOpen(false)} noun={noun} size={size} lengthMm={lengthMm} usedMm={usedMm} onLength={onLength} />}
    </div>
  );
}

function LengthSheet({ open, onClose, noun, size, lengthMm, usedMm, onLength }: {
  open: boolean;
  onClose: () => void;
  noun: string;
  size: MeasuredSize;
  lengthMm: number;
  usedMm: number;
  onLength: (mm: number) => void;
}) {
  const [warning, setWarning] = useState<string | null>(null);
  const set = (mm: number) => {
    const next = Math.min(size.maxMeasurementMm, Math.max(size.minMeasurementMm, Math.round(mm)));
    if (next + TOLERANCE_MM < usedMm) {
      setWarning(`Your current design uses ${cmText(usedMm)} cm of components. Remove some components before reducing the ${noun} to ${cmText(next)} cm.`);
      return;
    }
    setWarning(null);
    onLength(next);
  };
  const btn = "flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border transition-colors hover:bg-secondary disabled:opacity-40";
  return (
    <BottomSheet title="Change length" open={open} onClose={onClose}>
      <p className="text-sm text-muted-foreground">
        {size.name} · {cmText(size.minMeasurementMm)}–{cmText(size.maxMeasurementMm)} cm
      </p>
      <p className="mt-3 text-center font-display text-4xl font-semibold text-primary">{cmText(lengthMm)} cm</p>
      <div className="mt-5 flex items-center gap-3">
        <button type="button" className={btn} aria-label="Shorter by 0.5 cm" onClick={() => set(lengthMm - STEP_MM)} disabled={lengthMm <= size.minMeasurementMm}>
          <Icon name="minus" size={18} />
        </button>
        <label htmlFor="sheet-length" className="sr-only">
          Length
        </label>
        <input
          id="sheet-length"
          type="range"
          min={size.minMeasurementMm}
          max={size.maxMeasurementMm}
          step={STEP_MM}
          value={lengthMm}
          onChange={(e) => set(Number(e.target.value))}
          aria-valuetext={`${cmText(lengthMm)} cm`}
          className="w-full accent-[var(--primary)]"
        />
        <button type="button" className={btn} aria-label="Longer by 0.5 cm" onClick={() => set(lengthMm + STEP_MM)} disabled={lengthMm >= size.maxMeasurementMm}>
          <Icon name="plus" size={18} />
        </button>
      </div>
      {warning && (
        <p role="alert" className="mt-4 rounded-2xl border border-primary/40 bg-primary/10 p-3 text-sm">
          {warning}
        </p>
      )}
      <button type="button" onClick={onClose} className="mt-6 min-h-12 w-full rounded-full bg-primary font-semibold text-primary-foreground">
        Done
      </button>
    </BottomSheet>
  );
}

/** The placed beads in order, in a narrow column beside the stage. Tapping one selects it. */
export function BeadSequence({ pieces, selected, onSelect }: { pieces: Piece[]; selected: number | null; onSelect: (i: number | null) => void }) {
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    if (selected === null) return;
    list.current?.children[selected]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);
  if (!pieces.length) return null;
  return (
    <ol ref={list} aria-label="Bead sequence" className="flex h-full w-[46px] flex-col items-center gap-1 overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card py-2 [scrollbar-width:none]">
      {pieces.map((p, i) => (
        <li key={`${i}-${p.id}`}>
          <button
            type="button"
            onClick={() => onSelect(selected === i ? null : i)}
            aria-label={`Select position ${i + 1}, ${p.name}`}
            aria-pressed={selected === i}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${selected === i ? "bg-primary/25 ring-2 ring-primary" : "hover:bg-secondary"}`}
          >
            <PieceSwatch piece={p} size={24} />
          </button>
        </li>
      ))}
    </ol>
  );
}

interface PickerProps {
  components: Component[];
  pieces: string[];
  /** Why a component can't go on right now, if anything. */
  problem: (c: Component) => string | null;
  replacing: boolean;
  full: boolean;
  onPick: (c: Component, tile: HTMLElement | null) => void;
  coach: boolean;
  onDismissCoach: () => void;
}

/** Material sidebar (2+ materials), hint line and a grid of drag-and-tap tiles, like the app's BeadPicker. */
export function JewelryPicker({ components, pieces, problem, replacing, full, onPick, coach, onDismissCoach }: PickerProps) {
  const materials = [...new Set(components.map((c) => c.type?.trim()).filter((t): t is string => !!t))];
  const [material, setMaterial] = useState("");
  const sidebar = materials.length > 1;
  const shown = components.filter((c) => !material || c.type?.trim() === material);
  const hint = full ? "Your piece is full. Drag a bead onto your piece to swap one." : replacing ? "Tap to replace, or hold and drag onto your piece" : "Tap to add, or hold and drag onto your piece";

  return (
    <div className="relative flex gap-3">
      {sidebar && (
        <div role="group" aria-label="Filter by material" className="sticky top-0 flex w-[68px] shrink-0 flex-col gap-1.5 self-start">
          {["", ...materials].map((m) => (
            <button
              key={m || "all"}
              type="button"
              onClick={() => setMaterial(m)}
              aria-pressed={material === m}
              aria-label={m ? `Show ${m}` : "Show all materials"}
              className={`min-h-11 rounded-xl border px-1 text-[11px] leading-tight font-semibold break-words transition-colors ${
                material === m ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              {m ? typeLabel(m) : "All"}
            </button>
          ))}
        </div>
      )}
      <div className="min-w-0 flex-1">
        {coach && <CoachMark onDismiss={onDismissCoach} />}
        <p className="mb-2 text-xs text-muted-foreground">{hint}</p>
        {shown.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">No little treasures match these filters.</p>
            <button type="button" onClick={() => setMaterial("")} className="mt-3 min-h-11 rounded-full border border-border px-4 text-sm font-semibold hover:bg-secondary">
              Reset filters
            </button>
          </div>
        ) : (
          <ul className={`grid gap-2 ${sidebar ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-4 sm:grid-cols-5"} md:grid-cols-3 lg:grid-cols-4`}>
            {shown.map((c) => (
              <li key={c.id}>
                <Tile component={c} count={pieces.filter((id) => id === c.id).length} problem={problem(c)} replacing={replacing} onPick={onPick} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Tile({ component: c, count, problem, replacing, onPick }: { component: Component; count: number; problem: string | null; replacing: boolean; onPick: PickerProps["onPick"] }) {
  const ref = useRef<HTMLButtonElement>(null);
  const stock = stockState(c, count);
  const unusable = !c.effectiveLengthMm || stock.disabled;
  const piece = toPiece(c);
  const drag = useDragSource(
    () => (unusable ? null : { kind: "component", id: c.id, name: c.name, image: c.imageUrl, shape: "circle" }),
    () => {
      onPick(c, ref.current);
      if (problem) playOnce(ref.current, "shake");
    },
  );
  const status = !c.effectiveLengthMm ? "Not available yet" : stock.disabled ? stock.label : problem;

  return (
    <button
      ref={ref}
      type="button"
      {...drag}
      aria-disabled={unusable}
      aria-label={`${replacing ? "Replace with" : "Add"} ${c.name}, ${money(c.price)}${c.effectiveLengthMm ? `, ${c.effectiveLengthMm} mm` : ""}${status ? `, ${status}` : ""}`}
      className={`no-callout relative flex w-full flex-col items-center gap-0.5 rounded-2xl border px-1 pt-2 pb-2 text-center transition-colors [touch-action:pan-x_pan-y] ${
        count ? "border-primary/50 bg-primary/5" : "border-transparent"
      } hover:border-border hover:bg-secondary/50 ${unusable || problem ? "opacity-45" : ""}`}
    >
      {count > 0 && (
        <span className="absolute top-1 left-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground" aria-hidden="true">
          {count}
        </span>
      )}
      <span className="absolute top-1 right-1 text-primary" aria-hidden="true">
        <Icon name={problem ? "hand" : "plus"} size={12} />
      </span>
      <PieceSwatch piece={piece} />
      <span className="line-clamp-2 text-[11px] leading-tight font-semibold">{c.name}</span>
      <span className="text-[11px] text-primary">{money(c.price)}</span>
      <span className="text-[10px] leading-tight text-muted-foreground">{status ?? (stock.label ? `${c.effectiveLengthMm} mm · ${stock.label}` : `${c.effectiveLengthMm} mm`)}</span>
    </button>
  );
}

/** First-visit hint over the picker; gone after the first add and remembered (hc.hint.dnd). */
export function CoachMark({ onDismiss, text = "Tap to add · Hold and drag onto your piece" }: { onDismiss: () => void; text?: string }) {
  return (
    <div role="note" className="img-fade mb-3 flex items-center gap-3 rounded-2xl border border-primary bg-primary/10 py-1 pr-1 pl-3">
      <Icon name="hand" size={18} className="shrink-0 text-primary" />
      <p className="flex-1 text-sm font-semibold">{text}</p>
      <button type="button" onClick={onDismiss} aria-label="Got it" className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-secondary">
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}

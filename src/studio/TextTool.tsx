import { useState } from "react";
import { Button } from "../components/Button";
import { Chip, inputClass } from "../components/Controls";
import { Icon } from "../components/Icon";
import { SectionLabel } from "../components/Page";
import { FONTS, TEXT_COLORS, newId, type FontId, type PlacedElement, type TextColor } from "./elements";

export const MAX_TEXTS = 6;
export const MAX_TEXT_LENGTH = 80;

type Weight = 300 | 400 | 700;
const WEIGHTS: [Weight, string][] = [
  [300, "Light"],
  [400, "Regular"],
  [700, "Bold"],
];

interface Style {
  font: FontId;
  weight: Weight;
  italic: boolean;
  color: TextColor;
  scale: number;
}

/** Add and style text. Edits the selected text element when there is one. */
export function TextTool({ texts, selected, onAdd, onUpdate, onDone, defaultColor = "gold" }: {
  texts: PlacedElement[];
  selected: PlacedElement | null;
  onAdd: (el: PlacedElement) => void;
  onUpdate: (el: PlacedElement, merge?: string) => void;
  onDone?: () => void;
  defaultColor?: TextColor;
}) {
  const editing = selected?.kind === "text" ? selected : null;
  const [draft, setDraft] = useState("");
  const [style, setStyle] = useState<Style>({ font: "classic", weight: 400, italic: false, color: defaultColor, scale: 0.16 });

  const current: Style & { text: string } = editing
    ? {
        font: editing.font ?? "classic",
        weight: editing.weight ?? 400,
        italic: editing.italic ?? false,
        color: editing.color ?? defaultColor,
        scale: editing.scale,
        text: editing.text ?? "",
      }
    : { ...style, text: draft };

  const full = !editing && texts.length >= MAX_TEXTS;

  const set = (patch: Partial<Style>, merge: string) => {
    setStyle((s) => ({ ...s, ...patch }));
    if (editing) onUpdate({ ...editing, ...patch }, `${merge}-${editing.id}`);
  };

  const add = () => {
    const text = draft.trim();
    if (!text || full) return;
    onAdd({ id: newId(), kind: "text", text, x: 0.5, y: 0.5, rotation: 0, z: 1, aspect: 0, ...style });
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <label htmlFor="text-tool-input">
          <SectionLabel as="span">{editing ? "Edit text" : "Your text"}</SectionLabel>
        </label>
        <div className="flex gap-2">
          <input
            id="text-tool-input"
            maxLength={MAX_TEXT_LENGTH}
            value={current.text}
            placeholder="Happy birthday!"
            disabled={full}
            onChange={(e) => (editing ? onUpdate({ ...editing, text: e.target.value }, `text-${editing.id}`) : setDraft(e.target.value))}
            onKeyDown={(e) => e.key === "Enter" && add()}
            className={inputClass}
          />
          {editing ? (
            <Button variant="secondary" size="sm" onClick={onDone}>
              Done
            </Button>
          ) : (
            <Button size="sm" onClick={add} disabled={!draft.trim() || full}>
              Add
            </Button>
          )}
        </div>
        <p className="mt-2 flex justify-between gap-3 text-xs text-muted-foreground">
          <span>Personalised text is free.</span>
          <span>
            {current.text.length}/{MAX_TEXT_LENGTH} · {texts.length} of {MAX_TEXTS} texts
          </span>
        </p>
        {full && <p className="mt-2 text-sm text-primary">You can add up to {MAX_TEXTS} texts. Select one to edit it.</p>}
      </div>

      <div>
        <SectionLabel>Font</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FONTS) as FontId[]).map((f) => (
            <Chip key={f} selected={current.font === f} onClick={() => set({ font: f }, "font")}>
              <span style={{ fontFamily: FONTS[f].family }}>{FONTS[f].label}</span>
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Weight</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {WEIGHTS.map(([w, name]) => (
            <Chip key={w} selected={current.weight === w} onClick={() => set({ weight: w }, "weight")}>
              {name}
            </Chip>
          ))}
          <button
            type="button"
            aria-pressed={current.italic}
            aria-label="Italic"
            onClick={() => set({ italic: !current.italic }, "italic")}
            className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors ${
              current.italic ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-secondary"
            }`}
          >
            <Icon name="italic" size={16} />
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="text-tool-size" className="flex justify-between">
          <SectionLabel as="span">Size</SectionLabel>
          <span className="text-xs text-muted-foreground">{Math.round(current.scale * 100)}</span>
        </label>
        <input
          id="text-tool-size"
          type="range"
          min={0.06}
          max={0.5}
          step={0.01}
          value={current.scale}
          onChange={(e) => set({ scale: Number(e.target.value) }, "size")}
          className="w-full accent-[var(--primary)]"
        />
      </div>

      <div>
        <SectionLabel>Colour</SectionLabel>
        <div className="flex flex-wrap gap-3" role="group" aria-label="Text colour">
          {(Object.keys(TEXT_COLORS) as TextColor[]).map((c) => (
            <button
              key={c}
              type="button"
              aria-label={TEXT_COLORS[c].name}
              aria-pressed={current.color === c}
              title={TEXT_COLORS[c].name}
              onClick={() => set({ color: c }, "color")}
              className={`h-9 w-9 rounded-full border border-border ${current.color === c ? "ring-2 ring-primary ring-offset-2 ring-offset-card" : ""}`}
              style={{ background: TEXT_COLORS[c].value }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

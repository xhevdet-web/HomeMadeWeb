import { useState } from "react";
import { Button } from "../components/Button";
import { Chip, inputClass } from "../components/Controls";
import { Icon } from "../components/Icon";
import { SectionLabel } from "../components/Page";
import i18n from "../i18n";
import { FONTS, TEXT_COLORS, newId, type FontId, type PlacedElement, type TextColor } from "./elements";

// Re-renders with the app when the language changes.
const t = i18n.t.bind(i18n);

export const MAX_TEXTS = 6;
export const MAX_TEXT_LENGTH = 80;

type Weight = 300 | 400 | 700;
const WEIGHTS: [Weight, "light" | "regular" | "bold"][] = [
  [300, "light"],
  [400, "regular"],
  [700, "bold"],
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
          <SectionLabel as="span">{editing ? t("textTool.editText") : t("textTool.yourText")}</SectionLabel>
        </label>
        <div className="flex gap-2">
          <input
            id="text-tool-input"
            maxLength={MAX_TEXT_LENGTH}
            value={current.text}
            placeholder={t("textTool.placeholder")}
            disabled={full}
            onChange={(e) => (editing ? onUpdate({ ...editing, text: e.target.value }, `text-${editing.id}`) : setDraft(e.target.value))}
            onKeyDown={(e) => e.key === "Enter" && add()}
            className={inputClass}
          />
          {editing ? (
            <Button variant="secondary" size="sm" onClick={onDone}>
              {t("common.done")}
            </Button>
          ) : (
            <Button size="sm" onClick={add} disabled={!draft.trim() || full}>
              {t("textTool.add")}
            </Button>
          )}
        </div>
        <p className="mt-2 flex justify-between gap-3 text-xs text-muted-foreground">
          <span>{t("textTool.free")}</span>
          <span>
            {current.text.length}/{MAX_TEXT_LENGTH} · {t("textTool.count", { count: texts.length, max: MAX_TEXTS })}
          </span>
        </p>
        {full && <p className="mt-2 text-sm text-primary">{t("textTool.full", { max: MAX_TEXTS })}</p>}
      </div>

      <div>
        <SectionLabel>{t("textTool.font")}</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FONTS) as FontId[]).map((f) => (
            <Chip key={f} selected={current.font === f} onClick={() => set({ font: f }, "font")}>
              <span style={{ fontFamily: FONTS[f].family }}>{t(`textTool.fonts.${f}`)}</span>
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>{t("textTool.weight")}</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {WEIGHTS.map(([w, name]) => (
            <Chip key={w} selected={current.weight === w} onClick={() => set({ weight: w }, "weight")}>
              {t(`textTool.weights.${name}`)}
            </Chip>
          ))}
          <button
            type="button"
            aria-pressed={current.italic}
            aria-label={t("textTool.italic")}
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
          <SectionLabel as="span">{t("textTool.size")}</SectionLabel>
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
        <SectionLabel>{t("textTool.colour")}</SectionLabel>
        <div className="flex flex-wrap gap-3" role="group" aria-label={t("textTool.textColour")}>
          {(Object.keys(TEXT_COLORS) as TextColor[]).map((c) => (
            <button
              key={c}
              type="button"
              aria-label={t(`textTool.colours.${c}`)}
              aria-pressed={current.color === c}
              title={t(`textTool.colours.${c}`)}
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

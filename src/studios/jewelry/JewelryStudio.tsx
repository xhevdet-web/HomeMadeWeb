import { useMemo, useRef, useState } from "react";
import type { Component } from "../../api/models";
import { studioHref } from "../../data/homeCategories";
import { cm } from "../../lib/format";
import { navigate } from "../../router";
import { useStageDrop } from "../../studio/dnd/hooks";
import { useSaveDesign, useStudioHistory } from "../../studio/StudioContext";
import { useUndoShortcuts } from "../../studio/useHistory";
import { StageFrame, StudioFrame, StudioToolbar } from "../../studio/StudioFrame";
import { useBecameTrue, useDndHint, useNotice } from "../../studio/ui";
import { componentById, stockState, type StudioProps } from "../data";
import { JewelryCanvas, captureJewelry, cordHit, type DropPreview } from "./JewelryCanvas";
import { BeadSequence, JewelryPicker, MeasurementBar } from "./JewelryParts";
import { MIN_JEWELRY_PRICE_CENTS, cordOf, isComplete, jewelryInput, nounOf, piecesOf, priceOf, roomMm, sizeOf, toPiece, missingForMinimum, usedCount, usedMm } from "./logic";
import { corsImage } from "../../studio/capture";
import i18n from "../../i18n";

// Re-renders with the app when the language changes.
const t = i18n.t.bind(i18n);

const move = (list: string[], from: number, to: number) => {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

export function JewelryStudio({ category, data }: StudioProps) {
  const history = useStudioHistory(category.id, "JEWELRY");
  const { state: draft, dispatch: update } = history;
  useUndoShortcuts(history.undo, history.redo);
  const [notice, notify] = useNotice();
  const [coach, dismissCoach] = useDndHint();
  const [rawSelected, setSelected] = useState<number | null>(null);
  const [preview, setPreview] = useState<DropPreview | null>(null);
  const [lifted, setLifted] = useState<number | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const byId = useMemo(() => componentById(data), [data]);
  const noun = nounOf(category);
  const kind = cordOf(category);
  const size = sizeOf(category, draft);
  const pieces = piecesOf(draft.pieces, byId);

  const saver = useSaveDesign(category, async () => ({
    input: jewelryInput(category, draft),
    files: { preview: await captureJewelry(kind, pieces, draft.lengthMm) },
  }));

  const selected = rawSelected !== null && rawSelected < draft.pieces.length ? rawSelected : null;
  const selectedComp = selected !== null ? byId.get(draft.pieces[selected]) : undefined;
  const used = usedMm(draft.pieces, byId);
  const complete = isComplete(draft, byId);
  const price = priceOf(draft.pieces, byId);
  const room = roomMm(draft, byId);
  const smallest = Math.min(...data.components.map((c) => c.effectiveLengthMm ?? Infinity));
  const full = room < smallest;
  // Length is information only: a piece can be ordered before it fills its length, from €5.00.
  const orderable = price >= MIN_JEWELRY_PRICE_CENTS;
  const pulse = useBecameTrue(orderable);

  /** Why a component can't be added (or swapped into the selection) right now. */
  const problem = (c: Component, replace: number | null = selected) => {
    if (!c.effectiveLengthMm) return t("jewelry.notAvailable");
    const stock = stockState(c, usedCount(draft.pieces, c.id) - (replace !== null && draft.pieces[replace] === c.id ? 1 : 0));
    if (stock.disabled) return stock.label;
    const left = roomMm(draft, byId, replace);
    return c.effectiveLengthMm > left ? t("jewelry.doesntFit", { left: Math.max(0, left) }) : null;
  };

  const added = () => coach && dismissCoach();

  /** Tap: replace the selected bead, otherwise add at the end. */
  const tapPick = (c: Component) => {
    const why = problem(c);
    if (why) return notify(why, "warn");
    if (selected !== null) {
      update((d) => ({ ...d, pieces: d.pieces.map((p, i) => (i === selected ? c.id : p)) }));
      notify(t("jewelry.replacedSelected", { name: c.name }));
    } else {
      update((d) => ({ ...d, pieces: [...d.pieces, c.id] }));
      notify(t(`jewelry.nouns.${noun}.added`, { name: c.name }));
    }
    added();
  };

  /** Where a drag would land: a bead to replace, or the gap to insert into. */
  const dropAt = (p: { x: number; y: number }, id: string, index?: number) => {
    if (!svg.current) return null;
    const isBead = index !== undefined;
    const hit = cordHit(svg.current, kind, pieces, draft.lengthMm, p, isBead ? index : null);
    if (!hit) return null;
    if (!isBead && hit.onBead !== null) return { mode: "replace" as const, index: hit.onBead };
    return { mode: "insert" as const, index: hit.insertAt, id };
  };

  const chip = useStageDrop(
    stageRef,
    (p, payload) => {
      const at = dropAt(p, payload.id, payload.kind === "bead" ? payload.index : undefined);
      if (payload.kind === "bead") {
        setLifted(payload.index ?? null);
        if (at) setPreview({ mode: "insert", index: at.index, piece: toPiece(byId.get(payload.id)!) });
        return t("jewelry.releaseToMove");
      }
      const c = byId.get(payload.id);
      if (!c || !at) return t("mugs.releaseToAdd");
      const why = problem(c, at.mode === "replace" ? at.index : null);
      if (why) {
        setPreview(null);
        return why;
      }
      setPreview(at.mode === "replace" ? { mode: "replace", index: at.index } : { mode: "insert", index: at.index, piece: toPiece(c) });
      return at.mode === "replace" ? t("jewelry.releaseToReplace", { name: byId.get(draft.pieces[at.index])?.name ?? t("jewelry.thisDetail") }) : t("mugs.releaseToAdd");
    },
    (p, payload) => {
      setPreview(null);
      setLifted(null);
      const at = dropAt(p, payload.id, payload.kind === "bead" ? payload.index : undefined);
      if (!at) return false;
      if (payload.kind === "bead" && payload.index !== undefined) {
        const to = Math.min(at.index, draft.pieces.length - 1);
        if (to !== payload.index) update((d) => ({ ...d, pieces: move(d.pieces, payload.index!, to) }));
        setSelected(to);
        notify(t("jewelry.movedHint"));
        return true;
      }
      const c = byId.get(payload.id);
      if (!c) return false;
      const why = problem(c, at.mode === "replace" ? at.index : null);
      if (why) {
        notify(why, "warn");
        return false;
      }
      if (at.mode === "replace") {
        update((d) => ({ ...d, pieces: d.pieces.map((x, i) => (i === at.index ? c.id : x)) }));
        notify(t(`jewelry.nouns.${noun}.replaced`, { name: c.name }));
      } else {
        update((d) => ({ ...d, pieces: [...d.pieces.slice(0, at.index), c.id, ...d.pieces.slice(at.index)] }));
        notify(t(`jewelry.nouns.${noun}.added`, { name: c.name }));
      }
      added();
      return true;
    },
    () => {
      setPreview(null);
      setLifted(null);
    },
  );

  const moveSelected = (dir: -1 | 1) => {
    if (selected === null) return;
    const to = selected + dir;
    if (to < 0 || to >= draft.pieces.length) return;
    update((d) => ({ ...d, pieces: move(d.pieces, selected, to) }));
    setSelected(to);
    notify(t("jewelry.moved"));
  };

  const remove = (index: number) => {
    const name = byId.get(draft.pieces[index])?.name ?? t("jewelry.detail");
    update((d) => ({ ...d, pieces: d.pieces.filter((_, i) => i !== index) }));
    setSelected(null);
    notify(t("jewelry.removed", { name }));
  };

  const clear = () => {
    update((d) => ({ ...d, pieces: [] }));
    setSelected(null);
    notify(t("studio.cleared"));
  };

  const empty = draft.pieces.length === 0;
  const quick = data.components.filter((c) => c.imageUrl && !problem(c, null)).slice(0, 2);
  const counter = t("jewelry.components", { count: draft.pieces.length });

  const stage = (
    <StageFrame
      ref={stageRef}
      label={t(`jewelry.nouns.${noun}.stageLabel`, { counter })}
      chip={chip}
      variant="tray"
      overlay={
        <>
          <span className="pointer-events-none absolute top-3 left-4 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            {t(`jewelry.nouns.${noun}.name`)} · {size?.name ?? ""}
          </span>
          <span className="pointer-events-none absolute top-3 right-4 text-[11px] font-semibold text-muted-foreground">{counter}</span>
        </>
      }
    >
      <div className="relative aspect-square" style={{ width: "min(var(--stage-w), var(--stage-h))" }}>
        <JewelryCanvas
          svgRef={svg}
          kind={kind}
          pieces={pieces}
          lengthMm={draft.lengthMm}
          label={t(`jewelry.nouns.${noun}.design`)}
          selected={selected}
          onSelect={setSelected}
          onMove={(from, to) => update((d) => ({ ...d, pieces: move(d.pieces, from, to) }))}
          onRemove={remove}
          preview={preview}
          hiddenIndex={lifted}
        />
        {empty && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="breathe font-display text-lg text-muted-foreground">{t("jewelry.firstBead")}</p>
          </div>
        )}
        {empty &&
          quick.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => tapPick(c)}
              aria-label={t("jewelry.suggested", { name: c.name })}
              className={`absolute top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-dashed border-primary bg-background/70 ${i === 0 ? "left-[12%]" : "right-[12%]"}`}
            >
              <img {...corsImage} src={c.imageUrl!} alt="" draggable={false} className="h-8 w-8 object-contain" />
            </button>
          ))}
      </div>
    </StageFrame>
  );

  const toolbar = (
    <StudioToolbar
      {...history}
      onClear={clear}
      canClear={!empty}
      selection={
        selectedComp && selected !== null
          ? {
              title: selectedComp.name,
              image: selectedComp.imageUrl,
              onDone: () => setSelected(null),
              actions: [
                { icon: "chevronLeft", label: t("jewelry.moveLeft"), onClick: () => moveSelected(-1), disabled: selected === 0 },
                { icon: "chevronRight", label: t("jewelry.moveRight"), onClick: () => moveSelected(1), disabled: selected === draft.pieces.length - 1 },
                { icon: "trash", label: t("common.remove"), onClick: () => remove(selected), danger: true },
              ],
            }
          : null
      }
    />
  );

  return (
    <StudioFrame
      category={category}
      subtitle={`${t(`jewelry.nouns.${noun}.title`)} • ${size?.name ?? t("jewelry.noSize")} · ${cm(draft.lengthMm)}`}
      onSave={saver.save}
      saving={saver.saving}
      saveBlocked={empty ? t("gifts.addItem") : null}
      top={<MeasurementBar noun={noun} usedMm={used} lengthMm={draft.lengthMm} size={size} onLength={(lengthMm) => update((d) => ({ ...d, lengthMm }), "length")} />}
      stage={stage}
      side={<BeadSequence pieces={pieces} selected={selected} onSelect={setSelected} />}
      notice={notice}
      toolbar={toolbar}
      picker={
        <JewelryPicker
          components={data.components}
          pieces={draft.pieces}
          problem={(c) => problem(c)}
          replacing={selected !== null}
          full={full}
          onPick={(c) => tapPick(c)}
          coach={coach}
          onDismissCoach={dismissCoach}
        />
      }
      footer={{
        summary: `${t("jewelry.beads", { count: draft.pieces.length })} · ${cm(used)}`,
        price,
        onPrimary: () => navigate(studioHref(category, "preview")),
        primaryBlocked: empty ? t("gifts.addItem") : null,
        note: empty ? null : (missingForMinimum(price) ?? (complete ? t(`jewelry.nouns.${noun}.fits`) : t("jewelry.toGo", { length: cm(Math.max(0, draft.lengthMm - used)) }))),
        pulse,
      }}
    />
  );
}

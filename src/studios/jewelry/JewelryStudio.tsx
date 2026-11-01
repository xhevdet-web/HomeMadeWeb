import { useState } from "react";
import { Button } from "../../components/Button";
import { Chip } from "../../components/Controls";
import { Icon } from "../../components/Icon";
import { money } from "../../data/mock";
import { JEWELRY, MATERIAL_FILTERS, PIECES, TYPE_LABEL, getPiece, stockState, type JewelryPiece, type Material, type PieceType } from "../../data/studioCatalog";
import { navigate } from "../../router";
import { useDesignActions, useStudioHistory } from "../../studio/StudioContext";
import { BaseChip, CanvasToolbar, Stage, StudioLayout, StudioShell, Tabs, ToolSection } from "../../studio/StudioShell";
import { StudioSummaryBar } from "../../studio/StudioSummaryBar";
import { useToast } from "../../studio/Toasts";
import { JewelryCanvas, PieceSwatch } from "./JewelryCanvas";
import { TOLERANCE_MM, fits, formatCm, groupPieces, isComplete, jewelryInfo, jewelryPrice, roomMm, sizeLabel, usedCount, usedMm, type JewelrySlug } from "./logic";

const swap = (list: string[], i: number, j: number) => {
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
};

export function JewelryStudio({ slug }: { slug: JewelrySlug }) {
  const config = JEWELRY[slug];
  const history = useStudioHistory(slug);
  const { state: draft, dispatch: update } = history;
  const toast = useToast();
  const [rawSelected, setSelected] = useState<number | null>(null);
  const [tab, setTab] = useState<"all" | PieceType>("all");
  const [material, setMaterial] = useState<Material | null>(null);
  const actions = useDesignActions(slug, jewelryInfo(draft));

  const selected = rawSelected !== null && rawSelected < draft.pieces.length ? rawSelected : null;
  const selectedPiece = selected !== null ? getPiece(draft.pieces[selected]) : undefined;
  const used = usedMm(draft.pieces);
  const complete = isComplete(draft);
  const price = jewelryPrice(draft.pieces);
  const room = roomMm(draft);
  const groups = groupPieces(draft.pieces);
  const noun = config.noun;

  const visible = PIECES.filter(
    (p) => config.types.includes(p.type) && (tab === "all" || p.type === tab) && (!material || p.material === material),
  );

  const pick = (piece: JewelryPiece) => {
    if (!fits(draft, piece, selected)) {
      const left = Math.max(0, room + (selectedPiece?.lengthMm ?? 0));
      toast(`Doesn't fit · ${left} mm left`);
      return;
    }
    if (selected !== null) {
      update((d) => ({ ...d, pieces: d.pieces.map((p, i) => (i === selected ? piece.id : p)) }));
      toast(`Replaced with ${piece.name}.`);
    } else {
      update((d) => ({ ...d, pieces: [...d.pieces, piece.id] }));
      toast(`${piece.name} added to your ${noun}.`);
    }
  };

  const moveSelected = (dir: -1 | 1) => {
    if (selected === null) return;
    const to = selected + dir;
    if (to < 0 || to >= draft.pieces.length) return;
    update((d) => ({ ...d, pieces: swap(d.pieces, selected, to) }));
    setSelected(to);
  };

  const remove = (index: number) => {
    const name = getPiece(draft.pieces[index])?.name;
    update((d) => ({ ...d, pieces: d.pieces.filter((_, i) => i !== index) }));
    setSelected(null);
    toast(`${name} removed.`);
  };

  const reorder = (from: number, to: number) =>
    update((d) => {
      const next = [...d.pieces];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return { ...d, pieces: next };
    });

  const clear = () => {
    update((d) => ({ ...d, pieces: [] }));
    setSelected(null);
    toast("Canvas cleared. Undo to bring it back.");
  };

  const empty = draft.pieces.length === 0;
  const meterPct = Math.min(100, (used / draft.lengthMm) * 100);
  const over = used > draft.lengthMm + TOLERANCE_MM;

  const stage = (
    <Stage
      label={`${noun[0].toUpperCase()}${noun.slice(1)} with ${draft.pieces.length} components`}
      toolbar={<CanvasToolbar {...history} onClear={clear} canClear={!empty} />}
      above={
        <div className="rounded-2xl border border-border bg-card px-5 py-4" aria-live="polite">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">Length</span>
            <span className="font-display text-lg font-semibold">
              {used} / {draft.lengthMm} mm
              {complete && <span className="ml-2 text-success">· Complete</span>}
            </span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full rounded-full transition-[width] duration-500 ${complete ? "bg-success" : "bg-primary"}`}
              style={{ width: `${meterPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {complete
              ? "Complete. Your piece is the right length."
              : over
                ? "A little too long. Remove or replace a piece."
                : `${draft.lengthMm - used} mm to go (±${TOLERANCE_MM} mm is fine).`}
          </p>
        </div>
      }
    >
      <JewelryCanvas
        kind={config.cord}
        pieces={draft.pieces}
        lengthMm={draft.lengthMm}
        label={`${noun} design`}
        hint={empty ? "Add your first bead" : selected !== null ? "Tap a piece to replace" : "Tap to add"}
        selected={selected}
        onSelect={setSelected}
        onMove={reorder}
        onRemove={remove}
      />
    </Stage>
  );

  const tools = (
    <>
      <BaseChip label="Size" value={`${sizeLabel(slug, draft)} · ${formatCm(draft.lengthMm)}`} href={`#/studios/${slug}`} />

      {selectedPiece && selected !== null && (
        <section className="rounded-2xl border border-primary/50 bg-primary/10 p-4" aria-label="Selected piece">
          <p className="text-sm">
            <span className="font-semibold">{selectedPiece.name}</span> selected · piece {selected + 1} of {draft.pieces.length}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => moveSelected(-1)} disabled={selected === 0}>
              <Icon name="chevronLeft" size={15} /> Move left
            </Button>
            <Button variant="secondary" size="sm" onClick={() => moveSelected(1)} disabled={selected === draft.pieces.length - 1}>
              Move right <Icon name="chevronRight" size={15} />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => remove(selected)}>
              <Icon name="trash" size={15} /> Remove
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setSelected(null)}>
              Done
            </Button>
          </div>
        </section>
      )}

      <ToolSection title="Pieces" aside={selected !== null ? "Tap to replace" : `Tap to add · ${Math.max(0, room)} mm left`}>
        <Tabs
          label="Piece type"
          value={tab}
          onChange={setTab}
          tabs={[{ id: "all" as const, label: "All" }, ...config.types.map((t) => ({ id: t, label: TYPE_LABEL[t] }))]}
        />
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Material">
          {MATERIAL_FILTERS.map((m) => (
            <Chip key={m} selected={material === m} onClick={() => setMaterial(material === m ? null : m)}>
              {m}
            </Chip>
          ))}
        </div>
        <ul className="mt-4 grid max-h-[460px] grid-cols-3 gap-2 overflow-y-auto pr-1 sm:grid-cols-4">
          {visible.map((p) => {
            const stock = stockState(p.stock, usedCount(draft.pieces, p.id));
            const fit = fits(draft, p, selected);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => pick(p)}
                  disabled={stock.disabled}
                  aria-label={`${p.name}, ${money(p.price)}, ${p.lengthMm} mm${stock.label ? `, ${stock.label}` : ""}${fit ? "" : ", doesn't fit"}`}
                  className={`flex w-full flex-col items-center gap-1 rounded-2xl border border-transparent px-1 py-2.5 text-center transition-colors hover:border-border hover:bg-secondary/50 disabled:cursor-not-allowed ${
                    stock.disabled || !fit ? "opacity-40" : ""
                  }`}
                >
                  <PieceSwatch piece={p} />
                  <span className="text-[11px] leading-tight font-semibold">{p.name}</span>
                  <span className="text-[11px] text-primary">{money(p.price)}</span>
                  <span className="text-[10px] text-muted-foreground">{stock.label ?? `${p.lengthMm} mm`}</span>
                </button>
              </li>
            );
          })}
          {visible.length === 0 && <li className="col-span-full py-6 text-center text-sm text-muted-foreground">No pieces match this filter.</li>}
        </ul>
      </ToolSection>

      <ToolSection title={`Your ${noun}`} aside={`${draft.pieces.length} pieces`}>
        {empty ? (
          <p className="text-sm text-muted-foreground">Nothing yet. Tap a bead to start.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1" aria-hidden="true">
              {draft.pieces.map((id, i) => (
                <button
                  key={i}
                  type="button"
                  tabIndex={-1}
                  onClick={() => setSelected(i)}
                  className={`h-3 w-3 rounded-full border ${i === selected ? "border-primary ring-2 ring-primary" : "border-border"}`}
                  style={{ background: getPiece(id)?.color }}
                />
              ))}
            </div>
            <ul className="mt-3 divide-y divide-border rounded-2xl border border-border">
              {groups.map((g) => (
                <li key={g.piece.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                  <span className="h-3.5 w-3.5 rounded-full border border-border" style={{ background: g.piece.color }} />
                  <span className="flex-1">{g.piece.name}</span>
                  <span className="font-display font-semibold text-muted-foreground">×{g.count}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </ToolSection>
    </>
  );

  return (
    <StudioShell slug={slug} step={1}>
      <StudioLayout
        stage={stage}
        tools={tools}
        bar={
          <StudioSummaryBar
            summary={`${draft.pieces.length} pieces · ${used} mm`}
            price={price}
            onSave={actions.save}
            saveBlocked={empty ? "Add at least one bead to your design." : null}
            onPrimary={() => navigate(`#/studios/${slug}/preview`)}
            primaryBlocked={empty ? "Add at least one bead to your design." : null}
            note={price < config.minPrice ? `Orders start at ${money(config.minPrice)}. Add a few more pieces.` : null}
          />
        }
      />
    </StudioShell>
  );
}

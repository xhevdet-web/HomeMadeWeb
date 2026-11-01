import { useMemo, type KeyboardEvent, type Ref } from "react";
import { loadImage, renderPng, corsImage } from "../../studio/capture";
import { useDragSource } from "../../studio/dnd/hooks";
import { layoutPieces, makeCord, nearestS, type Cord, type PlacedPiece } from "./cord";
import type { Piece } from "./logic";

const COPPER = "oklch(0.66 0.11 50)";
const GOLD = "oklch(0.8 0.13 85)";

/** A component colour name like "Dark Blue" as a CSS colour, if the browser knows it. */
function swatchColor(name: string | null) {
  const css = name?.toLowerCase().replace(/\s+/g, "");
  return css && typeof CSS !== "undefined" && CSS.supports("color", css) ? css : "var(--secondary)";
}

/** One piece: its catalog photo (transparent PNG), or a coloured bead while it has none. */
export function PieceShape({ piece, r }: { piece: Piece; r: number }) {
  if (piece.imageUrl)
    return <image {...corsImage} href={piece.imageUrl} x={-r} y={-r} width={r * 2} height={r * 2} preserveAspectRatio="xMidYMid meet" className="drop-shadow-piece" />;
  return <circle r={r} fill={swatchColor(piece.color)} stroke="oklch(0 0 0 / 0.2)" strokeWidth={r * 0.06} />;
}

/** Round picker swatch; its size hints at the real size of the piece. */
export function PieceSwatch({ piece, size: fixed }: { piece: Piece; size?: number }) {
  const size = fixed ?? Math.min(44, 18 + piece.lengthMm * 1.6);
  return (
    <span className="flex items-center justify-center" style={{ width: fixed ?? 44, height: fixed ?? 44 }} aria-hidden="true">
      {piece.imageUrl ? (
        <img {...corsImage} src={piece.imageUrl} alt="" loading="lazy" decoding="async" draggable={false} style={{ width: size, height: size }} className="img-fade object-contain" />
      ) : (
        <span className="rounded-full border border-border" style={{ width: size, height: size, background: swatchColor(piece.color) }} />
      )}
    </span>
  );
}

/** What a drag over the cord would do: insert at a gap, or replace a bead. */
export type DropPreview = { mode: "insert"; index: number; piece: Piece } | { mode: "replace"; index: number };

/** Dropped this close to a bead's centre (× its radius), a picker item replaces that bead. Beads touch at real scale, so a wider zone would leave no gaps to insert into. */
const REPLACE_ZONE = 0.6;

/**
 * Where a point (client px) falls on the cord: the bead under it (near its centre) and
 * the gap it's nearest to, in the list without `exclude` (the bead being moved).
 */
export function cordHit(svg: SVGSVGElement, kind: "circle" | "u", pieces: Piece[], lengthMm: number, client: { x: number; y: number }, exclude: number | null = null) {
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const p = new DOMPoint(client.x, client.y).matrixTransform(ctm.inverse());
  const cord = makeCord(kind);
  const placed = layoutPieces(
    cord,
    pieces.map((piece, index) => ({ index, piece })).filter((x) => x.index !== exclude),
    lengthMm,
  );
  const onBead = placed.find((b) => Math.hypot(b.x - p.x, b.y - p.y) <= b.r * REPLACE_ZONE);
  const s = nearestS(cord, p);
  let insertAt = placed.filter((b) => b.s < s).length;
  // On a closed bracelet the strand starts at the top: just before the first bead is the start, not the end.
  if (cord.kind === "circle" && insertAt === placed.length && placed.length) {
    const last = placed[placed.length - 1];
    const end = last.s + last.r;
    if (cord.total - s < s - end) insertAt = 0;
  }
  return { onBead: onBead ? onBead.index : null, insertAt };
}

interface CanvasProps {
  kind: "circle" | "u";
  pieces: Piece[];
  lengthMm: number;
  label: string;
  selected?: number | null;
  onSelect?: (index: number | null) => void;
  onMove?: (from: number, to: number) => void;
  onRemove?: (index: number) => void;
  /** Live drag feedback: a gap where the bead would go, or a ring on the bead it would replace. */
  preview?: DropPreview | null;
  /** The bead lifted off the cord to reorder: the others close its gap. */
  hiddenIndex?: number | null;
  svgRef?: Ref<SVGSVGElement>;
  className?: string;
}

/** The cord with every piece at real scale. Tap selects; a long press lifts a bead to move it. */
export function JewelryCanvas({
  kind,
  pieces,
  lengthMm,
  label,
  selected = null,
  onSelect,
  onMove,
  onRemove,
  preview = null,
  hiddenIndex = null,
  svgRef,
  className = "h-full w-full",
}: CanvasProps) {
  const cord = makeCord(kind);
  const interactive = !!onSelect;

  const shown = useMemo(() => {
    const list = pieces.map((piece, index) => ({ index, piece })).filter((x) => x.index !== hiddenIndex);
    if (preview?.mode === "insert") list.splice(preview.index, 0, { index: -1, piece: preview.piece });
    const placed = layoutPieces(cord, list, lengthMm);
    const home = hiddenIndex !== null ? layoutPieces(cord, pieces.map((piece, index) => ({ index, piece })), lengthMm)[hiddenIndex] : null;
    // Beads render in their original order and move by transform only: moving DOM nodes would drop
    // the pointer capture of a bead being dragged. The lifted bead stays mounted, invisible.
    const byIndex = new Map(placed.map((b) => [b.index, b]));
    const ordered: (PlacedPiece<Piece> & { hidden?: boolean })[] = pieces.map((_, i) => (i === hiddenIndex && home ? { ...home, hidden: true } : byIndex.get(i)!));
    const gap = byIndex.get(-1);
    return (gap ? [...ordered, gap] : ordered) as (PlacedPiece<Piece> & { hidden?: boolean })[];
  }, [cord, pieces, lengthMm, preview, hiddenIndex]);

  return (
    <svg ref={svgRef} viewBox={`0 0 ${cord.width} ${cord.height}`} className={`${className} touch-none overflow-visible`} role={interactive ? "group" : "img"} aria-label={label}>
      <path d={cord.d} fill="none" stroke={COPPER} strokeWidth="1.6" />
      {cord.clasp && (
        <g transform={`translate(${cord.clasp.x} ${cord.clasp.y})`}>
          <circle r="5" fill="none" stroke={GOLD} strokeWidth="2" />
          <circle cx="7" r="2.5" fill={GOLD} />
        </g>
      )}
      {shown.map((p) =>
        p.index === -1 ? (
          <g key="gap" style={{ transform: `translate(${p.x}px, ${p.y}px)`, transition: "transform 180ms cubic-bezier(.2,.7,.2,1)" }}>
            <circle r={p.r} fill="var(--primary)" fillOpacity="0.18" stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="3 3" />
          </g>
        ) : (
          <Bead
            key={`${p.index}-${p.piece.id}`}
            placed={p}
            position={p.index}
            count={pieces.length}
            interactive={interactive}
            hidden={!!p.hidden}
            selected={selected === p.index}
            replacing={preview?.mode === "replace" && preview.index === p.index}
            onSelect={onSelect}
            onKey={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect?.(selected === p.index ? null : p.index);
              } else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && selected === p.index) {
                e.preventDefault();
                const to = p.index + (e.key === "ArrowLeft" ? -1 : 1);
                if (to >= 0 && to < pieces.length) {
                  onMove?.(p.index, to);
                  onSelect?.(to);
                }
              } else if (e.key === "Delete" || e.key === "Backspace") {
                e.preventDefault();
                onRemove?.(p.index);
              } else if (e.key === "Escape") onSelect?.(null);
            }}
          />
        ),
      )}
    </svg>
  );
}

function Bead({ placed: p, position, count, interactive, hidden, selected, replacing, onSelect, onKey }: {
  placed: PlacedPiece<Piece>;
  hidden: boolean;
  position: number;
  count: number;
  interactive: boolean;
  selected: boolean;
  replacing: boolean;
  onSelect?: (index: number | null) => void;
  onKey: (e: KeyboardEvent<SVGGElement>) => void;
}) {
  // Long press (touch) or a small drag (mouse) lifts the bead; a tap selects it.
  const drag = useDragSource(
    () => ({ kind: "bead", id: p.piece.id, name: p.piece.name, image: p.piece.imageUrl, shape: "circle", index: p.index }),
    () => onSelect?.(selected ? null : p.index),
    { disabled: !interactive },
  );
  return (
    <g
      style={{ transform: `translate(${p.x}px, ${p.y}px)`, transition: "transform 180ms cubic-bezier(.2,.7,.2,1)", opacity: hidden ? 0 : 1 }}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `Select position ${position + 1} of ${count}, ${p.piece.name}` : undefined}
      aria-pressed={interactive ? selected : undefined}
      onKeyDown={interactive ? onKey : undefined}
      className={`group outline-none ${interactive ? "cursor-grab" : ""}`}
      {...(interactive ? drag : {})}
    >
      <g className="bead-pop">
        <PieceShape piece={p.piece} r={p.r} />
      </g>
      {interactive && (
        <circle
          r={p.r + 3.5}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeDasharray={selected || replacing ? undefined : "3 3"}
          className={selected || replacing ? "" : "opacity-0 group-focus-visible:opacity-100"}
        />
      )}
    </g>
  );
}

/** 840 × 840 transparent PNG of the piece, like the app. Throws a CaptureError when an image can't be drawn. */
export function captureJewelry(kind: "circle" | "u", pieces: Piece[], lengthMm: number) {
  const cord: Cord = makeCord(kind);
  const size = 840;
  return renderPng(size, size, async (ctx) => {
    const k = size / Math.max(cord.width, cord.height);
    ctx.translate((size - cord.width * k) / 2, (size - cord.height * k) / 2);
    ctx.scale(k, k);
    ctx.strokeStyle = "#B8763A";
    ctx.lineWidth = 1.6;
    ctx.stroke(new Path2D(cord.d));
    for (const p of layoutPieces(cord, pieces.map((piece, index) => ({ index, piece })), lengthMm)) {
      if (p.piece.imageUrl) ctx.drawImage(await loadImage(p.piece.imageUrl), p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "#c9c2b8";
        ctx.fill();
      }
    }
  });
}

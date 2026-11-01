import { useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import type { CharmIcon, JewelryPiece } from "../../data/studioCatalog";
import { layoutPieces, makeCord, nearestS } from "./cord";
import { piecesOf } from "./logic";

const COPPER = "oklch(0.66 0.11 50)";
const INK = "oklch(0.25 0.03 265)";

function CharmGlyph({ icon, r }: { icon: CharmIcon; r: number }) {
  const shapes: Record<CharmIcon, ReactNode> = {
    heart: <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9Z" />,
    star: <path d="m12 2 2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 20.9l1.6-7L2 9.2l7.1-.6Z" />,
    moon: <path d="M15 3a9 9 0 1 0 6 15 7 7 0 0 1-6-15Z" />,
    clover: (
      <>
        <circle cx="12" cy="7" r="4.2" />
        <circle cx="17" cy="12" r="4.2" />
        <circle cx="12" cy="17" r="4.2" />
        <circle cx="7" cy="12" r="4.2" />
      </>
    ),
    coin: <circle cx="12" cy="12" r="6" fill="none" stroke={INK} strokeWidth="2.5" />,
    eye: (
      <>
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" fill="oklch(0.97 0 0)" />
        <circle cx="12" cy="12" r="3.5" />
      </>
    ),
    disc: <circle cx="12" cy="12" r="5" fill="none" stroke={INK} strokeWidth="1.5" />,
    locket: <path d="M12 20s-6-4-8-8a4.5 4.5 0 0 1 8-4 4.5 4.5 0 0 1 8 4c-2 4-8 8-8 8Z" fill="none" stroke={INK} strokeWidth="2" />,
  };
  return (
    <svg x={-r * 0.62} y={-r * 0.62} width={r * 1.24} height={r * 1.24} viewBox="0 0 24 24" fill={INK} opacity="0.8" overflow="visible">
      {shapes[icon]}
    </svg>
  );
}

export function GlossDefs({ id }: { id: string }) {
  return (
    <defs>
      <radialGradient id={id} cx="35%" cy="30%" r="75%">
        <stop offset="0" stopColor="white" stopOpacity="0.75" />
        <stop offset="0.35" stopColor="white" stopOpacity="0.08" />
        <stop offset="1" stopColor="black" stopOpacity="0.35" />
      </radialGradient>
    </defs>
  );
}

export function PieceShape({ piece, r, gloss }: { piece: JewelryPiece; r: number; gloss: string }) {
  if (piece.type === "letter") {
    return (
      <g>
        <circle r={r} fill={piece.color} stroke="oklch(0.75 0.01 265)" strokeWidth={r * 0.08} />
        <text textAnchor="middle" dominantBaseline="central" fontSize={r * 1.15} fontWeight={700} fontFamily="Manrope, sans-serif" fill="oklch(0.18 0 0)">
          {piece.letter}
        </text>
      </g>
    );
  }
  return (
    <g>
      <circle r={r} fill={piece.color} />
      <circle r={r} fill={`url(#${gloss})`} />
      {piece.icon && <CharmGlyph icon={piece.icon} r={r} />}
    </g>
  );
}

const useGlossId = () => `gloss${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

/** Round picker swatch. Size hints at the real size of the piece. */
export function PieceSwatch({ piece }: { piece: JewelryPiece }) {
  const gloss = useGlossId();
  return (
    <svg viewBox="-20 -20 40 40" className="h-11 w-11" aria-hidden="true">
      <GlossDefs id={gloss} />
      <PieceShape piece={piece} r={Math.min(19, 6 + piece.lengthMm * 0.6)} gloss={gloss} />
    </svg>
  );
}

const reorder = <T,>(list: T[], from: number, to: number) => {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

/** The cord with every piece at real scale. Click selects, drag along the cord reorders. */
export function JewelryCanvas({
  kind,
  pieces,
  lengthMm,
  label,
  hint,
  selected = null,
  onSelect,
  onMove,
  onRemove,
  className = "w-full max-w-[520px]",
}: {
  kind: "circle" | "u";
  pieces: string[];
  lengthMm: number;
  label: string;
  hint?: string;
  selected?: number | null;
  onSelect?: (index: number | null) => void;
  onMove?: (from: number, to: number) => void;
  onRemove?: (index: number) => void;
  className?: string;
}) {
  const cord = makeCord(kind);
  const gloss = useGlossId();
  const svg = useRef<SVGSVGElement>(null);
  const drag = useRef<{ from: number; moved: boolean; x0: number; y0: number } | null>(null);
  const [dragTo, setDragTo] = useState<{ from: number; to: number } | null>(null);
  const interactive = !!onSelect;

  const items = useMemo(() => piecesOf(pieces).map((piece, index) => ({ index, piece })), [pieces]);
  const base = useMemo(() => layoutPieces(cord, items, lengthMm), [cord, items, lengthMm]);
  const shown = dragTo ? layoutPieces(cord, reorder(items, dragTo.from, dragTo.to), lengthMm) : base;

  // Capture on the <svg>, not the bead: beads are re-ordered in the DOM while dragging, which would drop the capture.
  const down = (e: ReactPointerEvent<SVGGElement>, index: number) => {
    if (!interactive) return;
    svg.current?.setPointerCapture(e.pointerId);
    drag.current = { from: index, moved: false, x0: e.clientX, y0: e.clientY };
  };

  const move = (e: ReactPointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    const ctm = svg.current?.getScreenCTM();
    if (!d || !ctm) return;
    if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 5) return;
    d.moved = true;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const s = nearestS(cord, p);
    const to = base.filter((b) => b.index !== d.from && b.s < s).length;
    setDragTo((cur) => (cur?.to === to ? cur : { from: d.from, to }));
  };

  const up = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (d.moved && dragTo && dragTo.to !== dragTo.from) {
      onMove?.(dragTo.from, dragTo.to);
      onSelect?.(dragTo.to);
    } else if (!d.moved) {
      onSelect?.(selected === d.from ? null : d.from);
    }
    setDragTo(null);
  };

  const cancel = () => {
    drag.current = null;
    setDragTo(null);
  };

  const key = (e: KeyboardEvent<SVGGElement>, index: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect?.(selected === index ? null : index);
    } else if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && selected === index) {
      e.preventDefault();
      const to = index + (e.key === "ArrowLeft" ? -1 : 1);
      if (to >= 0 && to < pieces.length) {
        onMove?.(index, to);
        onSelect?.(to);
      }
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      onRemove?.(index);
    } else if (e.key === "Escape") {
      onSelect?.(null);
    }
  };

  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${cord.width} ${cord.height}`}
      className={`${className} overflow-visible`}
      role={interactive ? "group" : "img"}
      aria-label={label}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={cancel}
    >
      <GlossDefs id={gloss} />
      <path d={cord.d} fill="none" stroke={COPPER} strokeWidth="1.6" />
      {cord.clasp && (
        <g transform={`translate(${cord.clasp.x} ${cord.clasp.y})`}>
          <circle r="5" fill="none" stroke="oklch(0.8 0.13 85)" strokeWidth="2" />
          <circle cx="7" r="2.5" fill="oklch(0.8 0.13 85)" />
        </g>
      )}
      {hint && (
        <text
          x={cord.label.x}
          y={cord.label.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="13"
          fontFamily="Manrope, sans-serif"
          className="fill-muted-foreground"
        >
          {hint}
        </text>
      )}
      {shown.map((p, i) => {
        const isSelected = selected === p.index && !dragTo;
        const isDragged = dragTo?.from === p.index;
        return (
          <g
            key={`${p.index}-${p.piece.id}`}
            transform={`translate(${p.x} ${p.y})`}
            role={interactive ? "button" : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={interactive ? `${p.piece.name}, ${i + 1} of ${shown.length}` : undefined}
            aria-pressed={interactive ? isSelected : undefined}
            onPointerDown={(e) => down(e, p.index)}
            onKeyDown={(e) => key(e, p.index)}
            className={`group outline-none ${interactive ? "cursor-grab touch-none" : ""}`}
            opacity={isDragged ? 0.7 : 1}
          >
            <PieceShape piece={p.piece} r={p.r} gloss={gloss} />
            {interactive && (
              <circle
                r={p.r + 3.5}
                fill="none"
                stroke="var(--primary)"
                strokeWidth="2"
                strokeDasharray={isSelected ? undefined : "3 3"}
                className={isSelected ? "" : "opacity-0 group-focus-visible:opacity-100"}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

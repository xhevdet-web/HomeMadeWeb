import { useId, type ReactNode } from "react";
import type { GiftDraft } from "../../studio/drafts";
import { PlacementLayer } from "../../studio/PlacementLayer";
import type { StudioData } from "../data";
import { boxGeometry, boxHex, packagingOf } from "./logic";

/** The chosen box in its colour. Transparent ones get a glassy front over the items; closed ones show the open lid. */
export function GiftBox({ shape, transparent, hex, children }: { shape?: "SQUARE" | "RECTANGULAR"; transparent: boolean; hex: string; children?: ReactNode }) {
  const g = boxGeometry(shape);
  const glass = `glass${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <div className="relative w-full" style={{ aspectRatio: `${g.w} / ${g.h}` }}>
      <svg viewBox={`0 0 ${g.w} ${g.h}`} className="absolute inset-0 h-full w-full" aria-hidden="true">
        {!transparent && <rect x="3" y="2" width={g.w - 6} height="14" rx="3" fill={hex} opacity="0.85" transform={`rotate(-2 ${g.w / 2} 9)`} />}
        <rect x="6" y="18" width={g.w - 12} height="88" rx="4" fill={hex} opacity={transparent ? 0.5 : 1} />
        <rect x="12" y="24" width={g.w - 24} height="74" rx="2" fill={transparent ? "oklch(1 0 0 / 0.07)" : "oklch(0 0 0 / 0.38)"} />
      </svg>
      {children}
      {transparent ? (
        <svg viewBox={`0 0 ${g.w} ${g.h}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id={glass} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="white" stopOpacity="0.26" />
              <stop offset="0.45" stopColor="white" stopOpacity="0.03" />
              <stop offset="1" stopColor="white" stopOpacity="0.14" />
            </linearGradient>
          </defs>
          <rect x="6" y="18" width={g.w - 12} height="88" rx="4" fill={`url(#${glass})`} stroke={hex} strokeWidth="2.5" />
          <path d={`M${g.w * 0.22} 22l-12 80M${g.w * 0.22 + 6} 22l-12 80`} stroke="white" strokeOpacity="0.22" strokeWidth="2" />
        </svg>
      ) : (
        <span
          className="pointer-events-none absolute rounded-full bg-background/75 px-2 py-0.5 text-[10px] font-semibold tracking-[0.2em] text-foreground uppercase"
          style={{ left: `${(14 / g.w) * 100}%`, top: `${(26 / g.h) * 100}%` }}
        >
          Inside
        </span>
      )}
    </div>
  );
}

/** The draft's box with its packaging and colour. */
export function DraftBox({ draft, data, children }: { draft: GiftDraft; data: StudioData; children?: ReactNode }) {
  const p = packagingOf(draft, data);
  return (
    <GiftBox shape={p?.shape} transparent={p?.type === "TRANSPARENT"} hex={boxHex(draft, data)}>
      {children}
    </GiftBox>
  );
}

export function GiftThumb({ draft, data }: { draft: GiftDraft; data: StudioData }) {
  return (
    <DraftBox draft={draft} data={data}>
      <PlacementLayer elements={draft.elements} label="Your gift box" readOnly />
    </DraftBox>
  );
}

import type { ReactNode } from "react";
import type { MugDraft } from "../../studio/drafts";
import { PlacementLayer } from "../../studio/PlacementLayer";
import { CERAMIC, mugSummary, printAspect, type MugArea } from "./logic";

/** The flat printable area, with the dashed safe area from the blank mug's settings. */
export function MugWrap({ area, children, safeArea = true }: { area: MugArea; children: ReactNode; safeArea?: boolean }) {
  const s = area.safeMm;
  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ aspectRatio: `${area.widthMm} / ${area.heightMm}`, background: CERAMIC }}>
      {children}
      {safeArea && (
        <div
          className="pointer-events-none absolute rounded-xl border-2 border-dashed border-primary/80"
          style={{
            left: `${(s.left / area.widthMm) * 100}%`,
            right: `${(s.right / area.widthMm) * 100}%`,
            top: `${(s.top / area.heightMm) * 100}%`,
            bottom: `${(s.bottom / area.heightMm) * 100}%`,
          }}
        />
      )}
    </div>
  );
}

export type MugView = "left" | "front" | "right";

/** Preview only: the print covers this share of the mug body's height. */
const PRINT_SHARE_OF_HEIGHT = 0.82;

/** A mug body that shows part of the wrap through a cylinder mask with shading. */
export function MugMockup({ draft, area, view = "front" }: { draft: MugDraft; area: MugArea; view?: MugView }) {
  // The body is square; the print is as tall as 82% of it and as wide as its aspect makes it.
  const wrapWidth = (PRINT_SHARE_OF_HEIGHT / printAspect(area)) * 100;
  const shift = Math.max(0, wrapWidth - 100) / wrapWidth;
  const offset = { left: 0, front: -shift / 2, right: -shift }[view] * 100;
  const left = wrapWidth < 100 ? (100 - wrapWidth) / 2 : 0;

  return (
    <div className="relative mx-auto w-full max-w-[460px]" style={{ aspectRatio: "1.3 / 1" }} role="img" aria-label={`Mug with ${mugSummary(draft)}, ${view} view`}>
      <div className="absolute top-0 left-0 h-full overflow-hidden rounded-[7%/5%] shadow-glow" style={{ width: `${100 / 1.3}%`, background: CERAMIC }}>
        <div
          className="absolute transition-transform duration-700 ease-out motion-reduce:transition-none"
          style={{ top: `${((1 - PRINT_SHARE_OF_HEIGHT) / 2) * 100}%`, height: `${PRINT_SHARE_OF_HEIGHT * 100}%`, left: `${left}%`, width: `${wrapWidth}%`, transform: `translateX(${offset}%)` }}
        >
          <PlacementLayer elements={draft.elements} label="Mug print" readOnly />
        </div>
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "linear-gradient(90deg, oklch(0 0 0 / 0.45), transparent 22%, oklch(1 0 0 / 0.2) 40%, transparent 58%, oklch(0 0 0 / 0.5))" }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[7%]" style={{ background: "linear-gradient(oklch(0 0 0 / 0.25), transparent)" }} />
      </div>
      <svg viewBox="0 0 60 100" className="absolute top-[18%] right-0 h-[58%] w-[26%]" aria-hidden="true">
        <path d="M0 14C62 8 64 92 0 86" fill="none" stroke={CERAMIC} strokeWidth="14" strokeLinecap="round" />
        <path d="M0 14C62 8 64 92 0 86" fill="none" stroke="oklch(0 0 0 / 0.25)" strokeWidth="14" strokeLinecap="round" strokeDasharray="0 40 200" />
      </svg>
    </div>
  );
}

import type { ReactNode } from "react";
import type { MugDraft } from "../../studio/drafts";
import { PlacementLayer } from "../../studio/PlacementLayer";
import { CERAMIC, mugSummary } from "./logic";

/** The flat 20 × 9 cm printable wrap. */
export function MugWrap({ children, safeArea = true }: { children: ReactNode; safeArea?: boolean }) {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ aspectRatio: "20 / 9", background: CERAMIC }}>
      {children}
      {safeArea && <div className="pointer-events-none absolute inset-x-[5%] inset-y-[8%] rounded-xl border-2 border-dashed border-primary/80" />}
    </div>
  );
}

export type MugView = "left" | "front" | "right";

/** Where the visible window sits on the wrap, as a % of the wrap width. */
const OFFSET: Record<MugView, number> = { left: 0, front: -27.5, right: -55 };

/** A mug body that shows part of the wrap through a cylinder mask with shading. */
export function MugMockup({ draft, view = "front" }: { draft: MugDraft; view?: MugView }) {
  return (
    <div className="relative mx-auto w-full max-w-[460px]" style={{ aspectRatio: "1.3 / 1" }} role="img" aria-label={`Mug with ${mugSummary(draft)}, ${view} view`}>
      <div className="absolute top-0 left-0 h-full overflow-hidden rounded-[7%/5%] shadow-glow" style={{ width: `${100 / 1.3}%`, background: CERAMIC }}>
        <div
          className="absolute inset-y-0 left-0 transition-transform duration-700 ease-out motion-reduce:transition-none"
          style={{ width: `${100 / 0.45}%`, transform: `translateX(${OFFSET[view]}%)` }}
        >
          <PlacementLayer elements={draft.elements} label="Mug print" readOnly />
        </div>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, oklch(0 0 0 / 0.45), transparent 22%, oklch(1 0 0 / 0.2) 40%, transparent 58%, oklch(0 0 0 / 0.5))",
          }}
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

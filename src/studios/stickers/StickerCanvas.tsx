import type { ReactNode } from "react";
import type { StickerShape, StickerSize } from "../../data/studioCatalog";
import type { StickerDraft } from "../../studio/drafts";
import { PlacementLayer } from "../../studio/PlacementLayer";
import { BORDER, sizeOf } from "./logic";

const radius = (shape: StickerShape, aspect: number) => (shape === "circle" || shape === "oval" ? "50%" : `10% / ${10 / aspect}%`);

/** Sticker at its aspect with a white die-cut border and a dashed safe area 3 mm inside the edge. */
export function StickerCanvas({ shape, size, children, safeArea = true }: {
  shape: StickerShape;
  size: StickerSize;
  children?: ReactNode;
  safeArea?: boolean;
}) {
  const aspect = size.hCm / size.wCm;
  const innerW = size.wCm * (1 - 2 * BORDER);
  const innerH = size.hCm - size.wCm * 2 * BORDER;
  return (
    <div
      className="relative w-full drop-shadow-[0_12px_24px_oklch(0_0_0/0.45)]"
      style={{ aspectRatio: `${size.wCm} / ${size.hCm}`, borderRadius: radius(shape, aspect), background: "oklch(0.98 0 0)", padding: `${BORDER * 100}%` }}
    >
      <div className="relative h-full w-full overflow-hidden" style={{ borderRadius: radius(shape, innerH / innerW), background: "oklch(0.92 0.01 85)" }}>
        {children}
        {safeArea && (
          <div
            className="pointer-events-none absolute border-2 border-dashed border-primary/80"
            style={{ inset: `${(0.3 / innerH) * 100}% ${(0.3 / innerW) * 100}%`, borderRadius: radius(shape, innerH / innerW) }}
          />
        )}
      </div>
    </div>
  );
}

export function Sticker({ draft, index, safeArea = false }: { draft: StickerDraft; index: number; safeArea?: boolean }) {
  const size = sizeOf(draft);
  const design = draft.designs[index];
  if (!size || !draft.shape || !design) return null;
  return (
    <StickerCanvas shape={draft.shape} size={size} safeArea={safeArea}>
      <PlacementLayer elements={design.image ? [design.image] : []} label={`Sticker design ${index + 1}`} readOnly />
    </StickerCanvas>
  );
}

export function StickerThumb({ draft }: { draft: StickerDraft }) {
  return (
    <div className="grid w-full grid-cols-2 place-items-center gap-3">
      {draft.designs.slice(0, 4).map((s, i) => (
        <div key={s.id} className="w-full">
          <Sticker draft={draft} index={i} />
        </div>
      ))}
    </div>
  );
}

import i18n from "../../i18n";
import type { ReactNode } from "react";
import type { StickerSize } from "../../api/models";
import type { StickerDraft } from "../../studio/drafts";
import { PlacementLayer } from "../../studio/PlacementLayer";
import { BORDER } from "./logic";

/** Ellipses for circles and ovals; squares and rectangles get 2 mm rounded corners. */
function radius(size: StickerSize, wMm: number, hMm: number) {
  if (size.shape === "CIRCLE" || size.shape === "OVAL") return "50%";
  return `${(2 / wMm) * 100}% / ${(2 / hMm) * 100}%`;
}

/** Sticker at its real aspect with a white die-cut border and a dashed safe area 3 mm inside the edge. */
export function StickerCanvas({ size, children, safeArea = true }: { size: StickerSize; children?: ReactNode; safeArea?: boolean }) {
  const innerW = size.widthMm * (1 - 2 * BORDER);
  const innerH = size.heightMm - size.widthMm * 2 * BORDER;
  return (
    <div
      className="relative w-full drop-shadow-[0_12px_24px_oklch(0_0_0/0.45)]"
      style={{ aspectRatio: `${size.widthMm} / ${size.heightMm}`, borderRadius: radius(size, size.widthMm, size.heightMm), background: "#FFFFFF", padding: `${BORDER * 100}%` }}
    >
      <div className="relative h-full w-full overflow-hidden" style={{ borderRadius: radius(size, innerW, innerH), background: "#F1EEE8" }}>
        {children}
        {safeArea && (
          <div
            className="pointer-events-none absolute border-2 border-dashed border-primary/80"
            style={{ inset: `${(3 / innerH) * 100}% ${(3 / innerW) * 100}%`, borderRadius: radius(size, innerW, innerH) }}
          />
        )}
      </div>
    </div>
  );
}

export function Sticker({ draft, size, index }: { draft: StickerDraft; size: StickerSize; index: number }) {
  const design = draft.designs[index];
  if (!design) return null;
  return (
    <StickerCanvas size={size} safeArea={false}>
      <PlacementLayer elements={design.image ? [design.image] : []} label={i18n.t("stickers.designLabel", { number: index + 1 })} readOnly />
    </StickerCanvas>
  );
}

export function StickerThumb({ draft, size }: { draft: StickerDraft; size: StickerSize | null }) {
  if (!size) return null;
  return (
    <div className="grid w-full grid-cols-2 place-items-center gap-3">
      {draft.designs.slice(0, 4).map((x, i) => (
        <div key={x.id} className="w-full">
          <Sticker draft={draft} size={size} index={i} />
        </div>
      ))}
    </div>
  );
}

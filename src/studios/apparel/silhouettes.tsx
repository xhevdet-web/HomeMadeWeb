import type { ReactNode } from "react";
import type { Category, Product } from "../../api/models";
import type { ApparelDraft } from "../../studio/drafts";
import { PlacementLayer } from "../../studio/PlacementLayer";
import type { StudioData } from "../data";
import { baseOf, garmentImage, printArea, silhouetteOf, useImageRatio, type Side, type Silhouette } from "./logic";
import { corsImage } from "../../studio/capture";
import i18n from "../../i18n";

const BODY: Record<Silhouette, string> = {
  HOODIE: "M62 40 30 54q-10 6-12 22L8 150l24 6 14-60 2 108q52 8 104 0l2-108 14 60 24-6-10-74q-2-16-12-22l-32-14q-38 24-76 0Z",
  TSHIRT: "M66 30 30 46 10 92l30 14 12-26v126q48 6 96 0V80l12 26 30-14-20-46-36-16q-34 18-68 0Z",
};

/** Drawn garment in the product's colour, used when a product has no photo yet. */
export function GarmentShape({ silhouette, hex, side }: { silhouette: Silhouette; hex: string; side: Side }) {
  const line = "oklch(0.5 0 0 / 0.35)";
  return (
    <svg viewBox="0 0 200 220" className="absolute inset-0 h-full w-full" aria-hidden="true">
      {silhouette === "HOODIE" && side === "front" && <path d="M64 44Q60 8 100 6t36 38Z" fill={hex} stroke={line} />}
      <path d={BODY[silhouette]} fill={hex} stroke={line} strokeWidth="1.2" />
      {silhouette === "HOODIE" && side === "back" && <path d="M66 46Q60 10 100 8t34 38q-34 14-68 0Z" fill={hex} stroke={line} />}
      {silhouette === "HOODIE" && side === "front" && <path d="M66 152h68l8 34H58Z" fill="none" stroke={line} strokeWidth="1.5" />}
    </svg>
  );
}

/** The garment photo (front or back) with its dashed PRINT AREA; children (a placement layer) sit on top. */
export function GarmentCanvas({ base, side, category, children, showArea = true }: { base: Product | null; side: Side; category: Category; children?: ReactNode; showArea?: boolean }) {
  const src = garmentImage(base, side);
  const ratio = useImageRatio(src);
  const area = printArea(base, side, category);
  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ aspectRatio: String(ratio) }}>
      {src ? (
        <img {...corsImage} src={src} alt={`${base?.name ?? i18n.t("apparel.garment")}, ${i18n.t(`apparel.sides.${side}`)}`} className="absolute inset-0 h-full w-full object-fill" draggable={false} />
      ) : (
        <GarmentShape silhouette={silhouetteOf(category)} hex={base?.colorHex ?? "#EFEBE4"} side={side} />
      )}
      <div
        className={`pointer-events-none absolute rounded-md border border-dashed border-primary/80 transition-opacity duration-200 ${showArea ? "opacity-100" : "opacity-0"}`}
        style={{ left: `${area.x * 100}%`, top: `${area.y * 100}%`, width: `${area.width * 100}%`, height: `${area.height * 100}%` }}
      >
        <span className="absolute -top-4 left-0 rounded bg-background/70 px-1 text-[9px] font-semibold tracking-[0.2em] text-foreground uppercase">{i18n.t("apparel.printArea")}</span>
      </div>
      {children}
    </div>
  );
}

export function ApparelThumb({ draft, data, category, side = "front" }: { draft: ApparelDraft; data: StudioData; category: Category; side?: Side }) {
  return (
    <GarmentCanvas base={baseOf(draft, data)} side={side} category={category}>
      <PlacementLayer elements={draft[side]} label={`${side} of the garment`} readOnly />
    </GarmentCanvas>
  );
}

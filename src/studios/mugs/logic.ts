import { MUG_AREA_CM, MUG_PRICE } from "../../data/studioCatalog";
import type { DesignInfo } from "../../studio/StudioContext";
import type { MugDraft } from "../../studio/drafts";
import { containScale, describeElement, imageElement, type PlacedElement } from "../../studio/elements";

/** Height / width of the printable wrap (20 × 9 cm). */
export const MUG_ASPECT = MUG_AREA_CM.h / MUG_AREA_CM.w;
export const CERAMIC = "oklch(0.95 0.015 85)";

export const mugImage = (d: MugDraft) => d.elements.find((e) => e.kind === "image");
export const mugTexts = (d: MugDraft) => d.elements.filter((e) => e.kind === "text");

/** Fit an image inside the wrap, centred. */
export const fittedImage = (props: Partial<PlacedElement> & { aspect: number }) =>
  imageElement({ ...props, scale: containScale(props.aspect, MUG_ASPECT) * 0.9 });

export function mugSummary(d: MugDraft) {
  const img = mugImage(d);
  const texts = mugTexts(d).length;
  const parts = [img ? describeElement(img) : null, texts ? `${texts} text${texts > 1 ? "s" : ""}` : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Empty mug";
}

export function mugInfo(d: MugDraft): DesignInfo {
  return { meta: `${mugSummary(d)} · 11 oz`, price: MUG_PRICE, quantity: d.quantity };
}

export function sampleMug(): MugDraft {
  return {
    quantity: 1,
    elements: [
      { ...fittedImage({ art: "floral", aspect: 1 }), x: 0.27, scale: 0.4 },
      {
        id: "sample-mug-text",
        kind: "text",
        text: "Happy birthday, Mom",
        font: "script",
        weight: 700,
        color: "rose",
        x: 0.7,
        y: 0.5,
        scale: 0.1,
        rotation: 0,
        z: 2,
        aspect: 0,
      },
    ],
  };
}

import { APPAREL_UPLOAD_FEE, GARMENTS, GARMENT_COLORS, getApparelDesign, type Side } from "../../data/studioCatalog";
import type { DesignInfo } from "../../studio/StudioContext";
import type { ApparelDraft } from "../../studio/drafts";
import { describeElement, imageElement, type PlacedElement } from "../../studio/elements";

export const garmentOf = (d: ApparelDraft) => GARMENTS.find((g) => g.id === d.garmentId);
export const colorOf = (id: string | null) => GARMENT_COLORS.find((c) => c.id === id) ?? GARMENT_COLORS[0];
export const allElements = (d: ApparelDraft) => [...d.front, ...d.back];
export const hasUpload = (d: ApparelDraft) => allElements(d).some((e) => e.uploaded);

export function elementPrice(el: PlacedElement) {
  return getApparelDesign(el.ref)?.price ?? 0;
}

/** Base piece + every placed design + the upload fee, charged once. */
export function apparelPrice(d: ApparelDraft) {
  const designs = allElements(d).reduce((n, e) => n + elementPrice(e), 0);
  return (garmentOf(d)?.price ?? 0) + designs + (hasUpload(d) ? APPAREL_UPLOAD_FEE : 0);
}

export function designLabel(el: PlacedElement) {
  if (el.uploaded) return "Your artwork";
  return getApparelDesign(el.ref)?.name ?? describeElement(el);
}

export function pieceLabel(d: ApparelDraft) {
  return [garmentOf(d)?.name, colorOf(d.colorId).name, d.sizeId].filter(Boolean).join(" · ");
}

export function apparelSummary(d: ApparelDraft) {
  const n = allElements(d).length;
  if (!n) return "Add a logo, graphic, text or your own artwork";
  return `${garmentOf(d)?.name ?? "Piece"} + ${n} design${n > 1 ? "s" : ""}`;
}

export function apparelInfo(d: ApparelDraft): DesignInfo {
  const n = allElements(d).length;
  return {
    meta: `${colorOf(d.colorId).name} · ${d.sizeId} · ${n} design${n === 1 ? "" : "s"}`,
    price: apparelPrice(d),
    materials: (["front", "back"] as Side[]).flatMap((s) => d[s].map((e) => `${designLabel(e)} (${s})`)),
  };
}

/** Centre of the print area of a side, with a sensible default width. */
export function placeInPrint(d: ApparelDraft, side: Side, props: Partial<PlacedElement> & { aspect: number }) {
  const area = garmentOf(d)?.print[side] ?? { x0: 0.3, y0: 0.3, x1: 0.7, y1: 0.7 };
  return imageElement({ scale: (area.x1 - area.x0) * 0.6, x: (area.x0 + area.x1) / 2, y: (area.y0 + area.y1) / 2, ...props });
}

export function sampleApparel(): ApparelDraft {
  const base: ApparelDraft = { garmentId: "hoodie", colorId: "black", sizeId: "M", front: [], back: [] };
  return {
    ...base,
    front: [placeInPrint(base, "front", { art: "monogram", ref: "a-monogram", aspect: 1, scale: 0.18, y: 0.42 })],
    back: [placeInPrint(base, "back", { art: "mountains", ref: "a-mountains", aspect: 1, scale: 0.34 })],
  };
}

import { BOX_COLORS, GIFT_PACKAGING, GIFT_SHAPES, getGiftItem, type BoxShape, type Bounds } from "../../data/studioCatalog";
import type { DesignInfo } from "../../studio/StudioContext";
import type { GiftDraft } from "../../studio/drafts";
import { imageElement, type PlacedElement } from "../../studio/elements";

/** Box drawing in SVG units; `inner` is the interior items must stay in, as fractions. */
export function boxGeometry(shape: BoxShape | null): { w: number; h: number; inner: Bounds } {
  const w = shape === "rect" ? 140 : 100;
  const h = 110;
  return { w, h, inner: { x0: 12 / w, y0: 24 / h, x1: (w - 12) / w, y1: 98 / h } };
}

export const boxColor = (id: string | null) => BOX_COLORS.find((c) => c.id === id) ?? BOX_COLORS[0];
export const packagingOf = (d: GiftDraft) => GIFT_PACKAGING.find((p) => p.id === d.packaging);
export const shapeOf = (d: GiftDraft) => GIFT_SHAPES.find((s) => s.id === d.shape);

export const itemElements = (d: GiftDraft) => d.elements.filter((e) => e.kind === "image");
export const textElements = (d: GiftDraft) => d.elements.filter((e) => e.kind === "text");

export function packagingPrice(d: GiftDraft) {
  return (packagingOf(d)?.price ?? 0) + (shapeOf(d)?.price ?? 0);
}

export function giftPrice(d: GiftDraft) {
  const items = itemElements(d).reduce((n, e) => n + (getGiftItem(e.ref)?.price ?? 0), 0);
  return packagingPrice(d) + boxColor(d.colorId).price + items;
}

/** Elements grouped per catalog item ("Candle ×2"); every text is its own row. */
export function giftGroups(elements: PlacedElement[]) {
  const groups: { key: string; label: string; count: number; ids: string[]; price: number }[] = [];
  for (const e of [...elements].sort((a, b) => b.z - a.z)) {
    if (e.kind === "text") {
      groups.push({ key: e.id, label: `“${e.text}”`, count: 1, ids: [e.id], price: 0 });
      continue;
    }
    const item = getGiftItem(e.ref);
    const g = groups.find((x) => x.key === e.ref);
    if (g) {
      g.count++;
      g.ids.push(e.id);
    } else groups.push({ key: e.ref ?? e.id, label: item?.name ?? "Item", count: 1, ids: [e.id], price: item?.price ?? 0 });
  }
  return groups;
}

export function packagingLabel(d: GiftDraft) {
  return [packagingOf(d)?.title, shapeOf(d)?.name, boxColor(d.colorId).name].filter(Boolean).join(" · ");
}

export function giftInfo(d: GiftDraft): DesignInfo {
  const items = itemElements(d);
  return {
    meta: `${packagingOf(d)?.title ?? ""} ${shapeOf(d)?.name.toLowerCase() ?? ""} box · ${items.length} items`.trim(),
    price: giftPrice(d),
    materials: giftGroups(items).map((g) => `${g.label} ×${g.count}`),
  };
}

export function sampleGift(): GiftDraft {
  const item = (ref: string, x: number, y: number, scale: number, rotation = 0, z = 1) =>
    imageElement({ art: getGiftItem(ref)!.art, ref, x, y, scale, rotation, z, aspect: 1 });
  return {
    packaging: "closed",
    shape: "rect",
    colorId: "black",
    elements: [
      item("nest", 0.5, 0.72, 0.5, 0, 1),
      item("candle", 0.62, 0.5, 0.2, 0, 2),
      item("card", 0.32, 0.56, 0.22, -6, 3),
      item("chocolate", 0.8, 0.6, 0.17, 8, 4),
      item("bow", 0.2, 0.36, 0.16, -10, 5),
      {
        id: "sample-gift-text",
        kind: "text",
        text: "You are enough",
        font: "script",
        weight: 700,
        color: "gold",
        x: 0.5,
        y: 0.33,
        scale: 0.13,
        rotation: 0,
        z: 6,
        aspect: 0,
      },
    ],
  };
}

import { parseTextLayers, type Category, type Component, type GiftBundle, type GiftPackaging, type Product, type ProductInput } from "../../api/models";
import { drawElements, imageSize, renderPng } from "../../studio/capture";
import type { GiftDraft } from "../../studio/drafts";
import { imageElement, newId, type Bounds, type PlacedElement } from "../../studio/elements";
import { apiFraction, apiRotation, apiScale, designName, textElementOf, textLayerOf, texts, typeLabel, type StudioData } from "../data";
import i18n from "../../i18n";

/** Picker groups, matched by keyword on the admin-set component type (the app's GIFT groups). */
export const GIFT_GROUPS = [
  { key: "ITEMS", get label() { return i18n.t("giftGroups.ITEMS"); }, match: /ITEM|PRODUCT|MUG|CUP|FOOD|SWEET|CHOC|COOKIE|DRINK|COFFEE|TEA|CANDLE|TOY|BEAR/, base: 0.2 },
  { key: "DECORATIONS", get label() { return i18n.t("giftGroups.DECORATIONS"); }, match: /DECOR|RIBBON|BOW|CARD|HEART|TAG|FLOWER|ROSE|STICKER|BALLOON/, base: 0.14 },
  { key: "FILLER", get label() { return i18n.t("giftGroups.FILLER"); }, match: /FILL|SHRED|STRAW|NEST/, base: 0.28 },
  { key: "CONTAINER", get label() { return i18n.t("giftGroups.CONTAINER"); }, match: /BAG|BOX|BASKET|CONTAINER|PACKAG|HAMPER/, base: 0.6 },
] as const;

export type GroupKey = (typeof GIFT_GROUPS)[number]["key"];

/** Unknown types are shown under "All" and sized like items. */
export const groupOf = (type: string | null | undefined) =>
  GIFT_GROUPS.find((g) => g.match.test((type ?? "").toUpperCase())) ?? GIFT_GROUPS[0];

export const hasKnownGroup = (type: string | null | undefined) => GIFT_GROUPS.some((g) => g.match.test((type ?? "").toUpperCase()));

/** Box drawing in SVG units; `inner` is the interior items must stay in, as fractions. */
export function boxGeometry(shape: "SQUARE" | "RECTANGULAR" | undefined): { w: number; h: number; inner: Bounds } {
  const w = shape === "RECTANGULAR" ? 140 : 100;
  const h = 110;
  return { w, h, inner: { x0: 12 / w, y0: 24 / h, x1: (w - 12) / w, y1: 98 / h } };
}

export const packagingOf = (d: GiftDraft, data: StudioData) => data.packaging.find((p) => p.id === d.packagingId) ?? null;
export const colorOf = (d: GiftDraft, p: GiftPackaging | null) => p?.colors.find((c) => c.id === d.colorId) ?? null;

/** Drawn box colour: the chosen colour, else a neutral one. */
export function boxHex(d: GiftDraft, data: StudioData) {
  const p = packagingOf(d, data);
  return colorOf(d, p)?.hex ?? (p?.type === "TRANSPARENT" ? "#D9CFC1" : "#2B2F45");
}

export const imageEls = (d: GiftDraft) => d.elements.filter((e) => e.kind === "image");

/** Estimate shown while designing: packaging + colour + items. Text is free. The API sets the real price. */
export function giftPrice(d: GiftDraft, data: StudioData, byId: Map<string, Component>) {
  const p = packagingOf(d, data);
  return (p?.price ?? 0) + (colorOf(d, p)?.priceAdjustment ?? 0) + imageEls(d).reduce((n, e) => n + (byId.get(e.ref ?? "")?.price ?? 0), 0);
}

/** Elements grouped per component ("Candle ×2"); every text is its own row. */
export function giftGroups(elements: PlacedElement[], byId: Map<string, Component>) {
  const groups: { key: string; label: string; count: number; ids: string[]; price: number }[] = [];
  for (const e of [...elements].sort((a, b) => b.z - a.z)) {
    if (e.kind === "text") {
      groups.push({ key: e.id, label: `“${e.text}”`, count: 1, ids: [e.id], price: 0 });
      continue;
    }
    const g = groups.find((x) => x.key === e.ref);
    if (g) {
      g.count++;
      g.ids.push(e.id);
    } else groups.push({ key: e.ref ?? e.id, label: e.name ?? i18n.t("order.item"), count: 1, ids: [e.id], price: byId.get(e.ref ?? "")?.price ?? 0 });
  }
  return groups;
}

/** My scale is a share of the canvas width; the API's is relative to the group's starting size. */
const unitOf = (byId: Map<string, Component>, e: PlacedElement) => groupOf(byId.get(e.ref ?? "")?.type).base;

/** One item per placed piece, quantity 1, with its position; `position` is the stacking order (0 = back). */
export function giftInput(category: Category, d: GiftDraft, byId: Map<string, Component>): ProductInput {
  const pieces = imageEls(d).sort((a, b) => a.z - b.z);
  return {
    categoryId: category.id,
    name: designName(category),
    ...(d.packagingId ? { giftPackagingId: d.packagingId } : {}),
    ...(d.colorId ? { giftPackagingColorId: d.colorId } : {}),
    items: pieces.map((e, position) => ({
      subCategoryId: e.ref!,
      quantity: 1,
      position,
      x: apiFraction(e.x),
      y: apiFraction(e.y),
      scale: apiScale(e.scale / unitOf(byId, e)),
      rotation: apiRotation(e.rotation),
    })),
    textLayers: texts(d.elements).map((e) => textLayerOf(e)),
    ...(d.recipient?.trim() ? { giftRecipient: d.recipient.trim() } : {}),
    ...(d.message?.trim() ? { giftMessage: d.message.trim() } : {}),
  };
}

export async function giftFromProduct(p: Product, data: StudioData): Promise<GiftDraft> {
  const byId = new Map(data.components.map((c) => [c.id, c]));
  const items = [...(p.items ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const elements: PlacedElement[] = [];
  for (const item of items) {
    const comp = byId.get(item.subCategoryId);
    const src = comp?.imageUrl ?? item.subCategory?.imageUrl ?? undefined;
    const size = src ? await imageSize(src) : { width: 1, height: 1 };
    for (let copy = 0; copy < Math.max(1, item.quantity); copy++)
      elements.push(
        imageElement({
          id: newId(),
          src,
          ref: item.subCategoryId,
          name: comp?.name ?? item.subCategory?.name,
          aspect: size.height / size.width,
          x: item.x ?? 0.5,
          y: item.y ?? 0.6,
          scale: (item.scale ?? 1) * groupOf(comp?.type ?? item.subCategory?.type).base,
          rotation: item.rotation ?? 0,
          z: elements.length + 1,
        }),
      );
  }
  parseTextLayers(p.textLayers).forEach((layer, i) => elements.push(textElementOf(layer, elements.length + 1 + i)));
  return {
    kind: "GIFT",
    packagingId: p.giftPackagingId ?? p.giftPackaging?.id ?? null,
    colorId: p.giftPackagingColorId ?? null,
    elements,
    recipient: p.giftRecipient ?? "",
    message: p.giftMessage ?? "",
  };
}

/** The scene as the design picture: the box in its colour with every item and message, like GiftBox. */
export function captureGift(d: GiftDraft, data: StudioData) {
  const p = packagingOf(d, data);
  const g = boxGeometry(p?.shape);
  const transparent = p?.type === "TRANSPARENT";
  const hex = boxHex(d, data);
  const k = 840 / g.w;
  const W = 840;
  const H = g.h * k;
  const rect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.roundRect(x * k, y * k, w * k, h * k, r * k);
  };
  return renderPng(W, H, async (ctx) => {
    if (!transparent) {
      ctx.save();
      ctx.translate((g.w / 2) * k, 9 * k);
      ctx.rotate((-2 * Math.PI) / 180);
      ctx.translate((-g.w / 2) * k, -9 * k);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = hex;
      rect(ctx, 3, 2, g.w - 6, 14, 3);
      ctx.fill();
      ctx.restore();
    }
    ctx.save();
    ctx.globalAlpha = transparent ? 0.5 : 1;
    ctx.fillStyle = hex;
    rect(ctx, 6, 18, g.w - 12, 88, 4);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = transparent ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.38)";
    rect(ctx, 12, 24, g.w - 24, 74, 2);
    ctx.fill();
    await drawElements(ctx, d.elements, W, H);
    if (transparent) {
      const glass = ctx.createLinearGradient(6 * k, 18 * k, (g.w - 6) * k, 106 * k);
      glass.addColorStop(0, "rgba(255,255,255,0.26)");
      glass.addColorStop(0.45, "rgba(255,255,255,0.03)");
      glass.addColorStop(1, "rgba(255,255,255,0.14)");
      ctx.fillStyle = glass;
      rect(ctx, 6, 18, g.w - 12, 88, 4);
      ctx.fill();
      ctx.strokeStyle = hex;
      ctx.lineWidth = 2.5 * k;
      ctx.stroke();
    }
  });
}

/* ---------------- Gift Studio flow: slots, types, bundles ---------------- */

/** Item types are typed by the admin, so they match without regard to case or spaces (like the API). */
export const typeKey = (type: string | null | undefined) => (type ?? "").trim().toLowerCase();

/** Whether the packaging accepts this item; packaging without allowed types accepts everything. */
export const fits = (c: Pick<Component, "type">, p: GiftPackaging | null) =>
  !p || !p.allowedTypes.length || p.allowedTypes.some((t) => typeKey(t) === typeKey(c.type));

/**
 * The filters: each item type once, in catalog order, named in the current language when it is a
 * known type (ITEM → "Items") and otherwise as the admin wrote it. Untyped items show under "All" only.
 */
export function typeFilters(items: Component[]) {
  const seen = new Map<string, string>();
  for (const c of items) {
    const key = typeKey(c.type);
    if (key && !seen.has(key)) seen.set(key, typeLabel(c.type!));
  }
  return [...seen].map(([key, label]) => ({ key, label }));
}

/**
 * The slot grid: as many slots as the packaging holds. Without a capacity it grows a row at a
 * time and always keeps a free slot. Wide boxes get more columns.
 */
export function slotGrid(p: GiftPackaging | null, count: number) {
  const slots = Math.max(p?.capacity ?? Math.max(6, Math.ceil((count + 1) / 3) * 3), count);
  const wide = p?.shape === "RECTANGULAR";
  const cols = Math.max(1, Math.min(slots, Math.ceil(Math.sqrt(slots * (wide ? 1.6 : 1)))));
  return { slots, cols, rows: Math.ceil(slots / cols) };
}

/** Image elements in slot order (the order they were added). */
export const slotOrder = (d: GiftDraft) => imageEls(d).sort((a, b) => a.z - b.z);

/**
 * Puts every item in its slot: centred, sized to fit. The positions are what is saved and drawn
 * in the design picture, so other apps show the box as it looks here.
 */
export function layoutSlots(d: GiftDraft, p: GiftPackaging | null): GiftDraft {
  const items = slotOrder(d);
  const { cols, rows } = slotGrid(p, items.length);
  const g = boxGeometry(p?.shape);
  const sw = (g.inner.x1 - g.inner.x0) / cols;
  const sh = (g.inner.y1 - g.inner.y0) / rows;
  const placed = new Map(
    items.map((e, i) => {
      const fitW = sw * 0.72;
      const fitH = ((sh * 0.72) * g.h) / g.w / Math.max(0.05, e.aspect || 1);
      return [
        e.id,
        { ...e, x: g.inner.x0 + sw * ((i % cols) + 0.5), y: g.inner.y0 + sh * (Math.floor(i / cols) + 0.5), scale: Math.min(fitW, fitH), rotation: 0 },
      ];
    }),
  );
  return { ...d, elements: d.elements.map((e) => placed.get(e.id) ?? e) };
}

/** What is in the box, one row per item with its count, in the order first added. */
export function contentsOf(d: GiftDraft, byId: Map<string, Component>) {
  const rows: { ref: string; name: string; image: string | null; price: number; count: number }[] = [];
  for (const e of slotOrder(d)) {
    const ref = e.ref ?? e.id;
    const row = rows.find((r) => r.ref === ref);
    if (row) row.count++;
    else {
      const c = byId.get(ref);
      rows.push({ ref, name: c?.name ?? e.name ?? i18n.t("order.item"), image: c?.imageUrl ?? e.src ?? null, price: c?.price ?? 0, count: 1 });
    }
  }
  return rows;
}

/**
 * A bundle as it can be offered now: its items that still exist (deleted or hidden ones are
 * skipped), and why it can't be added (too many for the box, a type the box refuses, stock).
 */
export function usableBundle(b: GiftBundle, p: GiftPackaging | null, byId: Map<string, Component>) {
  const items = b.items.flatMap((i) => {
    const c = byId.get(i.subCategoryId);
    return c ? [{ component: c, quantity: i.quantity }] : [];
  });
  const count = items.reduce((n, i) => n + i.quantity, 0);
  const blocked =
    !items.length || items.some((i) => !i.component.imageUrl || !fits(i.component, p))
      ? "hidden"
      : p?.capacity != null && count > p.capacity
        ? "hidden"
        : items.some((i) => i.component.trackStock && i.component.stock < i.quantity)
          ? "stock"
          : null;
  return { name: b.name, items, count, blocked };
}

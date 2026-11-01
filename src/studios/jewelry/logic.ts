import { measuredSizes, type Category, type Component, type Product, type ProductInput } from "../../api/models";
import { isNecklace } from "../../data/homeCategories";
import { cm, money } from "../../lib/format";
import type { JewelryDraft } from "../../studio/drafts";
import { designName } from "../data";

/** Must match the API: a 200 mm piece is complete at 198–202 mm and never passes 202. */
export const TOLERANCE_MM = 2;
/**
 * Must match the API (assertJewelryMinimumPrice): the lowest price a bracelet or necklace can be
 * ordered at, before delivery. Saving is allowed at any price; length completeness never blocks.
 */
export const MIN_JEWELRY_PRICE_CENTS = 500;
/** Customers adjust the length in half centimetres. */
export const STEP_MM = 5;
/** Drawn size of a piece whose length isn't configured (only on older designs). */
export const TYPICAL_MM = 8;

export interface Piece {
  id: string;
  name: string;
  lengthMm: number;
  imageUrl: string | null;
  color: string | null;
}

export const toPiece = (c: Pick<Component, "id" | "name" | "effectiveLengthMm" | "imageUrl" | "color">): Piece => ({
  id: c.id,
  name: c.name,
  lengthMm: c.effectiveLengthMm ?? TYPICAL_MM,
  imageUrl: c.imageUrl,
  color: c.color,
});

export const cordOf = (category: Category) => (isNecklace(category) ? "u" : "circle");
export const nounOf = (category: Category) => (isNecklace(category) ? "necklace" : "bracelet");

export function piecesOf(ids: string[], byId: Map<string, Component>): Piece[] {
  return ids.flatMap((id) => {
    const c = byId.get(id);
    return c ? [toPiece(c)] : [];
  });
}

export const usedMm = (ids: string[], byId: Map<string, Component>) => ids.reduce((n, id) => n + (byId.get(id)?.effectiveLengthMm ?? 0), 0);
export const priceOf = (ids: string[], byId: Map<string, Component>) => ids.reduce((n, id) => n + (byId.get(id)?.price ?? 0), 0);
export const usedCount = (ids: string[], id: string) => ids.filter((x) => x === id).length;

export const isComplete = (d: JewelryDraft, byId: Map<string, Component>) => Math.abs(usedMm(d.pieces, byId) - d.lengthMm) <= TOLERANCE_MM;

/** Room left before the design passes the length + tolerance, optionally freeing one piece. */
export function roomMm(d: JewelryDraft, byId: Map<string, Component>, replace: number | null = null) {
  const freed = replace === null ? 0 : (byId.get(d.pieces[replace])?.effectiveLengthMm ?? 0);
  return d.lengthMm + TOLERANCE_MM - usedMm(d.pieces, byId) + freed;
}

export function sizeOf(category: Category, d: JewelryDraft) {
  return measuredSizes(category).find((s) => s.id === d.sizeId) ?? null;
}

export function sizeLabel(category: Category, d: JewelryDraft) {
  const size = sizeOf(category, d);
  return size ? `${size.name} · ${cm(d.lengthMm)}` : "No size";
}

/** Pieces grouped per component, in order of first appearance. */
export function groupPieces(ids: string[], byId: Map<string, Component>) {
  const groups = new Map<string, { component: Component; count: number }>();
  for (const id of ids) {
    const c = byId.get(id);
    if (!c) continue;
    const g = groups.get(id);
    if (g) g.count++;
    else groups.set(id, { component: c, count: 1 });
  }
  return [...groups.values()];
}

/** Consecutive identical pieces become one item, keeping the design order (like the app). */
export function jewelryInput(category: Category, d: JewelryDraft): ProductInput {
  const items: ProductInput["items"] = [];
  d.pieces.forEach((id, position) => {
    const last = items[items.length - 1];
    if (last?.subCategoryId === id) last.quantity++;
    else items.push({ subCategoryId: id, quantity: 1, position });
  });
  return {
    categoryId: category.id,
    name: designName(category),
    items,
    ...(d.sizeId ? { selectedSizeId: d.sizeId } : {}),
    ...(d.lengthMm ? { selectedMeasurementMm: d.lengthMm } : {}),
  };
}

/** Restores a saved design (Edit copy). */
export function jewelryFromProduct(p: Product, category: Category): JewelryDraft {
  const size = measuredSizes(category).find((s) => s.id === p.selectedSize?.id) ?? null;
  const saved = Number(p.selectedSize?.selectedMeasurementMm);
  const pieces = [...(p.items ?? [])]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .flatMap((item) => Array<string>(Math.max(1, item.quantity)).fill(item.subCategoryId));
  return {
    kind: "JEWELRY",
    sizeId: size?.id ?? null,
    lengthMm: size ? (Number.isInteger(saved) && saved > 0 ? saved : size.defaultMeasurementMm) : 0,
    pieces,
  };
}

/** The app's wording: "Bracelets start at €5.00. Add a few more components to continue." */
export const minimumMessage = (category: Pick<Category, "name" | "builderConfig">) =>
  `${isNecklace(category) ? "Necklaces" : "Bracelets"} start at ${money(MIN_JEWELRY_PRICE_CENTS)}. Add a few more components to continue.`;

/** "Add €1.40 more to order.", or null at or above the minimum. */
export const missingForMinimum = (price: number) => (price < MIN_JEWELRY_PRICE_CENTS ? `Add ${money(MIN_JEWELRY_PRICE_CENTS - price)} more to order.` : null);

/**
 * Why the design can't be ordered yet, if anything. A piece may be ordered before it fills its
 * length, but not below the minimum price (the price is the saved product's once saved).
 */
export function orderProblem(category: Pick<Category, "name" | "builderConfig">, price: number) {
  return price < MIN_JEWELRY_PRICE_CENTS ? minimumMessage(category) : null;
}

import { JEWELRY, getPiece, type JewelryPiece } from "../../data/studioCatalog";
import type { DesignInfo } from "../../studio/StudioContext";
import type { JewelryDraft } from "../../studio/drafts";

export type JewelrySlug = "bracelet" | "necklace";

/** A design within ±2 mm of the chosen length counts as complete. */
export const TOLERANCE_MM = 2;

export const piecesOf = (ids: string[]) => ids.map(getPiece).filter((p): p is JewelryPiece => !!p);
export const usedMm = (ids: string[]) => piecesOf(ids).reduce((n, p) => n + p.lengthMm, 0);
export const jewelryPrice = (ids: string[]) => piecesOf(ids).reduce((n, p) => n + p.price, 0);
export const usedCount = (ids: string[], id: string) => ids.filter((x) => x === id).length;

/** Room left before the design goes past the length + tolerance. */
export const roomMm = (d: JewelryDraft) => d.lengthMm + TOLERANCE_MM - usedMm(d.pieces);
export const isComplete = (d: JewelryDraft) => Math.abs(usedMm(d.pieces) - d.lengthMm) <= TOLERANCE_MM;

/** Does `piece` fit, either added at the end or replacing the piece at `replace`? */
export function fits(d: JewelryDraft, piece: JewelryPiece, replace: number | null) {
  const freed = replace === null ? 0 : (getPiece(d.pieces[replace])?.lengthMm ?? 0);
  return piece.lengthMm <= roomMm(d) + freed;
}

/** Pieces grouped by type, in order of first appearance. */
export function groupPieces(ids: string[]) {
  const groups = new Map<string, { piece: JewelryPiece; count: number }>();
  for (const p of piecesOf(ids)) {
    const g = groups.get(p.id);
    if (g) g.count++;
    else groups.set(p.id, { piece: p, count: 1 });
  }
  return [...groups.values()];
}

export const formatCm = (mm: number) => `${(mm / 10).toFixed(1).replace(/\.0$/, "")} cm`;

export function jewelryInfo(d: JewelryDraft): DesignInfo {
  const groups = groupPieces(d.pieces);
  return {
    meta: `${d.pieces.length} pieces · ${formatCm(d.lengthMm)}`,
    price: jewelryPrice(d.pieces),
    materials: groups.map((g) => `${g.piece.name} ×${g.count}`),
  };
}

export function sizeLabel(slug: JewelrySlug, d: JewelryDraft) {
  const size = JEWELRY[slug].sizes.find((s) => s.id === d.sizeId);
  return size ? `${size.label} · ${size.minCm}–${size.maxCm} cm` : "No size";
}

const letters = (word: string) => word.split("").map((l) => `letter-${l}`);

/** Sensible starting designs, used for "Edit copy" on the sample designs. */
export function sampleJewelry(slug: JewelrySlug): JewelryDraft {
  if (slug === "bracelet") {
    const side = ["amber", "pearl", "amber", "ocean", "amber", "pearl", "amber", "ocean", "pearl"];
    return { sizeId: "M", lengthMm: 175, pieces: [...side, ...letters("JORDAN"), ...[...side].reverse()] };
  }
  const gold = Array(6).fill("gold-bead");
  return {
    sizeId: "princess",
    lengthMm: 450,
    pieces: [...gold, "spacer-gold", ...letters("SAMA"), "pendant-star", ...letters("NTHA"), "spacer-gold", ...gold],
  };
}

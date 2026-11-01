import type { PlacedElement } from "./elements";

export interface JewelryDraft {
  kind: "JEWELRY";
  sizeId: string | null;
  lengthMm: number;
  /** SubCategory ids, in order along the cord. */
  pieces: string[];
}

export interface GiftDraft {
  kind: "GIFT";
  packagingId: string | null;
  colorId: string | null;
  elements: PlacedElement[];
}

export interface MugDraft {
  kind: "MUG";
  elements: PlacedElement[];
  quantity: number;
}

export interface ApparelDraft {
  kind: "APPAREL";
  baseProductId: string | null;
  size: string | null;
  front: PlacedElement[];
  back: PlacedElement[];
}

export interface CaseDraft {
  kind: "CASE";
  modelId: string | null;
  /** At most one image. */
  elements: PlacedElement[];
}

export interface StickerDesign {
  id: string;
  image: PlacedElement | null;
  quantity: number;
}

export interface StickerDraft {
  kind: "STICKER";
  sizeId: string | null;
  designs: StickerDesign[];
}

export type AnyDraft = JewelryDraft | GiftDraft | MugDraft | ApparelDraft | CaseDraft | StickerDraft;
export type DraftKind = AnyDraft["kind"];
export type DraftOf<K extends DraftKind> = Extract<AnyDraft, { kind: K }>;

export const DEFAULT_STICKER_QTY = 10;

export const EMPTY_DRAFTS: { [K in DraftKind]: () => DraftOf<K> } = {
  JEWELRY: () => ({ kind: "JEWELRY", sizeId: null, lengthMm: 0, pieces: [] }),
  GIFT: () => ({ kind: "GIFT", packagingId: null, colorId: null, elements: [] }),
  MUG: () => ({ kind: "MUG", elements: [], quantity: 1 }),
  APPAREL: () => ({ kind: "APPAREL", baseProductId: null, size: null, front: [], back: [] }),
  CASE: () => ({ kind: "CASE", modelId: null, elements: [] }),
  STICKER: () => ({ kind: "STICKER", sizeId: null, designs: [{ id: "sd-1", image: null, quantity: DEFAULT_STICKER_QTY }] }),
};

/** Every placed element of a draft. */
export function elementsOf(d: AnyDraft): PlacedElement[] {
  switch (d.kind) {
    case "JEWELRY":
      return [];
    case "APPAREL":
      return [...d.front, ...d.back];
    case "STICKER":
      return d.designs.flatMap((s) => (s.image ? [s.image] : []));
    default:
      return d.elements;
  }
}

/** Whether the customer has started designing. */
export const hasContent = (d: AnyDraft) => (d.kind === "JEWELRY" ? d.pieces.length > 0 : elementsOf(d).length > 0);

/** Uploads that were lost on reload and must be uploaded again. */
export const missingUploads = (d: AnyDraft) => elementsOf(d).filter((e) => e.missing).length;

/** Uploaded files can't be kept across reloads; keep where they were and ask to re-upload. */
function stripUploads(el: PlacedElement): PlacedElement {
  return el.uploaded && el.src?.startsWith("blob:") ? { ...el, src: undefined, missing: true } : el;
}

export function persistable(d: AnyDraft): AnyDraft {
  switch (d.kind) {
    case "JEWELRY":
      return d;
    case "APPAREL":
      return { ...d, front: d.front.map(stripUploads), back: d.back.map(stripUploads) };
    case "STICKER":
      return { ...d, designs: d.designs.map((s) => ({ ...s, image: s.image ? stripUploads(s.image) : null })) };
    default:
      return { ...d, elements: d.elements.map(stripUploads) };
  }
}

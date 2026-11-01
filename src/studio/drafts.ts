import type { BoxShape, GarmentId, Packaging, StickerShape } from "../data/studioCatalog";
import type { StudioSlug } from "../data/mock";
import type { PlacedElement } from "./elements";

export interface JewelryDraft {
  sizeId: string | null;
  lengthMm: number;
  /** Catalog piece ids, in order along the cord. */
  pieces: string[];
}

export interface GiftDraft {
  packaging: Packaging | null;
  shape: BoxShape | null;
  colorId: string | null;
  elements: PlacedElement[];
}

export interface MugDraft {
  elements: PlacedElement[];
  quantity: number;
}

export interface ApparelDraft {
  garmentId: GarmentId | null;
  colorId: string | null;
  sizeId: string | null;
  front: PlacedElement[];
  back: PlacedElement[];
}

export interface CaseDraft {
  modelId: string | null;
  /** At most one image (uploaded or one of our designs). */
  elements: PlacedElement[];
}

export interface StickerDesign {
  id: string;
  image: PlacedElement | null;
  quantity: number;
}

export interface StickerDraft {
  shape: StickerShape | null;
  sizeId: string | null;
  designs: StickerDesign[];
}

export interface DraftMap {
  bracelet: JewelryDraft;
  necklace: JewelryDraft;
  gifts: GiftDraft;
  mugs: MugDraft;
  apparel: ApparelDraft;
  cases: CaseDraft;
  stickers: StickerDraft;
}

export type AnyDraft = DraftMap[StudioSlug];

export const INITIAL_DRAFTS: DraftMap = {
  bracelet: { sizeId: null, lengthMm: 170, pieces: [] },
  necklace: { sizeId: null, lengthMm: 450, pieces: [] },
  gifts: { packaging: null, shape: null, colorId: null, elements: [] },
  mugs: { elements: [], quantity: 1 },
  apparel: { garmentId: null, colorId: null, sizeId: null, front: [], back: [] },
  cases: { modelId: null, elements: [] },
  stickers: { shape: null, sizeId: null, designs: [{ id: "sd-1", image: null, quantity: 10 }] },
};

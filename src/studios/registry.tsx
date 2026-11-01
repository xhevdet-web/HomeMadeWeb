import type { ComponentType } from "react";
import { measuredSizes, needsColor, stickerSizes, type BuilderType, type Category, type Product } from "../api/models";
import type { AnyDraft, DraftKind, DraftOf } from "../studio/drafts";
import { ApparelBase } from "./apparel/ApparelBase";
import { ApparelPreview } from "./apparel/ApparelPreview";
import { ApparelStudio } from "./apparel/ApparelStudio";
import { apparelFromProduct, baseOf, sizesOf } from "./apparel/logic";
import { CaseModels } from "./cases/CaseModels";
import { CasePreview } from "./cases/CasePreview";
import { CaseStudio } from "./cases/CaseStudio";
import { caseFromProduct, modelOf } from "./cases/logic";
import type { StudioData, StudioProps } from "./data";
import { GiftPackagingStep } from "./gifts/GiftPackaging";
import { GiftPreview } from "./gifts/GiftPreview";
import { GiftStudio } from "./gifts/GiftStudio";
import { giftFromProduct, packagingOf } from "./gifts/logic";
import { JewelryBase } from "./jewelry/JewelryBase";
import { JewelryPreview } from "./jewelry/JewelryPreview";
import { JewelryStudio } from "./jewelry/JewelryStudio";
import { jewelryFromProduct } from "./jewelry/logic";
import { MugPreview } from "./mugs/MugPreview";
import { MugStudio } from "./mugs/MugStudio";
import { mugFromProduct } from "./mugs/logic";
import { StickerPreview } from "./stickers/StickerPreview";
import { StickerSetup } from "./stickers/StickerSetup";
import { StickerStudio } from "./stickers/StickerStudio";
import { stickerFromProduct } from "./stickers/logic";

export interface StudioModule<K extends DraftKind = DraftKind> {
  kind: K;
  /** Step 1. Studios without a base step (mugs) open the design straight away. */
  Base?: ComponentType<StudioProps>;
  Design: ComponentType<StudioProps>;
  Preview: ComponentType<StudioProps>;
  baseDone: (draft: DraftOf<K>, category: Category, data: StudioData) => boolean;
  /** Shown when someone opens the design step before finishing step 1. */
  baseNotice: string;
  /** Restores a saved design for "Edit copy", or (display) for a read-only preview with its saved uploads. */
  fromProduct: (product: Product, category: Category, data: StudioData, display?: boolean) => Promise<DraftOf<K>>;
}

const MODULES: { [B in Exclude<BuilderType, "BOUQUET">]: StudioModule } = {
  JEWELRY: {
    kind: "JEWELRY",
    Base: JewelryBase,
    Design: JewelryStudio,
    Preview: JewelryPreview,
    baseDone: (d, c) => d.kind === "JEWELRY" && measuredSizes(c).some((s) => s.id === d.sizeId),
    baseNotice: "Choose a size first.",
    fromProduct: async (p, c) => jewelryFromProduct(p, c),
  },
  GIFT: {
    kind: "GIFT",
    Base: GiftPackagingStep,
    Design: GiftStudio,
    Preview: GiftPreview,
    baseDone: (d, _c, data) => {
      if (d.kind !== "GIFT") return false;
      const p = packagingOf(d, data);
      return !!p && (!needsColor(p) || !!d.colorId);
    },
    baseNotice: "Choose how your gift should arrive first.",
    fromProduct: (p, _c, data) => giftFromProduct(p, data),
  },
  MUG: {
    kind: "MUG",
    Design: MugStudio,
    Preview: MugPreview,
    baseDone: () => true,
    baseNotice: "",
    fromProduct: (p, _c, data, display) => mugFromProduct(p, data, display),
  },
  APPAREL: {
    kind: "APPAREL",
    Base: ApparelBase,
    Design: ApparelStudio,
    Preview: ApparelPreview,
    baseDone: (d, _c, data) => {
      if (d.kind !== "APPAREL") return false;
      const base = baseOf(d, data);
      return !!base && (sizesOf(base).length === 0 || !!d.size);
    },
    baseNotice: "Choose the piece to design on",
    fromProduct: (p, c, data, display) => apparelFromProduct(p, c, data, display),
  },
  CASE: {
    kind: "CASE",
    Base: CaseModels,
    Design: CaseStudio,
    Preview: CasePreview,
    baseDone: (d, _c, data) => d.kind === "CASE" && !!modelOf(d, data),
    baseNotice: "Choose your phone model first.",
    fromProduct: (p, _c, data, display) => caseFromProduct(p, data, display),
  },
  STICKER: {
    kind: "STICKER",
    Base: StickerSetup,
    Design: StickerStudio,
    Preview: StickerPreview,
    baseDone: (d, c) => d.kind === "STICKER" && stickerSizes(c).some((s) => s.id === d.sizeId),
    baseNotice: "Choose the shape and size of your stickers first.",
    fromProduct: (p, c, _data, display) => stickerFromProduct(p, c, display),
  },
};

export const moduleFor = (builder: BuilderType | null): StudioModule | null =>
  builder && builder !== "BOUQUET" ? (MODULES[builder] as StudioModule) : null;

export type { AnyDraft };

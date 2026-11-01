import type { ComponentType } from "react";
import type { OrderItem, StudioSlug } from "../data/mock";
import { JEWELRY } from "../data/studioCatalog";
import { useStudio, type SavedDesign } from "../studio/StudioContext";
import type { AnyDraft, DraftMap, JewelryDraft } from "../studio/drafts";
import { ApparelBase } from "./apparel/ApparelBase";
import { ApparelPreview } from "./apparel/ApparelPreview";
import { ApparelStudio } from "./apparel/ApparelStudio";
import { ApparelThumb } from "./apparel/silhouettes";
import { sampleApparel } from "./apparel/logic";
import { CaseThumb } from "./cases/CaseCanvas";
import { CaseModels } from "./cases/CaseModels";
import { CasePreview } from "./cases/CasePreview";
import { CaseStudio } from "./cases/CaseStudio";
import { sampleCase } from "./cases/logic";
import { GiftThumb } from "./gifts/GiftBox";
import { GiftPackaging } from "./gifts/GiftPackaging";
import { GiftPreview } from "./gifts/GiftPreview";
import { GiftStudio } from "./gifts/GiftStudio";
import { sampleGift } from "./gifts/logic";
import { JewelryBase } from "./jewelry/JewelryBase";
import { JewelryCanvas } from "./jewelry/JewelryCanvas";
import { JewelryPreview } from "./jewelry/JewelryPreview";
import { JewelryStudio } from "./jewelry/JewelryStudio";
import { sampleJewelry } from "./jewelry/logic";
import { MugMockup } from "./mugs/MugMockup";
import { MugPreview } from "./mugs/MugPreview";
import { MugStudio } from "./mugs/MugStudio";
import { sampleMug } from "./mugs/logic";
import { StickerPreview } from "./stickers/StickerPreview";
import { StickerSetup } from "./stickers/StickerSetup";
import { StickerStudio } from "./stickers/StickerStudio";
import { StickerThumb } from "./stickers/StickerCanvas";
import { sampleStickers } from "./stickers/logic";

export interface StudioModule<K extends StudioSlug = StudioSlug> {
  /** Step 1. Studios without a base step (mugs) skip straight to the design. */
  Base?: ComponentType;
  Design: ComponentType;
  Preview: ComponentType;
  Thumb: ComponentType<{ draft: DraftMap[K] }>;
  baseDone: (draft: DraftMap[K]) => boolean;
  /** Shown when someone opens the design step before finishing step 1. */
  baseNotice: string;
  /** A sensible design to load for "Edit copy" on a sample design. */
  sample: () => DraftMap[K];
}

const jewelryThumb = (slug: "bracelet" | "necklace") =>
  function JewelryThumb({ draft }: { draft: JewelryDraft }) {
    return <JewelryCanvas kind={JEWELRY[slug].cord} pieces={draft.pieces} lengthMm={draft.lengthMm} label={`Your ${slug}`} className="h-full w-full" />;
  };

const MODULES: { [K in StudioSlug]: StudioModule<K> } = {
  bracelet: {
    Base: () => <JewelryBase slug="bracelet" />,
    Design: () => <JewelryStudio slug="bracelet" />,
    Preview: () => <JewelryPreview slug="bracelet" />,
    Thumb: jewelryThumb("bracelet"),
    baseDone: (d) => !!d.sizeId,
    baseNotice: "Choose a size first.",
    sample: () => sampleJewelry("bracelet"),
  },
  necklace: {
    Base: () => <JewelryBase slug="necklace" />,
    Design: () => <JewelryStudio slug="necklace" />,
    Preview: () => <JewelryPreview slug="necklace" />,
    Thumb: jewelryThumb("necklace"),
    baseDone: (d) => !!d.sizeId,
    baseNotice: "Choose a length first.",
    sample: () => sampleJewelry("necklace"),
  },
  gifts: {
    Base: GiftPackaging,
    Design: GiftStudio,
    Preview: GiftPreview,
    Thumb: GiftThumb,
    baseDone: (d) => !!(d.packaging && d.shape && d.colorId),
    baseNotice: "Choose how your gift should arrive first.",
    sample: sampleGift,
  },
  mugs: {
    Design: MugStudio,
    Preview: MugPreview,
    Thumb: ({ draft }) => <MugMockup draft={draft} />,
    baseDone: () => true,
    baseNotice: "",
    sample: sampleMug,
  },
  apparel: {
    Base: ApparelBase,
    Design: ApparelStudio,
    Preview: ApparelPreview,
    Thumb: ({ draft }) => (
      <div className="w-[82%]">
        <ApparelThumb draft={draft} />
      </div>
    ),
    baseDone: (d) => !!(d.garmentId && d.colorId && d.sizeId),
    baseNotice: "Pick your piece, colour and size first.",
    sample: sampleApparel,
  },
  cases: {
    Base: CaseModels,
    Design: CaseStudio,
    Preview: CasePreview,
    Thumb: CaseThumb,
    baseDone: (d) => !!d.modelId,
    baseNotice: "Choose your phone model first.",
    sample: sampleCase,
  },
  stickers: {
    Base: StickerSetup,
    Design: StickerStudio,
    Preview: StickerPreview,
    Thumb: StickerThumb,
    baseDone: (d) => !!(d.shape && d.sizeId),
    baseNotice: "Choose a shape and size first.",
    sample: sampleStickers,
  },
};

/** Look up a studio module without fighting correlated-union types at the call site. */
export const studioModule = (slug: StudioSlug) => MODULES[slug] as unknown as StudioModule<StudioSlug>;

/** Live, non-interactive thumbnail of a saved design. */
export function SavedThumb({ design }: { design: SavedDesign }) {
  const { Thumb } = studioModule(design.studio);
  return (
    <div className="flex h-full w-full items-center justify-center p-[10%]">
      <Thumb draft={design.draft as AnyDraft} />
    </div>
  );
}

/** Product image for checkout and orders: a live thumbnail for saved designs, a photo otherwise. */
export function ItemImage({ item, className }: { item: OrderItem; className: string }) {
  const saved = useStudio().saved.find((s) => s.id === item.savedId);
  if (saved) {
    return (
      <div className={`${className} overflow-hidden bg-secondary`} role="img" aria-label={item.name}>
        <SavedThumb design={saved} />
      </div>
    );
  }
  return <img src={item.image} alt={item.name} className={`${className} object-cover`} />;
}

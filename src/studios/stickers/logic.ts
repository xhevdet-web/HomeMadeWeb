import { DEFAULT_STICKER_QTY, STICKER_SHAPES, getStickerSize, type StickerSize } from "../../data/studioCatalog";
import type { DesignInfo } from "../../studio/StudioContext";
import type { StickerDraft } from "../../studio/drafts";
import { coverScale, imageElement, newId, type PlacedElement } from "../../studio/elements";

/** White die-cut border, as a fraction of the sticker width. */
export const BORDER = 0.05;

export const sizeOf = (d: StickerDraft) => getStickerSize(d.sizeId);

/** Height / width of the printable area inside the border. */
export const innerAspect = (size: StickerSize) => (size.hCm / size.wCm - 2 * BORDER) / (1 - 2 * BORDER);

export const coverSticker = (size: StickerSize, props: Partial<PlacedElement> & { aspect: number }) =>
  imageElement({ ...props, scale: coverScale(props.aspect, innerAspect(size)) });

/** After a shape or size change every image is re-centred to cover the new shape. */
export function recenter(d: StickerDraft): StickerDraft {
  const size = sizeOf(d);
  if (!size) return d;
  return {
    ...d,
    designs: d.designs.map((s) =>
      s.image ? { ...s, image: { ...s.image, x: 0.5, y: 0.5, rotation: 0, scale: coverScale(s.image.aspect, innerAspect(size)) } } : s,
    ),
  };
}

export const totalStickers = (d: StickerDraft) => d.designs.reduce((n, s) => n + s.quantity, 0);
export const stickerPrice = (d: StickerDraft) => (sizeOf(d)?.price ?? 0) * totalStickers(d);
export const allHaveImages = (d: StickerDraft) => d.designs.every((s) => s.image);

export function setLabel(d: StickerDraft) {
  const size = sizeOf(d);
  const shape = STICKER_SHAPES.find((s) => s.id === d.shape)?.name;
  return size ? `${shape} · ${size.label}` : "No size yet";
}

export const newDesign = () => ({ id: newId(), image: null, quantity: DEFAULT_STICKER_QTY });

export function stickerInfo(d: StickerDraft): DesignInfo {
  const n = d.designs.length;
  return { meta: `${n} design${n > 1 ? "s" : ""} · ${totalStickers(d)} stickers · ${setLabel(d)}`, price: stickerPrice(d) };
}

export function sampleStickers(): StickerDraft {
  const size = getStickerSize("ci-5")!;
  return {
    shape: "circle",
    sizeId: size.id,
    designs: (["sunSmile", "rainbow", "mushroom"] as const).map((art) => ({
      id: newId(),
      image: coverSticker(size, { art, aspect: 1 }),
      quantity: DEFAULT_STICKER_QTY,
    })),
  };
}

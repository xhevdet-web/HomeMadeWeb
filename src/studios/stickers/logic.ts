import i18n from "../../i18n";
import { parseStickerSize, stickerSizes, type Category, type Product, type ProductInput, type StickerShape, type StickerSize } from "../../api/models";
import { imageSize, loadImage, renderPng } from "../../studio/capture";
import { DEFAULT_STICKER_QTY, type StickerDraft } from "../../studio/drafts";
import { containScale, coverScale, imageElement, newId, type PlacedElement } from "../../studio/elements";
import { apiFraction, apiRotation, apiScale, designName, uploadsOf } from "../data";

export const MAX_DESIGNS = 5;
export const MIN_STICKERS = 5;
export const MAX_PER_DESIGN = 1000;
/** Our designs start a little inside the cut edge. */
export const LIBRARY_SCALE = 0.8;
/** White die-cut border, as a share of the sticker width. */
export const BORDER = 0.05;

export const SHAPE_NAMES: Record<StickerShape, string> = { SQUARE: "Square", CIRCLE: "Circle", RECTANGLE: "Rectangle", OVAL: "Oval" };

export const sizeOf = (category: Category, d: StickerDraft) => stickerSizes(category).find((s) => s.id === d.sizeId) ?? null;

const cmText = (mm: number) => String(Math.round(mm) / 10);
export const dimensions = (s: StickerSize) => (s.shape === "CIRCLE" ? `⌀ ${cmText(s.widthMm)} cm` : `${cmText(s.widthMm)} × ${cmText(s.heightMm)} cm`);
export const setLabel = (s: StickerSize | null) => (s ? `${i18n.t(`stickers.shapes.${s.shape}`)} · ${dimensions(s)}` : i18n.t("stickers.noSizeYet"));

/** Height ÷ width of the printable area inside the border. */
export const innerAspect = (s: StickerSize) => (s.heightMm / s.widthMm - 2 * BORDER) / (1 - 2 * BORDER);

/** Uploads are photos that fill the sticker ("cover"); our designs sit inside it ("contain"). */
export const fitMode = (el: PlacedElement) => (el.uploaded ? "cover" : "contain");
export const unitScale = (el: PlacedElement, s: StickerSize) =>
  el.uploaded ? coverScale(el.aspect, innerAspect(s)) : containScale(el.aspect, innerAspect(s));

export function placeOnSticker(s: StickerSize, props: Partial<PlacedElement> & { aspect: number }) {
  const el = imageElement({ ...props, scale: 1 });
  return { ...el, scale: unitScale(el, s) * (el.uploaded ? 1 : LIBRARY_SCALE) };
}

/** After a size change every image is re-centred to fit the new shape. */
export function recenter(d: StickerDraft, s: StickerSize): StickerDraft {
  return {
    ...d,
    designs: d.designs.map((x) =>
      x.image ? { ...x, image: { ...x.image, x: 0.5, y: 0.5, rotation: 0, scale: unitScale(x.image, s) * (x.image.uploaded ? 1 : LIBRARY_SCALE) } } : x,
    ),
  };
}

export const totalStickers = (d: StickerDraft) => d.designs.reduce((n, x) => n + x.quantity, 0);
export const stickerPrice = (d: StickerDraft, s: StickerSize | null) => (s?.price ?? 0) * totalStickers(d);
export const allHaveImages = (d: StickerDraft) => d.designs.every((x) => x.image && !x.image.missing);
export const newDesign = () => ({ id: newId(), image: null, quantity: DEFAULT_STICKER_QTY });

/** One item per design with its artwork, placement and how many to print. */
export async function stickerInput(category: Category, d: StickerDraft, s: StickerSize): Promise<{ input: ProductInput; uploads: Blob[] }> {
  if (!allHaveImages(d)) throw new Error(i18n.t("stickers.imageEveryDesignSave"));
  const images = d.designs.map((x) => x.image!);
  let upload = 0;
  return {
    input: {
      categoryId: category.id,
      name: designName(category),
      selectedSizeId: s.id,
      items: d.designs.map((x, position) => ({
        subCategoryId: x.image!.ref!,
        quantity: Math.min(MAX_PER_DESIGN, Math.max(1, x.quantity)),
        position,
        x: apiFraction(x.image!.x),
        y: apiFraction(x.image!.y),
        scale: apiScale(x.image!.scale / unitScale(x.image!, s)),
        rotation: apiRotation(x.image!.rotation),
        ...(x.image!.uploaded ? { customDesignIndex: upload++ } : {}),
      })),
    },
    uploads: await uploadsOf(images),
  };
}

/** All designs as stickers in a row. Throws a CaptureError when an image can't be drawn. */
export function captureStickers(d: StickerDraft, s: StickerSize) {
  const each = 280;
  const gap = 24;
  const h = each * (s.heightMm / s.widthMm);
  const W = d.designs.length * each + (d.designs.length - 1) * gap;
  return renderPng(W, h, async (ctx) => {
    for (const [i, x] of d.designs.entries()) {
      const left = i * (each + gap);
      const shape = new Path2D();
      if (s.shape === "CIRCLE" || s.shape === "OVAL") shape.ellipse(left + each / 2, h / 2, each / 2, h / 2, 0, 0, Math.PI * 2);
      else shape.roundRect(left, 0, each, h, (2 / s.widthMm) * each);
      ctx.save();
      ctx.fillStyle = "#FFFFFF";
      ctx.fill(shape);
      ctx.clip(shape);
      const b = each * BORDER;
      const iw = each - 2 * b;
      const ih = h - 2 * b;
      const el = x.image!;
      const img = await loadImage(el.src!);
      ctx.translate(left + b + el.x * iw, b + el.y * ih);
      ctx.rotate((el.rotation * Math.PI) / 180);
      ctx.drawImage(img, (-iw * el.scale) / 2, (-iw * el.scale * el.aspect) / 2, iw * el.scale, iw * el.scale * el.aspect);
      ctx.restore();
    }
  });
}

export async function stickerFromProduct(p: Product, category: Category, display = false): Promise<StickerDraft> {
  const size = stickerSizes(category).find((s) => s.id === p.selectedSize?.id) ?? parseStickerSize(p.selectedSize);
  const designs = [];
  for (const item of [...(p.items ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))) {
    const uploaded = !!item.customImageUrl;
    // Edit copy needs the upload again (it can't be fetched back); a read-only preview shows the saved one.
    const src = uploaded && !display ? undefined : (item.customImageUrl ?? item.subCategory?.imageUrl ?? undefined);
    const dims = src ? await imageSize(src) : { width: 1, height: 1 };
    const el = imageElement({
      id: newId(),
      src,
      ref: item.subCategoryId,
      name: item.subCategory?.name,
      uploaded,
      missing: uploaded && !display,
      aspect: dims.height / dims.width,
      x: item.x ?? 0.5,
      y: item.y ?? 0.5,
      scale: 1,
      rotation: item.rotation ?? 0,
    });
    designs.push({ id: newId(), quantity: Math.min(MAX_PER_DESIGN, Math.max(1, item.quantity)), image: { ...el, scale: (item.scale ?? 1) * (size ? unitScale(el, size) : 1) } });
  }
  return { kind: "STICKER", sizeId: size?.id ?? null, designs: designs.length ? designs : [newDesign()] };
}

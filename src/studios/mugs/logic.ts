import { parseTextLayers, type Category, type Product, type ProductInput } from "../../api/models";
import { imageSize, renderPng, drawElements } from "../../studio/capture";
import type { MugDraft } from "../../studio/drafts";
import { describeElement, imageElement, newId, type PlacedElement } from "../../studio/elements";
import { apiFraction, apiRotation, apiScale, designName, textElementOf, textLayerOf, texts, uploadsOf, type StudioData } from "../data";

/** A customer mug holds one image (plus text), like the API's MAX_MUG_ELEMENTS. */
export const MAX_MUG_IMAGES = 1;
export const MAX_MUGS = 100;
/** The mug is white, so the saved print is drawn on white, like the app's. */
export const MUG_WHITE = "#FFFFFF";
/** The cream that prints saved before were drawn on; shown as white on the mug. */
export const OLD_PRINT_CREAM = [243, 239, 232] as const;

/** At API scale 1 an image is this share of the print height. */
const BASE_HEIGHT_SHARE = 0.6;

export interface MugArea {
  widthMm: number;
  heightMm: number;
  safeMm: { top: number; right: number; bottom: number; left: number };
}

const mm = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;

/** The print area of the blank mug (the COMPANY product whose front area has a size in mm). */
export function mugArea(p: Pick<Product, "printAreas"> | null | undefined): MugArea | null {
  const front = (p?.printAreas as { front?: Record<string, unknown> } | null | undefined)?.front;
  if (!front || !mm(front.widthMm) || !mm(front.heightMm) || !front.widthMm || !front.heightMm) return null;
  const safe = (front.safeMm ?? {}) as Record<string, unknown>;
  const m = (k: string) => (mm(safe[k]) ? (safe[k] as number) : 0);
  return { widthMm: front.widthMm, heightMm: front.heightMm, safeMm: { top: m("top"), right: m("right"), bottom: m("bottom"), left: m("left") } };
}

export const blankMug = (data: StudioData) => data.products.find((p) => mugArea(p)) ?? null;
export const readyMugs = (data: StudioData) => data.products.filter((p) => !mugArea(p));

/** Height ÷ width of the print area. */
export const printAspect = (a: MugArea) => a.heightMm / a.widthMm;

export const mugImage = (d: MugDraft) => d.elements.find((e) => e.kind === "image");
export const mugTexts = (d: MugDraft) => d.elements.filter((e) => e.kind === "text");

/** Fit an image inside the print area, centred. */
export function fittedImage(area: MugArea, props: Partial<PlacedElement> & { aspect: number }) {
  return imageElement({ ...props, scale: Math.min(0.9, (printAspect(area) * 0.8) / props.aspect) });
}

export function mugSummary(d: MugDraft) {
  const img = mugImage(d);
  const n = mugTexts(d).length;
  const parts = [img ? describeElement(img) : null, n ? `${n} text${n > 1 ? "s" : ""}` : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : "Empty mug";
}

/** My scale is a share of the print width; the API's is relative to 60% of the print height. */
const toApiScale = (el: PlacedElement, area: MugArea) => apiScale((el.scale * el.aspect) / (printAspect(area) * BASE_HEIGHT_SHARE));
const fromApiScale = (scale: number, aspect: number, area: MugArea) => (scale * printAspect(area) * BASE_HEIGHT_SHARE) / aspect;

export async function mugInput(category: Category, d: MugDraft, blank: Product, area: MugArea): Promise<{ input: ProductInput; uploads: Blob[] }> {
  const images = d.elements.filter((e) => e.kind === "image").sort((a, b) => a.z - b.z);
  let upload = 0;
  return {
    input: {
      categoryId: category.id,
      name: designName(category),
      baseProductId: blank.id,
      items: images.map((e, position) => ({
        subCategoryId: e.ref!,
        quantity: 1,
        position,
        x: apiFraction(e.x),
        y: apiFraction(e.y),
        scale: toApiScale(e, area),
        rotation: apiRotation(e.rotation),
        ...(e.uploaded ? { customDesignIndex: upload++ } : {}),
      })),
      textLayers: texts(d.elements).map((e) => textLayerOf(e)),
    },
    uploads: await uploadsOf(images),
  };
}

/** The flat print as the design picture. Throws a CaptureError when an image can't be drawn. */
export function captureMug(d: MugDraft, area: MugArea) {
  const W = 1200;
  const H = W * printAspect(area);
  return renderPng(W, H, async (ctx) => {
    ctx.fillStyle = MUG_WHITE;
    ctx.fillRect(0, 0, W, H);
    await drawElements(ctx, d.elements, W, H);
  });
}

export async function mugFromProduct(p: Product, data: StudioData, display = false): Promise<MugDraft> {
  const area = mugArea(blankMug(data)) ?? { widthMm: 200, heightMm: 90, safeMm: { top: 0, right: 0, bottom: 0, left: 0 } };
  const elements: PlacedElement[] = [];
  for (const item of [...(p.items ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))) {
    // An uploaded image can't be fetched again from the image host; it is uploaded again.
    const uploaded = !!item.customImageUrl;
    // Edit copy needs the upload again (it can't be fetched back); a read-only preview shows the saved one.
    const src = uploaded && !display ? undefined : (item.customImageUrl ?? item.subCategory?.imageUrl ?? undefined);
    const size = src ? await imageSize(src) : { width: 1, height: 1 };
    const aspect = size.height / size.width;
    elements.push(
      imageElement({
        id: newId(),
        src,
        ref: item.subCategoryId,
        name: item.subCategory?.name,
        uploaded,
        missing: uploaded && !display,
        aspect,
        x: item.x ?? 0.5,
        y: item.y ?? 0.5,
        scale: fromApiScale(item.scale ?? 1, aspect, area),
        rotation: item.rotation ?? 0,
        z: elements.length + 1,
      }),
    );
  }
  parseTextLayers(p.textLayers).forEach((l, i) => elements.push(textElementOf(l, elements.length + 1 + i)));
  return { kind: "MUG", elements, quantity: 1 };
}

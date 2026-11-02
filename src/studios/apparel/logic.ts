import { useEffect, useState } from "react";
import { parseArea, parseSizes, parseTextLayers, type Category, type Component, type PrintArea, type Product, type ProductInput } from "../../api/models";
import { imageSize, renderPng, drawElements, loadImage } from "../../studio/capture";
import type { ApparelDraft } from "../../studio/drafts";
import { imageElement, newId, type Bounds, type PlacedElement } from "../../studio/elements";
import { apiFraction, apiRotation, apiScale, customUpload, designName, textElementOf, textLayerOf, uploadsOf, type StudioData } from "../data";
import i18n from "../../i18n";

export type Side = "front" | "back";
export type Silhouette = "HOODIE" | "TSHIRT";

/** Used until a product has its own print areas configured (the app's defaults, on a square canvas). */
const DEFAULT_AREAS: Record<Silhouette, Record<Side, PrintArea>> = {
  HOODIE: { front: { x: 0.33, y: 0.34, width: 0.34, height: 0.26 }, back: { x: 0.29, y: 0.35, width: 0.42, height: 0.4 } },
  TSHIRT: { front: { x: 0.31, y: 0.25, width: 0.38, height: 0.44 }, back: { x: 0.29, y: 0.21, width: 0.42, height: 0.5 } },
};

/** A design at API scale 1 is this share of the print-area width. */
const BASE_DESIGN_SHARE = 0.5;

export const silhouetteOf = (c: Category): Silhouette => (c.builderConfig?.silhouette === "HOODIE" ? "HOODIE" : "TSHIRT");

export const baseOf = (d: ApparelDraft, data: StudioData) => data.products.find((p) => p.id === d.baseProductId) ?? null;

export function printArea(base: Product | null, side: Side, category: Category): PrintArea {
  const areas = base?.printAreas as { front?: unknown; back?: unknown } | null | undefined;
  return parseArea(side === "front" ? areas?.front : areas?.back) ?? DEFAULT_AREAS[silhouetteOf(category)][side];
}

export const boundsOf = (a: PrintArea): Bounds => ({ x0: a.x, y0: a.y, x1: a.x + a.width, y1: a.y + a.height });

/** Without a separate back photo the back reuses the front one, as in the dashboard. */
export const garmentImage = (base: Product | null, side: Side) => (side === "front" ? base?.imageUrl : (base?.backImageUrl ?? base?.imageUrl)) ?? null;

export const sizesOf = (base: Product | null) => parseSizes(base?.sizes);

export const allElements = (d: ApparelDraft) => [...d.front, ...d.back];
export const hasUpload = (d: ApparelDraft) => allElements(d).some((e) => e.uploaded);

/** Estimate: base piece + each placed design; an own upload is charged once. The API sets the real price. */
export function apparelPrice(d: ApparelDraft, data: StudioData, byId: Map<string, Component>) {
  const fee = customUpload(data)?.price ?? 0;
  const designs = allElements(d)
    .filter((e) => e.kind === "image" && !e.uploaded)
    .reduce((n, e) => n + (byId.get(e.ref ?? "")?.price ?? 0), 0);
  return (baseOf(d, data)?.price ?? 0) + designs + (hasUpload(d) ? fee : 0);
}

export function apparelSummary(d: ApparelDraft, data: StudioData) {
  const n = allElements(d).length;
  if (!n) return i18n.t("apparel.addFirstShort");
  return `${baseOf(d, data)?.name ?? i18n.t("apparel.piece")} + ${i18n.t("stickers.designsCount", { count: n })}`;
}

/** Placements are saved relative to the print area (centre 0–1 within it). */
const toArea = (el: PlacedElement, a: PrintArea) => ({ x: apiFraction((el.x - a.x) / a.width), y: apiFraction((el.y - a.y) / a.height) });
const fromArea = (x: number, y: number, a: PrintArea) => ({ x: a.x + x * a.width, y: a.y + y * a.height });

export async function apparelInput(category: Category, d: ApparelDraft, data: StudioData): Promise<{ input: ProductInput; uploads: Blob[] }> {
  const base = baseOf(d, data);
  if (!base) throw new Error(i18n.t("apparel.choosePieceError"));
  const sides: [Side, PlacedElement[]][] = [
    ["front", [...d.front].sort((a, b) => a.z - b.z)],
    ["back", [...d.back].sort((a, b) => a.z - b.z)],
  ];
  const items: ProductInput["items"] = [];
  const textLayers: NonNullable<ProductInput["textLayers"]> = [];
  const uploaded: PlacedElement[] = [];
  for (const [side, els] of sides) {
    const area = printArea(base, side, category);
    for (const el of els) {
      const API_SIDE = side === "front" ? "FRONT" : "BACK";
      if (el.kind === "text") {
        if (el.text?.trim()) textLayers.push(textLayerOf(el, toArea(el, area), API_SIDE));
        continue;
      }
      items.push({
        subCategoryId: el.ref!,
        quantity: 1,
        position: items.length,
        side: API_SIDE,
        ...toArea(el, area),
        scale: apiScale(el.scale / (area.width * BASE_DESIGN_SHARE)),
        rotation: apiRotation(el.rotation),
        ...(el.uploaded ? { customDesignIndex: uploaded.length } : {}),
      });
      if (el.uploaded) uploaded.push(el);
    }
  }
  return {
    input: {
      categoryId: category.id,
      name: designName(category),
      baseProductId: base.id,
      ...(d.size ? { selectedSizeId: d.size } : {}),
      items,
      textLayers,
    },
    uploads: await uploadsOf(uploaded),
  };
}

/** A side as a PNG (garment photo + designs). Throws a CaptureError when an image can't be drawn. */
export async function captureSide(d: ApparelDraft, data: StudioData, side: Side) {
  const els = d[side];
  const src = garmentImage(baseOf(d, data), side);
  const size = src ? await imageSize(src) : { width: 1, height: 1 };
  const W = 840;
  const H = (W * size.height) / size.width;
  return renderPng(W, H, async (ctx) => {
    if (src) ctx.drawImage(await loadImage(src), 0, 0, W, H);
    await drawElements(ctx, els, W, H);
  });
}

/** `designPreview` is the front; `backDesignPreview` only when the back has designs (like the app). */
export async function apparelPreviews(d: ApparelDraft, data: StudioData) {
  return { preview: await captureSide(d, data, "front"), backPreview: d.back.length ? await captureSide(d, data, "back") : null };
}

export async function apparelFromProduct(p: Product, category: Category, data: StudioData, display = false): Promise<ApparelDraft> {
  const base = data.products.find((x) => x.id === (p.baseProductId ?? p.baseProduct?.id)) ?? null;
  const draft: ApparelDraft = { kind: "APPAREL", baseProductId: base?.id ?? null, size: p.selectedSize?.id ?? null, front: [], back: [] };
  let z = 1;
  for (const item of [...(p.items ?? [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))) {
    const side: Side = item.side === "BACK" ? "back" : "front";
    const area = printArea(base, side, category);
    const uploaded = !!item.customImageUrl;
    // Edit copy needs the upload again (it can't be fetched back); a read-only preview shows the saved one.
    const src = uploaded && !display ? undefined : (item.customImageUrl ?? item.subCategory?.imageUrl ?? undefined);
    const size = src ? await imageSize(src) : { width: 1, height: 1 };
    for (let copy = 0; copy < Math.max(1, item.quantity); copy++)
      draft[side].push(
        imageElement({
          id: newId(),
          src,
          ref: item.subCategoryId,
          name: item.subCategory?.name,
          uploaded,
          missing: uploaded && !display,
          aspect: size.height / size.width,
          ...fromArea(item.x ?? 0.5, item.y ?? 0.5, area),
          scale: (item.scale ?? 1) * area.width * BASE_DESIGN_SHARE,
          rotation: item.rotation ?? 0,
          z: z++,
        }),
      );
  }
  for (const layer of parseTextLayers(p.textLayers)) {
    const side: Side = layer.side === "BACK" ? "back" : "front";
    draft[side].push(textElementOf(layer, z++, fromArea(layer.x, layer.y, printArea(base, side, category))));
  }
  return draft;
}

/** Aspect ratio (w / h) of an image once it's known; square until then. */
export function useImageRatio(src: string | null) {
  const [ratio, setRatio] = useState(1);
  useEffect(() => {
    let live = true;
    if (src) imageSize(src).then((s) => live && setRatio(s.width / s.height));
    else setRatio(1);
    return () => {
      live = false;
    };
  }, [src]);
  return ratio;
}

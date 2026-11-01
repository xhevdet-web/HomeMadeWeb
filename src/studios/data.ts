import * as catalog from "../api/catalog";
import { CUSTOM_UPLOAD, type Category, type Component, type GiftPackaging, type Product, type TextLayerInput } from "../api/models";
import { CATALOG_TTL, useApi } from "../hooks/useApi";
import { TEXT_COLORS, colorFromHex, newId, type PlacedElement } from "../studio/elements";
import { uploadBlob } from "../studio/StudioContext";

/** Everything a studio needs from the public catalog. */
export interface StudioData {
  /** The category's components plus its shared design library, active only. */
  components: Component[];
  /** The category's COMPANY products: ready-made pieces, apparel bases, phone models, the blank mug. */
  products: Product[];
  packaging: GiftPackaging[];
}

export interface StudioProps {
  category: Category;
  data: StudioData;
}

async function load(category: Category, signal: AbortSignal): Promise<StudioData> {
  const [own, library, products, packaging] = await Promise.all([
    catalog.components(category.id, signal),
    category.designCategoryId && category.builderType !== "JEWELRY"
      ? catalog.componentsByCategory(category.designCategoryId, signal).catch(() => [])
      : Promise.resolve([]),
    catalog.products({ categoryId: category.id, origin: "COMPANY" }, signal),
    category.builderType === "GIFT" ? catalog.giftPackaging(signal) : Promise.resolve([]),
  ]);
  const seen = new Set(own.map((c) => c.id));
  return {
    components: [...own, ...library.filter((c) => !seen.has(c.id))],
    products: products.filter((p) => p.isActive !== false).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    packaging,
  };
}

export function useStudioData(category: Category | undefined) {
  return useApi(category ? `studio:${category.id}` : null, (signal) => load(category!, signal), { ttl: CATALOG_TTL });
}

/** The admin's "Your own design" component: what an upload is saved as. */
export const customUpload = (data: StudioData) => data.components.find((c) => c.type === CUSTOM_UPLOAD) ?? null;

/** Designs customers can pick (everything except the upload option). */
export const libraryDesigns = (data: StudioData) => data.components.filter((c) => c.type !== CUSTOM_UPLOAD && c.imageUrl);

export const componentById = (data: StudioData) => new Map(data.components.map((c) => [c.id, c]));

/** "N left", "Sold out", "All N in use". Untracked stock (printed designs) is unlimited. */
export function stockState(c: Pick<Component, "stock" | "trackStock">, used: number): { label: string | null; disabled: boolean } {
  if (!c.trackStock) return { label: null, disabled: false };
  if (c.stock <= 0) return { label: "Sold out", disabled: true };
  if (used >= c.stock) return { label: `All ${c.stock} in use`, disabled: true };
  if (c.stock - used <= 5) return { label: `${c.stock - used} left`, disabled: false };
  return { label: null, disabled: false };
}

export const typeLabel = (type: string) => type.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export const designName = (category: Category) => `My ${category.name.toLowerCase()}`;

/* ---------------- Saving helpers shared by the free-placement studios ---------------- */

const round4 = (v: number) => Math.round(v * 10000) / 10000;
export const apiFraction = (v: number) => round4(Math.min(1, Math.max(0, v)));
/** The API accepts scales from 0.1 to 5. */
export const apiScale = (v: number) => round4(Math.min(5, Math.max(0.1, v)));
export const apiRotation = (deg: number) => Math.round(((((deg + 180) % 360) + 360) % 360) - 180);

/** A text element's scale relative to the app's "scale 1" text size. */
export const TEXT_UNIT = 0.16;

const FONT_TO_API = { classic: "SERIF", modern: "SANS", script: "SCRIPT" } as const;
const WEIGHT_TO_API = { 300: "LIGHT", 400: "REGULAR", 700: "BOLD" } as const;

export function textLayerOf(el: PlacedElement, position: { x: number; y: number } = el, side?: "FRONT" | "BACK"): TextLayerInput {
  return {
    id: el.id,
    text: (el.text ?? "").trim().slice(0, 80),
    x: apiFraction(position.x),
    y: apiFraction(position.y),
    scale: apiScale(el.scale / TEXT_UNIT),
    rotation: apiRotation(el.rotation),
    color: TEXT_COLORS[el.color ?? "gold"].value,
    font: FONT_TO_API[el.font ?? "classic"],
    weight: WEIGHT_TO_API[el.weight ?? 400],
    italic: !!el.italic,
    ...(side ? { side } : {}),
  };
}

export function textElementOf(layer: TextLayerInput, z: number, position: { x: number; y: number } = layer): PlacedElement {
  const font = (Object.keys(FONT_TO_API) as (keyof typeof FONT_TO_API)[]).find((f) => FONT_TO_API[f] === layer.font) ?? "classic";
  return {
    id: layer.id || newId(),
    kind: "text",
    text: layer.text,
    x: position.x,
    y: position.y,
    scale: layer.scale * TEXT_UNIT,
    rotation: layer.rotation,
    z,
    aspect: 0,
    font,
    weight: layer.weight === "LIGHT" ? 300 : layer.weight === "BOLD" ? 700 : 400,
    italic: !!layer.italic,
    color: colorFromHex(layer.color),
  };
}

/** Text elements of a draft, ready for `textLayers`. */
export const texts = (els: PlacedElement[]) => els.filter((e) => e.kind === "text" && e.text?.trim());

/** Uploaded files, in the order their items reference them with `customDesignIndex`. */
export async function uploadsOf(els: PlacedElement[]) {
  const ups = els.filter((e) => e.uploaded);
  if (ups.some((e) => e.missing || !e.src)) throw new Error("Re-upload your image before saving.");
  return Promise.all(ups.map((e) => uploadBlob(e.src!)));
}

/**
 * Why a design can't continue to checkout because of stock: a sold-out component, or more of one
 * than is in stock (repeated pieces add up, as the API counts them). Saving is still allowed.
 */
export function stockProblem(refs: (string | undefined)[], byId: Map<string, Component>) {
  const counts = new Map<string, number>();
  for (const id of refs) if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const [id, n] of counts) {
    const c = byId.get(id);
    if (!c || !c.trackStock) continue;
    if (c.stock <= 0) return `${c.name} is sold out. Remove or replace it to continue.`;
    if (n > c.stock) return `Only ${c.stock} of ${c.name} are in stock. Remove ${n - c.stock} to continue.`;
  }
  return null;
}

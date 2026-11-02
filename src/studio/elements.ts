import i18n from "../i18n";

/** A rectangle as fractions (0–1) of the canvas. */
export interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export type FontId = "classic" | "modern" | "script";
export type TextColor = "navy" | "rose" | "gold" | "black" | "white";

/** One thing placed on a canvas. Position and size are fractions of the canvas, so they survive resizing. */
export interface PlacedElement {
  id: string;
  kind: "image" | "text";
  /** Centre, as fractions (0–1) of the canvas width / height. */
  x: number;
  y: number;
  /** Width as a fraction of the canvas width (text: font size relative to TEXT_BASE). */
  scale: number;
  rotation: number;
  z: number;
  /** Image height / width. */
  aspect: number;
  /** Component image URL, or a local blob URL for the customer's own upload. */
  src?: string;
  /** Shown in lists and to assistive tech. */
  name?: string;
  /** The upload could not be restored after a reload; the customer must upload it again. */
  missing?: boolean;
  /** Natural pixel width of an uploaded image, for the print-quality check. */
  pxWidth?: number;
  uploaded?: boolean;
  /** SubCategory id this element was added from (pricing, stock and saving). */
  ref?: string;
  text?: string;
  font?: FontId;
  weight?: 300 | 400 | 700;
  italic?: boolean;
  color?: TextColor;
}

export const FULL_BOUNDS: Bounds = { x0: 0, y0: 0, x1: 1, y1: 1 };

/** Font size of a text element at scale 1, as a fraction of the canvas width. */
export const TEXT_BASE = 0.5;

export const FONTS: Record<FontId, { label: string; family: string }> = {
  classic: { label: "Classic", family: "Fraunces, Georgia, serif" },
  modern: { label: "Modern", family: "Manrope, system-ui, sans-serif" },
  script: { label: "Script", family: "'Dancing Script', cursive" },
};

/** Text colours; `value` is the hex the API stores. */
export const TEXT_COLORS: Record<TextColor, { name: string; value: string }> = {
  navy: { name: "Navy", value: "#1E2A55" },
  rose: { name: "Rose", value: "#E0798F" },
  gold: { name: "Gold", value: "#D9A93F" },
  black: { name: "Black", value: "#141414" },
  white: { name: "White", value: "#FAFAFA" },
};

export const colorFromHex = (hex?: string): TextColor =>
  (Object.keys(TEXT_COLORS) as TextColor[]).find((c) => TEXT_COLORS[c].value.toLowerCase() === hex?.toLowerCase()) ?? "gold";

export const MIN_SCALE = 0.04;
export const MAX_SCALE = 4;

let counter = 0;
export const newId = () => `el-${Date.now().toString(36)}-${(counter++).toString(36)}`;

export const topZ = (list: PlacedElement[]) => list.reduce((z, e) => Math.max(z, e.z), 0) + 1;

/** Smallest width (fraction of canvas width) at which an image covers the whole canvas. */
export const coverScale = (imageAspect: number, canvasAspect: number) => Math.max(1, canvasAspect / imageAspect);

/** Largest width at which an image still fits inside the canvas. */
export const containScale = (imageAspect: number, canvasAspect: number) => Math.min(1, canvasAspect / imageAspect);

export function imageElement(props: Partial<PlacedElement> & { aspect: number; scale: number }): PlacedElement {
  return { id: newId(), kind: "image", x: 0.5, y: 0.5, rotation: 0, z: 1, ...props };
}

/** In the current language; product and design names stay as written. */
export function describeElement(el: PlacedElement) {
  if (el.kind === "text") return i18n.t("studio.element.text", { text: el.text ?? "" });
  if (el.missing) return i18n.t("studio.element.reupload");
  return el.name ?? (el.uploaded ? i18n.t("checkout.yourImage") : i18n.t("studio.element.design"));
}

/** True when an uploaded image has too few pixels per printed centimetre. */
export function isLowQuality(el: PlacedElement, canvasWidthCm: number, minPxPerCm = 40) {
  if (!el.uploaded || !el.pxWidth) return false;
  return el.pxWidth / (el.scale * canvasWidthCm) < minPxPerCm;
}

export function sameGeometry(a: PlacedElement, b: PlacedElement) {
  const eq = (p: number, q: number) => Math.abs(p - q) < 1e-4;
  return eq(a.x, b.x) && eq(a.y, b.y) && eq(a.scale, b.scale) && eq(a.rotation, b.rotation);
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/**
 * Keeps an element inside (`contain`) or covering (`cover`) the bounds.
 * `size(scale)` returns the unrotated element size in px at that scale.
 */
export function constrain(
  el: PlacedElement,
  canvas: { W: number; H: number },
  size: (scale: number) => { w: number; h: number },
  bounds: Bounds,
  mode: "contain" | "cover",
): PlacedElement {
  const { W, H } = canvas;
  if (!W || !H) return el;
  const bx0 = bounds.x0 * W;
  const by0 = bounds.y0 * H;
  const bw = (bounds.x1 - bounds.x0) * W;
  const bh = (bounds.y1 - bounds.y0) * H;
  const rad = (el.rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  let scale = clamp(el.scale, MIN_SCALE, MAX_SCALE);
  let { w, h } = size(scale);
  if (!w || !h) return el;

  if (mode === "contain") {
    let ex = (w * cos + h * sin) / 2;
    let ey = (w * sin + h * cos) / 2;
    if (ex * 2 > bw || ey * 2 > bh) {
      const k = Math.min(bw / (2 * ex), bh / (2 * ey));
      scale *= k;
      ex *= k;
      ey *= k;
    }
    const x = clamp(el.x * W, bx0 + ex, bx0 + bw - ex);
    const y = clamp(el.y * H, by0 + ey, by0 + bh - ey);
    return { ...el, scale, x: x / W, y: y / H };
  }

  // cover: the rotated image must contain the whole bounds rectangle.
  const needW = bw * cos + bh * sin;
  const needH = bw * sin + bh * cos;
  const k = Math.max(1, needW / w, needH / h);
  scale *= k;
  w *= k;
  h *= k;
  const bcx = bx0 + bw / 2;
  const bcy = by0 + bh / 2;
  const s = Math.sin(rad);
  const c = Math.cos(rad);
  const dx = bcx - el.x * W;
  const dy = bcy - el.y * H;
  const maxU = Math.max(0, w / 2 - needW / 2);
  const maxV = Math.max(0, h / 2 - needH / 2);
  const u = clamp(dx * c + dy * s, -maxU, maxU);
  const v = clamp(-dx * s + dy * c, -maxV, maxV);
  return { ...el, scale, x: (bcx - (u * c - v * s)) / W, y: (bcy - (u * s + v * c)) / H };
}

/* ---------------- List operations ---------------- */

export type ElementsAction =
  | { type: "add"; el: PlacedElement }
  | { type: "update"; el: PlacedElement }
  | { type: "delete" | "forward" | "backward" | "front" | "duplicate"; id: string }
  | { type: "clear" };

export function elementsReducer(list: PlacedElement[], a: ElementsAction): PlacedElement[] {
  switch (a.type) {
    case "add":
      return [...list, { ...a.el, z: topZ(list) }];
    case "update":
      return list.map((e) => (e.id === a.el.id ? a.el : e));
    case "front":
      return list.map((e) => (e.id === a.id ? { ...e, z: topZ(list) } : e));
    case "delete":
      return list.filter((e) => e.id !== a.id);
    case "clear":
      return [];
    case "duplicate": {
      const src = list.find((e) => e.id === a.id);
      if (!src) return list;
      return [...list, { ...src, id: `${a.id}-copy-${list.length}`, x: src.x + 0.04, y: src.y + 0.04, z: topZ(list) }];
    }
    case "forward":
    case "backward": {
      const sorted = [...list].sort((p, q) => p.z - q.z);
      const i = sorted.findIndex((e) => e.id === a.id);
      const j = a.type === "forward" ? i + 1 : i - 1;
      if (i < 0 || j < 0 || j >= sorted.length) return list;
      const zi = sorted[i].z;
      const zj = sorted[j].z;
      return list.map((e) => (e.id === sorted[i].id ? { ...e, z: zj } : e.id === sorted[j].id ? { ...e, z: zi } : e));
    }
  }
}

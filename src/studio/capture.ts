import type { SyntheticEvent } from "react";
import { FONTS, TEXT_BASE, TEXT_COLORS, type PlacedElement } from "./elements";

/**
 * Design previews: the studio is redrawn on a canvas and exported as a PNG. Remote images must
 * allow CORS (the R2 bucket's CORS policy), otherwise the canvas can't be exported. A design is
 * never saved without its preview: a failed capture throws a CaptureError and nothing is sent.
 */

export const CAPTURE_FAILED = "Could not capture your design preview. Your design is safe; please retry.";

export class CaptureError extends Error {
  constructor(reason: string) {
    super(CAPTURE_FAILED);
    this.name = "CaptureError";
    if (import.meta.env.DEV) console.warn(`[design preview] ${reason}`);
  }
}

const isRemote = (src: string) => /^https?:/i.test(src) && !src.startsWith(location.origin);

/**
 * Visible remote images load with CORS too, so the browser doesn't cache a non-CORS copy that
 * would break the capture. Until the image host sends CORS headers the image would not show at
 * all, so it falls back once to a plain load.
 */
export const corsImage = {
  crossOrigin: "anonymous" as const,
  onError: (e: SyntheticEvent<HTMLImageElement | SVGImageElement>) => {
    const el = e.currentTarget;
    if (!el.hasAttribute("crossorigin")) return;
    el.removeAttribute("crossorigin");
    if (el instanceof HTMLImageElement) el.src = el.src;
    else {
      const href = el.getAttribute("href");
      if (href) el.setAttribute("href", href);
    }
  },
};

/** A separate URL for capture loads, so a cached response without CORS headers is never reused. */
const captureUrl = (src: string) => {
  if (!isRemote(src)) return src;
  const url = new URL(src);
  url.searchParams.set("cors", "1");
  return url.toString();
};

const images = new Map<string, Promise<HTMLImageElement>>();

/** Loads an image for drawing on a canvas (CORS-clean), or rejects with the failing URL. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  let hit = images.get(src);
  if (!hit) {
    hit = new Promise((resolve, reject) => {
      const img = new Image();
      if (!src.startsWith("blob:") && !src.startsWith("data:")) img.crossOrigin = "anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => reject(new CaptureError(`Image could not be loaded with CORS: ${src}`));
      img.src = captureUrl(src);
    });
    images.set(src, hit);
    hit.catch(() => images.delete(src));
  }
  return hit;
}

const sizes = new Map<string, Promise<{ width: number; height: number }>>();

/** Natural size of an image for display (no CORS needed). Falls back to a square. */
export function imageSize(src: string): Promise<{ width: number; height: number }> {
  let hit = sizes.get(src);
  if (!hit) {
    hit = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth || 1, height: img.naturalHeight || 1 });
      img.onerror = () => resolve({ width: 1, height: 1 });
      img.src = src;
    });
    sizes.set(src, hit);
  }
  return hit;
}

/** Draws a PNG. Throws a CaptureError (with the reason logged in development) when it can't. */
export async function renderPng(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => Promise<void>): Promise<Blob> {
  if (!(width > 0 && height > 0)) throw new CaptureError(`Invalid preview size ${width} × ${height}`);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new CaptureError("Canvas 2D is not available");
  try {
    await draw(ctx);
  } catch (e) {
    throw e instanceof CaptureError ? e : new CaptureError(`Drawing failed: ${e instanceof Error ? e.message : String(e)}`);
  }
  let blob: Blob | null;
  try {
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  } catch (e) {
    throw new CaptureError(`The canvas could not be exported (tainted by an image without CORS): ${e instanceof Error ? e.message : String(e)}`);
  }
  return checkPng(blob);
}

/** A preview is only sent when it is a non-empty PNG. */
export function checkPng(blob: Blob | null | undefined): Blob {
  if (!blob || blob.size === 0 || blob.type !== "image/png") throw new CaptureError(`Preview is not a non-empty PNG (${blob ? `${blob.type}, ${blob.size} bytes` : "nothing"})`);
  return blob;
}

/** Draws placed elements on a canvas region of `W × H` px at (`left`, `top`). */
export async function drawElements(ctx: CanvasRenderingContext2D, elements: PlacedElement[], W: number, H: number, left = 0, top = 0) {
  for (const el of [...elements].sort((a, b) => a.z - b.z)) {
    ctx.save();
    ctx.translate(left + el.x * W, top + el.y * H);
    ctx.rotate((el.rotation * Math.PI) / 180);
    ctx.scale(el.scale, el.scale);
    if (el.kind === "text") {
      const font = FONTS[el.font ?? "classic"].family;
      ctx.font = `${el.italic ? "italic " : ""}${el.weight ?? 400} ${W * TEXT_BASE}px ${font}`;
      ctx.fillStyle = TEXT_COLORS[el.color ?? "gold"].value;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(el.text ?? "", 0, 0);
    } else {
      if (!el.src) throw new CaptureError(`Image missing for "${el.name ?? "an element"}" (re-upload it)`);
      const img = await loadImage(el.src);
      ctx.drawImage(img, -W / 2, (-W * el.aspect) / 2, W, W * el.aspect);
    }
    ctx.restore();
  }
}

export function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
}

/**
 * Customer photo preparation, in the browser, before a photo goes on a design.
 *
 * Phones hand over photos the API would refuse: modern iPhones take 24–48 MP photos that are
 * well over the API's 5 MB limit even after iOS converts HEIC to JPEG, some Android pickers give
 * no MIME type at all, and photos keep their rotation in EXIF, which the API stores as is (so a
 * portrait selfie could print sideways). Here every photo is identified by its bytes, and when it
 * is too big, too large in pixels, rotated by EXIF or in another format, it is redrawn on a canvas
 * (which applies the EXIF rotation) and saved as a JPEG, or a PNG where transparency matters.
 * Photos that are already fine are used untouched, at full quality.
 */

/** The API's limit per uploaded file (homeMadeApi MAX_IMAGE_BYTES). */
export const SERVER_MAX_BYTES = 5 * 1024 * 1024;
/** Prepared files aim under this, leaving room under the API's limit. */
const TARGET_BYTES = Math.floor(4.6 * 1024 * 1024);
/** Bigger files are refused before decoding: decoding them can crash a phone's browser tab. */
export const RAW_MAX_BYTES = 50 * 1024 * 1024;
/**
 * Longest edge kept for printing. 3200 px covers every print area (a mug wrap is about 2400 px at
 * 300 dpi) and stays far under iOS Safari's canvas limit (16.7 MP).
 */
const MAX_EDGE = 3200;

export type ImageKind = "jpeg" | "png" | "webp" | "heic" | "avif" | "gif" | "bmp" | "svg" | "unknown";

export type ImageErrorCode = "type" | "heic" | "tooLarge" | "unreadable" | "processing";

export class ImageFileError extends Error {
  constructor(
    public code: ImageErrorCode,
    detail: string,
  ) {
    super(detail);
    this.name = "ImageFileError";
  }
}

export interface PreparedImage {
  blob: Blob;
  width: number;
  height: number;
  /** True when the photo was redrawn (resized, rotated or converted). */
  converted: boolean;
}

const debug = (stage: string, info: Record<string, unknown>) => {
  // Development diagnostics only: type, size and dimensions, never the image itself.
  if (import.meta.env.DEV) console.info(`[upload] ${stage}`, info);
};

const ascii = (b: Uint8Array, from: number, to: number) => String.fromCharCode(...b.subarray(from, to));

/** What the file really is, from its first bytes (the MIME type is often missing or wrong). */
export async function sniff(file: Blob): Promise<ImageKind> {
  const b = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b[0] === 0x89 && ascii(b, 1, 4) === "PNG") return "png";
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP") return "webp";
  if (ascii(b, 0, 4) === "GIF8") return "gif";
  if (ascii(b, 0, 2) === "BM") return "bmp";
  if (ascii(b, 4, 8) === "ftyp") {
    const brand = ascii(b, 8, 12);
    if (brand === "avif" || brand === "avis") return "avif";
    if (["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(brand)) return "heic";
  }
  const head = ascii(b, 0, 32).trimStart().toLowerCase();
  if (head.startsWith("<svg") || head.startsWith("<?xml")) return "svg";
  return "unknown";
}

/** EXIF orientation of a JPEG (1 = upright), read from its first 128 KB. */
export async function jpegOrientation(file: Blob): Promise<number> {
  const view = new DataView(await file.slice(0, 128 * 1024).arrayBuffer());
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return 1;
  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset);
    const length = view.getUint16(offset + 2);
    if (marker === 0xffe1 && offset + 10 <= view.byteLength && view.getUint32(offset + 4) === 0x45786966) {
      const tiff = offset + 10;
      if (tiff + 8 > view.byteLength) return 1;
      const little = view.getUint16(tiff) === 0x4949;
      const ifd = tiff + view.getUint32(tiff + 4, little);
      if (ifd + 2 > view.byteLength) return 1;
      const entries = view.getUint16(ifd, little);
      for (let i = 0; i < entries; i++) {
        const entry = ifd + 2 + i * 12;
        if (entry + 10 > view.byteLength) return 1;
        if (view.getUint16(entry, little) === 0x0112) return view.getUint16(entry + 8, little);
      }
      return 1;
    }
    if ((marker & 0xff00) !== 0xff00 || marker === 0xffda) return 1;
    offset += 2 + length;
  }
  return 1;
}

/**
 * Decodes an image from an object URL; the browser applies EXIF rotation to its natural size and
 * when drawing it. The caller revokes the URL once it has finished drawing.
 */
function decode(url: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode failed"));
    img.src = url;
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Draws the image at `scale` and encodes it; frees the canvas right away (iOS keeps canvas memory). */
async function encode(img: HTMLImageElement, w: number, h: number, type: "image/jpeg" | "image/png", quality?: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new ImageFileError("processing", "no 2d context");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (type === "image/jpeg") {
    // JPEG has no transparency: transparent areas become white, not black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(img, 0, 0, w, h);
  const blob = await toBlob(canvas, type, quality);
  canvas.width = 0;
  canvas.height = 0;
  if (!blob) throw new ImageFileError("processing", `canvas export failed at ${w}×${h}`);
  return blob;
}

/**
 * A photo ready for a design and the API, or an ImageFileError saying why not.
 * `pngOnly`: the design needs transparency (printed apparel), so only PNG files are accepted.
 */
export async function prepareImage(file: File, { pngOnly = false }: { pngOnly?: boolean } = {}): Promise<PreparedImage> {
  const kind = await sniff(file);
  debug("selected", { type: file.type || "(none)", kind, bytes: file.size, ua: navigator.userAgent });

  if (file.size > RAW_MAX_BYTES) throw new ImageFileError("tooLarge", `file is ${file.size} bytes`);
  if (pngOnly ? kind !== "png" : kind === "svg" || kind === "unknown") throw new ImageFileError("type", `kind ${kind}`);

  const url = URL.createObjectURL(file);
  try {
    return await fit(file, kind, url, pngOnly);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function fit(file: File, kind: ImageKind, url: string, pngOnly: boolean): Promise<PreparedImage> {
  let img: HTMLImageElement;
  try {
    img = await decode(url);
  } catch {
    // HEIC opens only where the browser can decode it (Safari 17+); elsewhere say so plainly.
    throw new ImageFileError(kind === "heic" ? "heic" : "unreadable", `could not decode ${kind}`);
  }
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  if (!width || !height) throw new ImageFileError("unreadable", "image has no size");
  debug("decoded", { kind, width, height });

  const orientation = kind === "jpeg" ? await jpegOrientation(file) : 1;
  const fine = (kind === "jpeg" || kind === "png" || kind === "webp") && file.size <= TARGET_BYTES && Math.max(width, height) <= MAX_EDGE && orientation <= 1;
  if (fine) return { blob: file, width, height, converted: false };

  // PNG stays PNG (transparent stickers and artwork keep their transparency); everything else becomes JPEG.
  const type = kind === "png" || pngOnly ? "image/png" : "image/jpeg";
  let scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  for (let attempt = 0; attempt < 8; attempt++) {
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const qualities = type === "image/jpeg" ? [0.92, 0.85, 0.78] : [undefined];
    for (const q of qualities) {
      const blob = await encode(img, w, h, type, q);
      debug("encoded", { type, w, h, quality: q, bytes: blob.size });
      if (blob.size <= TARGET_BYTES) return { blob, width: w, height: h, converted: true };
    }
    scale *= 0.8;
  }
  throw new ImageFileError("tooLarge", "could not get under the size limit");
}

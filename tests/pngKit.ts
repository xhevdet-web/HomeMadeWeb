import { deflateSync } from "node:zlib";
import type { Page } from "@playwright/test";

/** A small RGBA PNG drawn pixel by pixel. */
export function png(w: number, h: number, pixel: (x: number, y: number) => [number, number, number, number]) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer) => {
    let c = 0xffffffff;
    for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(body));
    return Buffer.concat([len, body, sum]);
  };
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) raw.set(pixel(x, y), y * (w * 4 + 1) + 1 + x * 4);
  const head = Buffer.alloc(13);
  head.writeUInt32BE(w, 0);
  head.writeUInt32BE(h, 4);
  head.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", head), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

/** RGBA of a point given as fractions of an image (PNG bytes). */
export async function pixelAt(page: Page, image: Buffer, fx: number, fy: number) {
  return page.evaluate(
    async ([b64, x, y]) => {
      const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob());
      const c = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = c.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0);
      return [...ctx.getImageData(Math.round(x * (bitmap.width - 1)), Math.round(y * (bitmap.height - 1)), 1, 1).data];
    },
    [image.toString("base64"), fx, fy] as const,
  );
}

export const isBlue = ([r, g, b]: number[]) => b > 200 && r < 60 && g < 60;

/** The first PNG inside a multipart request body (the saved design preview). */
export function previewPng(body: Buffer) {
  const start = body.indexOf(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const end = body.indexOf(Buffer.from("IEND"), start) + 8;
  return body.subarray(start, end);
}

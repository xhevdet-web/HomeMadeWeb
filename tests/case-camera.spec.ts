import { deflateSync } from "node:zlib";
import { expect, test, type Page } from "@playwright/test";
import { API, IMG, mockApi, seedDraft } from "./mockApi";

/** A small RGBA PNG drawn pixel by pixel. */
function png(w: number, h: number, pixel: (x: number, y: number) => [number, number, number, number]) {
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

// Template 200 × 400: a white case whose camera lenses are see-through, like a clear case photo.
const LENS = { x: 0.25, y: 0.1, r: 0.08 };
const TEMPLATE = png(200, 400, (x, y) => (Math.hypot(x / 200 - LENS.x, (y / 400 - LENS.y) * 2) < LENS.r ? [0, 0, 0, 0] : [255, 255, 255, 255]));
const BLUE = png(40, 40, () => [0, 0, 255, 255]);

const CASES = {
  id: "cat-case",
  name: "Cases",
  description: null,
  imageUrl: null,
  isActive: true,
  sortOrder: 1,
  builderType: "CASE",
  builderConfig: null,
  designCategoryId: null,
  sizes: [],
};
const MODEL = {
  id: "m-1",
  name: "Phone 1",
  categoryId: CASES.id,
  origin: "COMPANY",
  price: 1500,
  stock: 5,
  isActive: true,
  deviceBrand: "APPLE",
  imageUrl: `${IMG}/template.png`,
  printAreas: {
    front: { x: 0.04, y: 0.02, width: 0.92, height: 0.96, radius: 0.14 },
    camera: { x: 0.1, y: 0.03, width: 0.4, height: 0.15, radius: 0.2 },
  },
};
const ART = { id: "art", categoryId: CASES.id, name: "Blue", imageUrl: `${IMG}/blue.png`, type: null, price: 0, stock: 50, trackStock: false, isActive: true, sortOrder: 1 };

async function mockCases(page: Page) {
  const api = await mockApi(page);
  await page.route(`${IMG}/template.png*`, (r) => r.fulfill({ contentType: "image/png", body: TEMPLATE, headers: { "Access-Control-Allow-Origin": "*" } }));
  await page.route(`${IMG}/blue.png*`, (r) => r.fulfill({ contentType: "image/png", body: BLUE, headers: { "Access-Control-Allow-Origin": "*" } }));
  await page.route(
    (url) => url.href.startsWith(API),
    async (route) => {
      const path = new URL(route.request().url()).pathname.replace("/api/v1", "");
      const json = (v: unknown) => route.fulfill({ contentType: "application/json", headers: { "Access-Control-Allow-Origin": "http://localhost:5174", "Access-Control-Allow-Credentials": "true" }, body: JSON.stringify(v) });
      if (route.request().method() !== "GET") return route.fallback();
      if (path === "/categories") return json([CASES]);
      if (path === `/categories/${CASES.id}`) return json(CASES);
      if (path === `/categories/${CASES.id}/sub-categories`) return json([ART]);
      if (path === "/products") return json([MODEL]);
      return route.fallback();
    },
  );
  await seedDraft(page, CASES.id, { kind: "CASE", modelId: MODEL.id, elements: [{ id: "e1", kind: "image", x: 0.5, y: 0.5, scale: 2, rotation: 0, z: 1, aspect: 1, src: ART.imageUrl, ref: ART.id, name: "Blue" }] });
  return api;
}

/** RGBA of a point given as fractions of an image (PNG bytes). */
async function pixelAt(page: Page, image: Buffer, fx: number, fy: number) {
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

const isBlue = ([r, g, b]: number[]) => b > 200 && r < 60 && g < 60;

test("the camera opening is cut out of the design, in the studio and in the saved preview", async ({ page }) => {
  const api = await mockCases(page);
  await page.goto("/#/studios/cases/design");
  const phone = page.locator('[style*="aspect-ratio: 0.5"]').first();
  await expect(phone.locator("img").first()).toBeVisible();
  await page.waitForTimeout(500);
  const shot = await phone.screenshot({ path: "test-results/case-studio.png" });
  expect(isBlue(await pixelAt(page, shot, LENS.x, LENS.y))).toBe(false);
  expect(isBlue(await pixelAt(page, shot, 0.7, 0.6))).toBe(true);

  await page.goto("/#/studios/cases/preview");
  await page.getByRole("button", { name: "Save design" }).click();
  await expect(page.getByText("Saved to My Designs.")).toBeVisible();
  const body = api.calls.find((c) => c.method === "POST" && c.path === "/products")!.body!;
  const start = body.indexOf(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const end = body.indexOf(Buffer.from("IEND"), start) + 8;
  const preview = body.subarray(start, end);
  expect(isBlue(await pixelAt(page, preview, LENS.x, LENS.y))).toBe(false);
  expect(isBlue(await pixelAt(page, preview, 0.7, 0.6))).toBe(true);
});

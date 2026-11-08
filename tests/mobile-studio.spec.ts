import { deflateSync } from "node:zlib";
import { randomBytes } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { API, CATEGORY, IMG, mockApi, seedDraft } from "./mockApi";

/* Production bugs found on phones: Back loops into the studio, phone photos refused, and the
 * studio's picker squeezed into one row. These run on Desktop Chrome and Pixel 7. */

const json = (v: unknown) => ({
  contentType: "application/json",
  headers: { "Access-Control-Allow-Origin": "http://localhost:5174", "Access-Control-Allow-Credentials": "true" },
  body: JSON.stringify(v),
});

/** A PNG of random pixels (incompressible, so it is as large as a big phone photo). */
function noisePng(w: number, h: number) {
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
  const raw = randomBytes((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) raw[y * (w * 3 + 1)] = 0;
  const head = Buffer.alloc(13);
  head.writeUInt32BE(w, 0);
  head.writeUInt32BE(h, 4);
  head.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", head), chunk("IDAT", deflateSync(raw, { level: 0 })), chunk("IEND", Buffer.alloc(0))]);
}

const isPhone = () => test.info().project.name === "Pixel 7";

/* ------------------------------------------------------------------------------------------ */

const MUGS = { ...CATEGORY, id: "cat-mug", name: "Mugs", builderType: "MUG", sizes: [] };
const MUG_BLANK = {
  id: "mug-blank",
  name: "White Mug",
  categoryId: MUGS.id,
  origin: "COMPANY",
  price: 1200,
  stock: 20,
  isActive: true,
  imageUrl: null,
  printAreas: { front: { widthMm: 200, heightMm: 90, safeMm: { top: 5, right: 5, bottom: 5, left: 5 } } },
};
const UPLOAD = { id: "own", categoryId: MUGS.id, name: "Your own design", imageUrl: null, type: "CUSTOM_UPLOAD", price: 0, stock: 0, trackStock: false, isActive: true, sortOrder: 0 };

async function mockMugs(page: Page) {
  const api = await mockApi(page);
  await page.route(
    (url) => url.href.startsWith(API),
    async (route) => {
      const path = new URL(route.request().url()).pathname.replace("/api/v1", "");
      if (route.request().method() !== "GET") return route.fallback();
      if (path === "/categories") return route.fulfill(json([CATEGORY, MUGS]));
      if (path === `/categories/${MUGS.id}`) return route.fulfill(json(MUGS));
      if (path === `/categories/${MUGS.id}/sub-categories`) return route.fulfill(json([UPLOAD]));
      if (path === "/products" && new URL(route.request().url()).searchParams.get("categoryId") === MUGS.id) return route.fulfill(json([MUG_BLANK]));
      return route.fallback();
    },
  );
  return api;
}

const backButton = (page: Page) => (isPhone() ? page.getByRole("button", { name: "Back", exact: true }) : page.getByRole("link", { name: "All studios" }));

test.describe("Back never loops into the studio", () => {
  test("a studio without a first step (mugs): Back leaves it", async ({ page }) => {
    await mockMugs(page);
    await page.goto("/#/studios");
    await page.getByRole("link", { name: /Mugs/ }).first().click();
    await expect(page).toHaveURL(/#\/studios\/mugs\/design$/);
    const depth = await page.evaluate(() => history.length);

    if (isPhone()) {
      // Before: the arrow pushed #/studios/mugs, which redirected straight back into the studio.
      await backButton(page).click();
      await expect(page).toHaveURL(/#\/studios$/);
      expect(await page.evaluate(() => history.length)).toBe(depth);
    }
    await page.goto("/#/studios");
    await page.getByRole("link", { name: /Mugs/ }).first().click();
    await expect(page).toHaveURL(/#\/studios\/mugs\/design$/);
    await page.goBack();
    await expect(page).toHaveURL(/#\/studios$/);
  });

  test("opened from a link, the studio's Back goes to the studios without trapping the browser", async ({ page }) => {
    test.skip(!isPhone(), "the phone shell's back button");
    await mockMugs(page);
    await page.goto("/#/studios/mugs/design");
    await expect(page).toHaveURL(/#\/studios\/mugs\/design$/);
    await backButton(page).click();
    await expect(page).toHaveURL(/#\/studios$/);
  });

  test("bracelet: Studio → Preview → Back to the studio → Back, Back walks out, never through copies", async ({ page }) => {
    await mockApi(page);
    await seedDraft(page, CATEGORY.id, { kind: "JEWELRY", sizeId: "s-small", lengthMm: 160, pieces: ["onyx", "onyx"] });
    await page.goto("/#/studios");
    await page.getByRole("link", { name: /Bracelet/ }).first().click();
    await expect(page).toHaveURL(/#\/studios\/bracelet$/);
    await page.getByRole("link", { name: "Continue to the studio" }).click();
    await expect(page).toHaveURL(/#\/studios\/bracelet\/design$/);
    await page.getByRole("button", { name: /^Preview/ }).click();
    await expect(page).toHaveURL(/#\/studios\/bracelet\/preview$/);
    const depth = await page.evaluate(() => history.length);

    await page.getByRole("link", { name: "Back to the studio" }).first().click();
    await expect(page).toHaveURL(/#\/studios\/bracelet\/design$/);
    expect(await page.evaluate(() => history.length)).toBe(depth);

    await page.goBack();
    await expect(page).toHaveURL(/#\/studios\/bracelet$/);
    await page.goBack();
    await expect(page).toHaveURL(/#\/studios$/);
    // Forward still works and lands on the real pages.
    await page.goForward();
    await expect(page).toHaveURL(/#\/studios\/bracelet$/);
  });

  test("phone: the studio's Back returns to the first step it came from", async ({ page }) => {
    test.skip(!isPhone(), "the phone shell's back button");
    await mockApi(page);
    await seedDraft(page, CATEGORY.id, { kind: "JEWELRY", sizeId: "s-small", lengthMm: 160, pieces: [] });
    await page.goto("/#/studios/bracelet");
    await page.getByRole("link", { name: "Continue to the studio" }).click();
    await expect(page).toHaveURL(/design$/);
    await backButton(page).click();
    await expect(page).toHaveURL(/#\/studios\/bracelet$/);
    await page.goForward();
    await expect(page).toHaveURL(/design$/);
  });
});

/* ------------------------------------------------------------------------------------------ */

test.describe("Phone photos", () => {
  test("a photo over 5 MB is resized to fit, placed, and saved under the API limit", async ({ page }) => {
    const api = await mockMugs(page);
    await page.goto("/#/studios/mugs/design");
    const big = noisePng(1800, 1800);
    expect(big.length).toBeGreaterThan(5 * 1024 * 1024);
    const input = page.locator('input[type="file"]');
    await expect(input).toHaveAttribute("accept", "image/*");
    await input.setInputFiles({ name: "IMG_0001.png", mimeType: "image/png", buffer: big });
    await expect(page.getByText(/Image added|on the mug/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("alert")).toHaveCount(0);

    await page.getByRole("button", { name: isPhone() ? "Save design" : "Save design" }).first().click();
    await expect(page.getByText("Saved to My Designs.")).toBeVisible();
    const body = api.calls.find((c) => c.method === "POST" && c.path === "/products")!.body!;
    const part = body.indexOf(Buffer.from('name="customDesigns"'));
    expect(part).toBeGreaterThan(0);
    const start = body.indexOf(Buffer.from("\r\n\r\n"), part) + 4;
    const end = body.indexOf(Buffer.from("\r\n--"), start);
    expect(end - start).toBeLessThanOrEqual(5 * 1024 * 1024);
  });

  test("a photo with no MIME type is recognised by its bytes; HEIC the browser can't open gets a clear message", async ({ page }) => {
    await mockMugs(page);
    await page.goto("/#/studios/mugs/design");
    const input = page.locator('input[type="file"]');

    const heic = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypheic"), Buffer.alloc(64)]);
    await input.setInputFiles({ name: "IMG_0002.HEIC", mimeType: "image/heic", buffer: heic });
    await expect(page.getByRole("alert")).toContainText("HEIC");

    await input.setInputFiles({ name: "photo", mimeType: "", buffer: noisePng(120, 90) });
    // (A small photo still gets the "may appear blurry" print warning; the error is gone.)
    await expect(page.getByRole("alert").filter({ hasText: "HEIC" })).toHaveCount(0);
    await expect(page.getByText(/Image added|on the mug/i).first()).toBeVisible();
  });

  test("the same photo can be chosen again after removing it", async ({ page }) => {
    await mockMugs(page);
    await page.goto("/#/studios/mugs/design");
    const file = { name: "same.png", mimeType: "image/png", buffer: noisePng(200, 200) };
    await page.locator('input[type="file"]').setInputFiles(file);
    await expect(page.getByText(/Image added|on the mug/i).first()).toBeVisible();
    await page.getByRole("button", { name: "Clear all" }).click();
    await expect(page.getByText("Design cleared.").or(page.getByText(/cleared/i)).first()).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles(file);
    await expect(page.getByText(/Image added|on the mug/i).first()).toBeVisible();
  });

  test("EXIF rotation is read so sideways selfies are redrawn upright", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    const orientation = await page.evaluate(async () => {
      const { jpegOrientation } = await import("/src/studio/imageFile.ts");
      // SOI, APP1 "Exif\0\0", big-endian TIFF with one IFD entry: Orientation (0x0112) = 6.
      const bytes = [0xff, 0xd8, 0xff, 0xe1, 0x00, 0x22, 0x45, 0x78, 0x69, 0x66, 0, 0, 0x4d, 0x4d, 0, 0x2a, 0, 0, 0, 8, 0, 1, 0x01, 0x12, 0, 3, 0, 0, 0, 1, 0, 6, 0, 0, 0, 0, 0, 0, 0xff, 0xd9];
      return jpegOrientation(new Blob([new Uint8Array(bytes)]));
    });
    expect(orientation).toBe(6);
  });
});

/* ------------------------------------------------------------------------------------------ */

test.describe("Phone studio drawer", () => {
  test.skip(() => !isPhone(), "phones only");

  test("opens, closes and expands without touching the design", async ({ page }) => {
    await mockApi(page);
    await seedDraft(page, CATEGORY.id, { kind: "JEWELRY", sizeId: "s-small", lengthMm: 160, pieces: ["amber"] });
    await page.goto("/#/studios/bracelet/design");
    const drawer = page.getByRole("region", { name: "Add to your design" });
    await expect(drawer).toBeVisible();
    const toggle = drawer.getByRole("button", { expanded: true });
    await expect(page.getByRole("button", { name: /^Add Amber/ })).toBeVisible();

    await page.getByRole("button", { name: /^Add Amber/ }).click();
    await expect(page.getByText("2 components")).toBeVisible();

    const stage = page.getByRole("region", { name: /Bracelet with/ });
    const before = (await stage.boundingBox())!.height;
    await toggle.click();
    await expect(drawer.getByRole("button", { expanded: false })).toBeVisible();
    await expect.poll(async () => (await stage.boundingBox())!.height).toBeGreaterThan(before + 80);
    await expect(page.getByText("2 components")).toBeVisible();

    await drawer.getByRole("button", { expanded: false }).click();
    await drawer.getByRole("button", { name: "Show more items" }).click();
    await expect(drawer.getByRole("button", { name: "Show less" })).toBeVisible();
    // Adding from the full drawer drops it to half, so the result is visible.
    await page.getByRole("button", { name: /^Add Amber/ }).click();
    await expect(drawer.getByRole("button", { name: "Show more items" })).toBeVisible();
    await expect(page.getByText("3 components")).toBeVisible();
  });

  for (const width of [320, 360, 375, 390, 393, 414, 430]) {
    test(`fits a ${width}px phone: no sideways scroll, drawer and Preview on screen`, async ({ page }) => {
      await page.setViewportSize({ width, height: Math.round(width * 2.05) });
      await mockApi(page);
      await seedDraft(page, CATEGORY.id, { kind: "JEWELRY", sizeId: "s-small", lengthMm: 160, pieces: ["amber"] });
      await page.goto("/#/studios/bracelet/design");
      const drawer = page.getByRole("region", { name: "Add to your design" });
      await expect(drawer).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const vh = page.viewportSize()!.height;
      const preview = (await page.getByRole("button", { name: /^Preview/ }).boundingBox())!;
      expect(preview.y + preview.height).toBeLessThanOrEqual(vh);
      const tile = (await page.getByRole("button", { name: /^Add Amber/ }).boundingBox())!;
      expect(tile.y + tile.height).toBeLessThanOrEqual(vh);
      expect(tile.width).toBeGreaterThanOrEqual(44);
      const stage = (await page.getByRole("region", { name: /Bracelet with/ }).boundingBox())!;
      expect(stage.height).toBeGreaterThan(150);
    });
  }
});

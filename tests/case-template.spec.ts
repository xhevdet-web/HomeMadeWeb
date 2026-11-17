import { expect, test, type Page } from "@playwright/test";
import { API, IMG, mockApi, seedDraft } from "./mockApi";
import { isBlue, pixelAt, png, previewPng } from "./pngKit";

/*
 * The case template drives the customer studio: per-corner radii, a camera that reaches past
 * the printable edge, bleed (artwork covers it automatically) and the safe-area guide, which
 * shows while editing and is never part of the saved preview.
 */

const TEMPLATE = png(200, 400, () => [255, 255, 255, 255]);
const BLUE = png(40, 40, () => [0, 0, 255, 255]);

const CASES = { id: "cat-case", name: "Cases", description: null, imageUrl: null, isActive: true, sortOrder: 1, builderType: "CASE", builderConfig: null, designCategoryId: null, sizes: [] };
const FRONT = { x: 0.1, y: 0.02, width: 0.8, height: 0.96 };
const ADVANCED = {
  front: { ...FRONT, radius: 0.45, radii: { tl: 0.45, tr: 0, br: 0.45, bl: 0 }, bleed: 0.05, safe: { top: 0.25, right: 0.08, bottom: 0.08, left: 0.08 } },
  // Reaches past the printable area's left edge (x 0.1): artwork must not show there either.
  camera: { x: 0.02, y: 0.06, width: 0.3, height: 0.12, radius: 0.1 },
};
const LEGACY = {
  front: { x: 0.04, y: 0.02, width: 0.92, height: 0.96, radius: 0.14 },
  camera: { x: 0.1, y: 0.03, width: 0.4, height: 0.15, radius: 0.2 },
};
const model = (id: string, printAreas: unknown) => ({
  id,
  name: `Phone ${id}`,
  categoryId: CASES.id,
  origin: "COMPANY",
  price: 1500,
  stock: 5,
  isActive: true,
  deviceBrand: "APPLE",
  imageUrl: `${IMG}/template.png`,
  printAreas,
});
const NEW_MODEL = model("m-new", ADVANCED);
const OLD_MODEL = model("m-old", LEGACY);
const ART = { id: "art", categoryId: CASES.id, name: "Blue", imageUrl: `${IMG}/blue.png`, type: null, price: 0, stock: 50, trackStock: false, isActive: true, sortOrder: 1 };
const placed = { x: 0.45, y: 0.55, scale: 1.3, rotation: 0 };
const saved = (id: string, base: ReturnType<typeof model>) => ({
  id,
  origin: "CUSTOMER",
  name: "Custom case",
  categoryId: CASES.id,
  category: CASES,
  baseProductId: base.id,
  baseProduct: base,
  price: 1500,
  isActive: true,
  items: [{ id: `${id}-item`, subCategoryId: ART.id, subCategory: ART, quantity: 1, position: 0, unitPrice: 0, ...placed }],
});

async function mockCases(page: Page, draft: unknown) {
  const api = await mockApi(page);
  await page.route(`${IMG}/template.png*`, (r) => r.fulfill({ contentType: "image/png", body: TEMPLATE, headers: { "Access-Control-Allow-Origin": "*" } }));
  await page.route(`${IMG}/blue.png*`, (r) => r.fulfill({ contentType: "image/png", body: BLUE, headers: { "Access-Control-Allow-Origin": "*" } }));
  const designs: Record<string, unknown> = { "d-old": saved("d-old", OLD_MODEL), "d-new": saved("d-new", NEW_MODEL) };
  await page.route(
    (url) => url.href.startsWith(API),
    async (route) => {
      const path = new URL(route.request().url()).pathname.replace("/api/v1", "");
      const json = (v: unknown) => route.fulfill({ contentType: "application/json", headers: { "Access-Control-Allow-Origin": "http://localhost:5174", "Access-Control-Allow-Credentials": "true" }, body: JSON.stringify(v) });
      if (route.request().method() !== "GET") return route.fallback();
      if (path === "/categories") return json([CASES]);
      if (path === `/categories/${CASES.id}`) return json(CASES);
      if (path === `/categories/${CASES.id}/sub-categories`) return json([ART]);
      if (path === "/products") return json([NEW_MODEL, OLD_MODEL]);
      const one = path.match(/^\/products\/([^/]+)$/);
      if (one && designs[one[1]]) return json(designs[one[1]]);
      return route.fallback();
    },
  );
  if (draft) await seedDraft(page, CASES.id, draft);
  return api;
}

const blueDraft = (modelId: string) => ({
  kind: "CASE",
  modelId,
  elements: [{ id: "e1", kind: "image", x: 0.5, y: 0.5, scale: 3, rotation: 0, z: 1, aspect: 1, src: ART.imageUrl, ref: ART.id, name: "Blue" }],
});
const phone = (page: Page) => page.locator('[style*="aspect-ratio: 0.5"]').first();
const savedItems = (api: Awaited<ReturnType<typeof mockApi>>) => {
  const body = api.calls.find((c) => c.method === "POST" && c.path === "/products")!.body!.toString("latin1");
  return JSON.parse(body.match(/name="items"\r\n\r\n([^\r]*)\r\n/)![1]) as Record<string, number>[];
};
async function saveFromPreview(page: Page) {
  await page.goto("/#/studios/cases/preview");
  await page.getByRole("button", { name: "Save design" }).click();
  await expect(page.getByText("Saved to My Designs.")).toBeVisible();
}

// Points as fractions of the whole case template.
const CORNER_TL = [FRONT.x + 0.015, FRONT.y + 0.008]; // inside the box, outside the big top-left curve
const CORNER_TR = [FRONT.x + FRONT.width - 0.015, FRONT.y + 0.008]; // square top-right corner
const CAMERA_OUTSIDE = [0.05, 0.12]; // camera, left of the printable edge
const CAMERA_INSIDE = [0.25, 0.12];
const MIDDLE = [0.6, 0.6];
const SAFE_LEFT_LINE = [FRONT.x + 0.08 * FRONT.width, 0.6];

test("per-corner radii and a camera past the printable edge clip the artwork, in the studio and the saved preview", async ({ page }) => {
  const api = await mockCases(page, blueDraft(NEW_MODEL.id));
  await page.goto("/#/studios/cases/design");
  await expect(phone(page).locator("img").first()).toBeVisible();
  await page.waitForTimeout(500);
  const shot = await phone(page).screenshot();
  const at = (p: number[]) => pixelAt(page, shot, p[0], p[1]);
  expect(isBlue(await at(CORNER_TL))).toBe(false);
  expect(isBlue(await at(CORNER_TR))).toBe(true);
  expect(isBlue(await at(CAMERA_OUTSIDE))).toBe(false);
  expect(isBlue(await at(CAMERA_INSIDE))).toBe(false);
  expect(isBlue(await at(MIDDLE))).toBe(true);
  // The safe area guide is shown while editing.
  await expect(page.locator("[data-case-safe]")).toHaveCount(1);
  await expect(page.getByText("inside the dotted area")).toBeVisible();

  await saveFromPreview(page);
  // The preview page never shows guides, and the saved PNG has none either.
  await expect(page.locator("[data-case-guides]")).toHaveCount(0);
  const preview = previewPng(api.calls.find((c) => c.method === "POST" && c.path === "/products")!.body!);
  const px = (p: number[]) => pixelAt(page, preview, p[0], p[1]);
  expect(isBlue(await px(CORNER_TL))).toBe(false);
  expect(isBlue(await px(CORNER_TR))).toBe(true);
  expect(isBlue(await px(CAMERA_OUTSIDE))).toBe(false);
  expect(isBlue(await px(CAMERA_INSIDE))).toBe(false);
  expect(isBlue(await px(SAFE_LEFT_LINE))).toBe(true);
});

test("a new design covers the bleed automatically: its saved scale reaches past the printable edge", async ({ page }) => {
  const api = await mockCases(page, { kind: "CASE", modelId: NEW_MODEL.id, elements: [] });
  await page.goto("/#/studios/cases/design");
  await page.getByRole("button", { name: /Blue/ }).first().click();
  await expect(page.getByText("Blue is on your case.")).toBeVisible();
  await saveFromPreview(page);
  // Printable area 0.8 × 0.96 of a 1:2 template: height ÷ width 2.4. A square image covers it at
  // 2.4 widths; with 5% bleed on every side it needs 2.4 + 2 × 0.05 = 2.5, i.e. API scale 2.5 / 2.4.
  // (The layer's whole-pixel size can add a few tenths of a percent.)
  const [item] = savedItems(api);
  expect(item.scale).toBeGreaterThan(2.5 / 2.4 - 0.001);
  expect(item.scale).toBeLessThan(2.5 / 2.4 + 0.01);
  expect(item.x).toBeCloseTo(0.5, 3);
  expect(item.y).toBeCloseTo(0.5, 3);
});

test("Smaller and Larger zoom the design out until it all shows and in up to 5× the cover size", async ({ page }) => {
  const api = await mockCases(page, { kind: "CASE", modelId: NEW_MODEL.id, elements: [] });
  await page.goto("/#/studios/cases/design");
  await page.getByRole("button", { name: /Blue/ }).first().click();
  await expect(page.getByText("Blue is on your case.")).toBeVisible();
  const scale = () => page.evaluate(() => JSON.parse(localStorage.getItem("hc.drafts.v1")!)["cat-case"].draft.elements[0].scale as number);
  const larger = page.getByRole("button", { name: "Larger", exact: true });
  const smaller = page.getByRole("button", { name: "Smaller", exact: true });
  const start = await scale();
  await larger.click();
  await expect.poll(scale).toBeGreaterThan(start);
  // A square design on a 0.8 × 0.96 area (height ÷ width 2.4) covers it at 2.4 widths: at most 5×.
  for (let i = 0; i < 25; i++) await larger.click();
  await expect.poll(scale).toBeCloseTo(5 * 2.4, 2);
  // Out until the whole design shows: at the area's width.
  for (let i = 0; i < 30; i++) await smaller.click();
  await expect.poll(scale).toBeCloseTo(1, 3);
  // Uncovered parts show the case itself (its template), not a white fill.
  await expect(page.locator("[data-case-area] > div").first()).not.toHaveClass(/bg-white/);
  await saveFromPreview(page);
  expect(savedItems(api)[0].scale).toBeCloseTo(1 / 2.4, 3);
});

for (const [id, label] of [
  ["d-old", "saved before bleed, safe area and corners existed"],
  ["d-new", "saved on a template with bleed, safe area and corners"],
] as const) {
  test(`a case design ${label} reopens with its model and placement`, async ({ page }) => {
    const api = await mockCases(page, null);
    await page.goto(`/#/studios/cases/design?load=${id}`);
    await expect(page.getByText(id === "d-old" ? OLD_MODEL.name : NEW_MODEL.name).first()).toBeVisible();
    await expect(phone(page).locator("img").first()).toBeVisible();
    await page.waitForTimeout(300);
    await saveFromPreview(page);
    const [item] = savedItems(api);
    expect(item).toMatchObject({ subCategoryId: ART.id, quantity: 1, rotation: placed.rotation });
    expect(item.x).toBeCloseTo(placed.x, 3);
    expect(item.y).toBeCloseTo(placed.y, 3);
    expect(item.scale).toBeCloseTo(placed.scale, 3);
  });
}

test.describe("phone widths", () => {
  for (const width of [320, 360, 375, 390, 393, 414, 430]) {
    test(`the template keeps its shape and geometry at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await mockCases(page, blueDraft(NEW_MODEL.id));
      await page.goto("/#/studios/cases/design");
      await expect(phone(page).locator("img").first()).toBeVisible();
      await page.waitForTimeout(800);
      // One read of every box, so an entry animation can't skew them against each other.
      const [box, area, safe] = await page.evaluate(() => {
        const root = document.querySelector('[style*="aspect-ratio: 0.5"]')!;
        return [root, root.querySelector("[data-case-area]")!, root.querySelector("[data-case-safe] path")!].map((e) => e.getBoundingClientRect().toJSON() as DOMRect);
      });
      expect(box.height / box.width).toBeCloseTo(2, 1);
      expect((area.x - box.x) / box.width).toBeCloseTo(FRONT.x, 2);
      expect(area.width / box.width).toBeCloseTo(FRONT.width, 2);
      expect((area.y - box.y) / box.height).toBeCloseTo(FRONT.y, 2);
      expect(area.height / box.height).toBeCloseTo(FRONT.height, 2);
      // The safe area keeps its share of the case at every width.
      expect((safe.x - box.x) / box.width).toBeCloseTo(SAFE_LEFT_LINE[0], 2);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }
});

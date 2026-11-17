import { expect, test, type Page } from "@playwright/test";
import { API, IMG, mockApi, seedDraft } from "./mockApi";
import { isBlue, pixelAt, png } from "./pngKit";

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

import { expect, test, type Page } from "@playwright/test";
import { API, CATEGORY, IMG, mockApi, seedDraft } from "./mockApi";

/*
 * Cases, stickers and apparel share the mug studio's side panel: Designs / Photo (Upload) / Text
 * tabs and the design library with its type filter, search and compact tiles.
 */
const json = (v: unknown) => ({
  contentType: "application/json",
  headers: { "Access-Control-Allow-Origin": "http://localhost:5174", "Access-Control-Allow-Credentials": "true" },
  body: JSON.stringify(v),
});

const category = (id: string, name: string, builderType: string, extra: object = {}) => ({ ...CATEGORY, id, name, builderType, builderConfig: null, sizes: [], ...extra });
const component = (categoryId: string, id: string, name: string, type: string, price = 0) => ({
  id,
  categoryId,
  name,
  imageUrl: type === "CUSTOM_UPLOAD" ? null : IMG,
  type,
  price,
  stock: 0,
  trackStock: false,
  isActive: true,
  sortOrder: 0,
});
const NAMES = ["Sip smile repeat", "Coffee and Cats", "Pour yourself happiness", "Best mom ever", "Mountain morning", "But first coffee", "Cosmic cat", "Good vibes", "Sunflower"];
const TYPES = ["LETTERING", "ILLUSTRATION", "ICON"];
const library = (categoryId: string) => [
  component(categoryId, "own", "Your own design", "CUSTOM_UPLOAD"),
  ...NAMES.map((n, i) => component(categoryId, `${categoryId}-d${i}`, n, TYPES[i % 3], i === 0 ? 100 : 0)),
];
const product = (id: string, categoryId: string, printAreas: unknown) => ({
  id,
  name: "Base",
  categoryId,
  origin: "COMPANY",
  price: 1500,
  stock: 20,
  isActive: true,
  imageUrl: null,
  printAreas,
});

const CASES = category("cat-case", "Cases", "CASE");
const STICKERS = category("cat-sticker", "Stickers", "STICKER", { sizes: [{ id: "sq5", name: "Square 5", shape: "SQUARE", widthMm: 50, heightMm: 50, price: 200 }] });
const HOODIES = category("cat-hoodie", "Hoodies", "APPAREL");
const STUDIOS = [
  { cat: CASES, slug: "cases", products: [product("m1", CASES.id, { front: { x: 0.1, y: 0.02, width: 0.8, height: 0.96 } })], draft: { kind: "CASE", modelId: "m1", elements: [] }, tabs: ["Designs", "Photo"] },
  { cat: STICKERS, slug: "stickers", products: [], draft: { kind: "STICKER", sizeId: "sq5", designs: [{ id: "s1", image: null, quantity: 10 }] }, tabs: ["Designs", "Photo"] },
  { cat: HOODIES, slug: "hoodies", products: [product("h1", HOODIES.id, null)], draft: { kind: "APPAREL", baseProductId: "h1", size: null, front: [], back: [] }, tabs: ["Designs", "Upload", "Text"] },
];

async function mockStudio(page: Page, s: (typeof STUDIOS)[number]) {
  await mockApi(page);
  await page.route(
    (url) => url.href.startsWith(API),
    async (route) => {
      const url = new URL(route.request().url());
      const path = url.pathname.replace("/api/v1", "");
      if (route.request().method() !== "GET") return route.fallback();
      if (path === "/categories") return route.fulfill(json([CATEGORY, s.cat]));
      if (path === `/categories/${s.cat.id}`) return route.fulfill(json(s.cat));
      if (path === `/categories/${s.cat.id}/sub-categories`) return route.fulfill(json(library(s.cat.id)));
      if (path === "/products" && url.searchParams.get("categoryId") === s.cat.id) return route.fulfill(json(s.products));
      return route.fallback();
    },
  );
  await seedDraft(page, s.cat.id, s.draft);
}

for (const s of STUDIOS) {
  test(`${s.cat.name}: tabs, type filter, search and compact tiles`, async ({ page }) => {
    await mockStudio(page, s);
    await page.goto(`/#/studios/${s.slug}/design`);
    const tabs = page.getByRole("tablist", { name: "Add to your design" });
    await expect(tabs.getByRole("tab")).toHaveText(s.tabs);
    await expect(tabs.getByRole("tab", { name: /Designs/ })).toHaveAttribute("aria-selected", "true");

    const designs = page.getByRole("tabpanel").filter({ has: page.getByRole("group", { name: "Design type" }) });
    const tiles = designs.locator("button.no-callout");
    await expect(tiles).toHaveCount(9);
    const heights = await tiles.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
    expect(new Set(heights).size).toBe(1);

    await designs.getByRole("button", { name: /Illustrations/ }).click();
    await expect(tiles).toHaveCount(3);
    await designs.getByRole("searchbox", { name: "Search designs" }).fill("mountain");
    await expect(tiles).toHaveCount(1);
    await designs.getByRole("searchbox", { name: "Search designs" }).fill("");
    await designs.getByRole("button", { name: /^All/ }).click();
    await page.screenshot({ path: `test-results/panel-${s.slug}-${test.info().project.name.replace(/\s/g, "")}.png` });

    await tiles.nth(1).click();
    await expect(tiles.nth(1)).toHaveAttribute(s.slug === "hoodies" ? "aria-label" : "aria-pressed", s.slug === "hoodies" ? /Added/ : "true");

    await tabs.getByRole("tab", { name: s.slug === "hoodies" ? /Upload/ : /Photo/ }).click();
    await expect(designs).toBeHidden();
    await expect(page.locator('input[type="file"]')).toHaveCount(1);
  });
}

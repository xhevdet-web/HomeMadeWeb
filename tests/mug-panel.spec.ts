import { expect, test, type Page } from "@playwright/test";
import { API, CATEGORY, IMG, mockApi } from "./mockApi";

/*
 * The mug studio's side panel: Designs / Photo / Text tabs, the design library's type filter and
 * search, and compact tiles that stay square whatever the picture's shape.
 */
const json = (v: unknown) => ({
  contentType: "application/json",
  headers: { "Access-Control-Allow-Origin": "http://localhost:5174", "Access-Control-Allow-Credentials": "true" },
  body: JSON.stringify(v),
});

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
const component = (id: string, name: string, type: string, price = 0) => ({
  id,
  categoryId: MUGS.id,
  name,
  imageUrl: id === "own" ? null : IMG,
  type,
  price,
  stock: 0,
  trackStock: false,
  isActive: true,
  sortOrder: 0,
});
const NAMES = ["Sip smile repeat", "Coffee and Cats", "Pour yourself happiness", "Best mom ever", "Mountain morning", "But first coffee", "Cosmic cat", "Good vibes", "Sunflower"];
const TYPES = ["LETTERING", "ILLUSTRATION", "ICON"];
const DESIGNS = NAMES.map((n, i) => component(`d${i}`, n, TYPES[i % 3], i === 0 ? 100 : 0));

async function mockMugs(page: Page, designs = DESIGNS) {
  await mockApi(page);
  await page.route(
    (url) => url.href.startsWith(API),
    async (route) => {
      const path = new URL(route.request().url()).pathname.replace("/api/v1", "");
      if (route.request().method() !== "GET") return route.fallback();
      if (path === "/categories") return route.fulfill(json([CATEGORY, MUGS]));
      if (path === `/categories/${MUGS.id}`) return route.fulfill(json(MUGS));
      if (path === `/categories/${MUGS.id}/sub-categories`) return route.fulfill(json([component("own", "Your own design", "CUSTOM_UPLOAD"), ...designs]));
      if (path === "/products" && new URL(route.request().url()).searchParams.get("categoryId") === MUGS.id) return route.fulfill(json([MUG_BLANK]));
      return route.fallback();
    },
  );
}

const tiles = (page: Page) => page.getByRole("tabpanel", { name: "Our designs" }).locator("button.no-callout");

test("designs open first; the type filter and search narrow the library", async ({ page }) => {
  await mockMugs(page);
  await page.goto("/#/studios/mugs/design");
  await expect(page.getByRole("tab", { name: /Designs/ })).toHaveAttribute("aria-selected", "true");
  await expect(tiles(page)).toHaveCount(9);

  const filters = page.getByRole("group", { name: "Design type" });
  await expect(filters.getByRole("button")).toHaveText(["All9", "Lettering3", "Illustrations3", "Icons3"]);
  await filters.getByRole("button", { name: /Lettering/ }).click();
  await expect(tiles(page)).toHaveCount(3);
  await expect(filters.getByRole("button", { name: /Lettering/ })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("searchbox", { name: "Search designs" }).fill("cat");
  await expect(tiles(page)).toHaveCount(1);
  await expect(tiles(page).first()).toHaveAccessibleName(/Cosmic cat/);
  await page.getByRole("searchbox", { name: "Search designs" }).fill("zebra");
  await expect(page.getByText("No designs match.")).toBeVisible();
});

test("compact tiles are all the same size, with the price on the picture", async ({ page }) => {
  await mockMugs(page);
  await page.goto("/#/studios/mugs/design");
  await expect(tiles(page)).toHaveCount(9);
  const sizes = await tiles(page).evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)));
  expect(new Set(sizes).size).toBe(1);
  await expect(tiles(page).first()).toContainText("+€1.00");
});

test("a short library has no filter or search", async ({ page }) => {
  await mockMugs(page, DESIGNS.slice(0, 2).map((d) => ({ ...d, type: "LETTERING" })));
  await page.goto("/#/studios/mugs/design");
  await expect(tiles(page)).toHaveCount(2);
  await expect(page.getByRole("group", { name: "Design type" })).toHaveCount(0);
  await expect(page.getByRole("searchbox")).toHaveCount(0);
});

test("Photo and Text tabs; a picked design lands on the mug", async ({ page }) => {
  await mockMugs(page);
  await page.goto("/#/studios/mugs/design");
  await tiles(page).nth(1).click();
  await expect(page.getByText(/on your mug/i).first()).toBeVisible();
  await expect(tiles(page).nth(1)).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("tab", { name: /Photo/ }).click();
  await expect(page.getByRole("tabpanel", { name: "Your image" })).toBeVisible();
  await expect(page.getByRole("tabpanel", { name: "Our designs" })).toBeHidden();

  await page.getByRole("tab", { name: /Text/ }).click();
  const text = page.getByRole("tabpanel", { name: "Text" });
  await expect(text).toBeVisible();
  if (test.info().project.name !== "Pixel 7") {
    await text.getByRole("textbox").fill("Hello");
    await text.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("tab", { name: /Text/ })).toContainText("1");
  }
});

import { expect, test, type Page } from "@playwright/test";
import { IMG, mockApi, seedDraft } from "./mockApi";

const cors = { "Access-Control-Allow-Origin": "http://localhost:5174", "Access-Control-Allow-Credentials": "true" };

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
const FRONT = { x: 0.04, y: 0.02, width: 0.92, height: 0.96, radius: 0.14 };
const model = (id: string, name: string, brand: string, price: number) => ({
  id,
  name,
  categoryId: CASES.id,
  origin: "COMPANY",
  price,
  stock: 5,
  isActive: true,
  deviceBrand: brand,
  imageUrl: `${IMG}/${id}.png`,
  baseProductId: null,
  printAreas: { front: FRONT },
  createdAt: "2026-01-01T00:00:00.000Z",
});
const IPHONE = model("m-1", "iPhone 15", "APPLE", 1800);
const GALAXY = model("m-2", "Galaxy S24", "SAMSUNG", 1700);
const readyCase = (stock: number) => ({
  id: "r-1",
  name: "iPhone 15 Marble",
  categoryId: CASES.id,
  origin: "COMPANY",
  price: 2700,
  stock,
  isActive: true,
  imageUrl: `${IMG}/marble.png`,
  baseProductId: IPHONE.id,
  baseProduct: { id: IPHONE.id, name: IPHONE.name, deviceBrand: "APPLE", imageUrl: IPHONE.imageUrl, printAreas: IPHONE.printAreas, isActive: true },
  printAreas: null,
  createdAt: "2026-02-01T00:00:00.000Z",
});

/** The CASE category with two phone models and one ready-made case. `paging: false` is an API without server-side paging. */
async function open(page: Page, path: string, { stock = 2, paging = true }: { stock?: number; paging?: boolean } = {}) {
  await mockApi(page, { user: null });
  const products = [IPHONE, GALAXY, readyCase(stock)];
  await page.route(/\/api\/v1\/categories$/, (r) => r.fulfill({ json: [CASES], headers: cors }));
  await page.route(/\/api\/v1\/categories\/cat-case$/, (r) => r.fulfill({ json: CASES, headers: cors }));
  await page.route(/\/api\/v1\/products(\?|$)/, (r) => {
    if (r.request().method() !== "GET") return r.fallback();
    if (!paging && new URL(r.request().url()).searchParams.has("page"))
      return r.fulfill({ status: 400, json: { statusCode: 400, message: ["property page should not exist"] }, headers: cors });
    return r.fulfill({ json: products, headers: cors });
  });
  await page.goto(path);
}

const readySection = (page: Page) => page.locator("section[aria-labelledby=ready-title]");

test("step 1 lists only phone models; the ready-made case is sold under “Or pick one we made.”", async ({ page }) => {
  await open(page, "/#/studios/cases");
  const models = page.getByRole("radiogroup", { name: "Phone model" });
  await expect(models).toBeVisible();
  // Apple first; switching brand shows the other model. The ready-made case is never a model.
  await expect(models.getByRole("radio")).toHaveCount(1);
  await expect(models.getByRole("radio", { name: /iPhone 15/ })).toBeVisible();
  await expect(models.getByRole("radio", { name: /Marble/ })).toHaveCount(0);
  await page.getByRole("tab", { name: "Samsung" }).click();
  await expect(models.getByRole("radio")).toHaveCount(1);
  await expect(models.getByRole("radio", { name: /Galaxy S24/ })).toBeVisible();

  const section = readySection(page);
  await expect(section.getByRole("heading", { name: "Or pick one we made." })).toBeVisible();
  const card = section.getByRole("listitem");
  await expect(card).toHaveCount(1);
  await expect(card).toContainText("iPhone 15 Marble");
  await expect(card).toContainText("Fits iPhone 15");
  await expect(card).toContainText("€27");
  await expect(card).not.toContainText("from €27");
  await expect(card).not.toContainText("Made to order");
  await expect(card.getByRole("link", { name: "Order" })).toHaveAttribute("href", "#/checkout?product=r-1");
});

test("a sold-out ready-made case offers the notify action", async ({ page }) => {
  await open(page, "/#/studios/cases", { stock: 0 });
  const card = readySection(page).getByRole("listitem");
  await expect(card).toContainText("Sold out");
  await expect(card.getByRole("link", { name: "Tell me about a similar one" })).toHaveAttribute("href", /#\/contact\?produkti=/);
});

test("the products page (in-browser fallback) lists the ready-made case as ready-made, the models as made to order", async ({ page }) => {
  await open(page, "/#/products?lloji=gatshme", { paging: false });
  const cards = page.locator("article").filter({ has: page.locator("h3") });
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText("iPhone 15 Marble");
  await expect(cards.first().getByRole("link", { name: "Order" })).toHaveAttribute("href", "#/checkout?product=r-1");

  await page.goto("/#/products?lloji=porosi");
  await expect(cards).toHaveCount(2);
  await expect(cards.filter({ hasText: "iPhone 15 Marble" })).toHaveCount(0);
  await expect(cards.first()).toContainText("Made to order");
});

test("a draft pointing at the ready-made case counts as no model chosen", async ({ page }) => {
  await seedDraft(page, CASES.id, { kind: "CASE", modelId: "r-1", elements: [] });
  await open(page, "/#/studios/cases");
  await expect(page.getByRole("radiogroup", { name: "Phone model" }).getByRole("radio", { checked: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Choose a phone model" })).toBeDisabled();
});

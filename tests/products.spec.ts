import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { CATEGORY, mockApi } from "./mockApi";

const cors = { "Access-Control-Allow-Origin": "http://localhost:5174", "Access-Control-Allow-Credentials": "true" };
const PNG = readFileSync("public/brand/favicon.png");

const MUGS = { ...CATEGORY, id: "cat-m", name: "Mugs", builderType: "MUG", sortOrder: 2 };
const CASES = { ...CATEGORY, id: "cat-c", name: "Phone Cases", builderType: "CASE", sortOrder: 3 };
let n = 0;
const product = (categoryId: string, name: string, price: number, extra: Record<string, unknown> = {}) => ({
  id: `p${++n}`,
  name,
  price,
  stock: 5,
  categoryId,
  origin: "COMPANY",
  isActive: true,
  imageUrl: `http://shots.test/${n}.png`,
  createdAt: new Date(Date.UTC(2026, 0, n)).toISOString(),
  ...extra,
});
// 10 bracelets (one sold out), a ready mug, the blank mug (print area) and two phone case models.
const PRODUCTS = [
  ...Array.from({ length: 9 }, (_, i) => product(CATEGORY.id, `Bracelet ${i + 1}`, 1500 + i * 100, { description: "Onyx beads" })),
  product(CATEGORY.id, "Tigger tooth", 350000, { stock: 0 }),
  product(MUGS.id, "Bird mug", 1200),
  product(MUGS.id, "Blank mug", 900, { printAreas: { front: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 } } }),
  product(CASES.id, "iPhone 15", 1800),
  product(CASES.id, "Galaxy S24", 1700),
];

type Handler = Parameters<Page["route"]>[1];
const arrayApi: Handler = (r) => (r.request().method() === "GET" ? r.fulfill({ json: PRODUCTS, headers: cors }) : r.fallback());

async function open(page: Page, path = "/#/products", products: Handler = arrayApi) {
  await mockApi(page, { language: "sq", user: null });
  await page.route("http://shots.test/**", (r) => r.fulfill({ contentType: "image/png", body: PNG, headers: { "Access-Control-Allow-Origin": "*" } }));
  await page.route(/\/api\/v1\/categories$/, (r) => r.fulfill({ json: [CATEGORY, MUGS, CASES], headers: cors }));
  await page.route(/\/api\/v1\/products(\?|$)/, products);
  await page.goto(path);
}

const cards = (page: Page) => page.locator("main article, article").filter({ has: page.locator("h3") });

test("lists, filters, sorts and pages the real catalog through the URL", async ({ page }) => {
  await open(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Të gjitha produktet.");
  await expect(page.getByText("Duke shfaqur 1–12 nga 14 produkte")).toBeVisible();
  await expect(cards(page)).toHaveCount(12);

  // Type counts, and made-to-order cards.
  await expect(page.getByRole("button", { name: /^Të gatshme/ })).toContainText("11");
  await expect(page.getByRole("button", { name: /^Me porosi/ })).toContainText("3");
  await page.getByRole("button", { name: /^Me porosi/ }).click();
  await expect(page).toHaveURL(/lloji=porosi/);
  await expect(cards(page)).toHaveCount(3);
  await expect(page.getByRole("link", { name: "Personalizo →" }).first()).toHaveAttribute("href", /#\/studios\//);
  await expect(page.getByText("nga €9").first()).toBeVisible();

  // A category tile, then Back.
  // The type filter's "Të gjitha 3" (the category tile is plain "Të gjitha").
  await page.getByRole("button", { name: /^Të gjitha \d+$/ }).click();
  await page.getByRole("button", { name: /^Mugs/ }).click();
  await expect(page).toHaveURL(/kategoria=mugs/);
  await expect(cards(page)).toHaveCount(2);
  await page.goBack();
  await expect(page).not.toHaveURL(/kategoria/);

  // Sorting and pagination.
  await page.getByLabel("Rendit").selectOption("priceDesc");
  await expect(cards(page).first()).toContainText("Tigger tooth");
  await expect(cards(page).first()).toContainText("€3,500");
  await page.getByRole("button", { name: "Faqja 2" }).click();
  await expect(page).toHaveURL(/faqja=2/);
  await expect(page.getByText("Duke shfaqur 13–14 nga 14 produkte")).toBeVisible();
  await expect(page.getByRole("button", { name: "Faqja 2" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("button", { name: "Faqja tjetër" })).toBeDisabled();

  // Hide sold out goes back to page 1.
  await page.getByLabel("Fshih të shiturat").check();
  await expect(page).not.toHaveURL(/faqja/);
  await expect(page.getByText("Duke shfaqur 1–12 nga 13 produkte")).toBeVisible();
});

test("search waits for typing, shows an empty state, and clears", async ({ page }) => {
  await open(page);
  await page.getByLabel("Kërko").fill("onyx");
  await expect(page).toHaveURL(/kerko=onyx/);
  await expect(cards(page)).toHaveCount(9);
  await page.getByLabel("Kërko").fill("zzzz");
  await expect(page.getByText("Asnjë produkt nuk u gjet")).toBeVisible();
  await page.getByRole("button", { name: "Pastro filtrat" }).last().click();
  await expect(page).not.toHaveURL(/kerko/);
  await expect(page.getByLabel("Kërko")).toHaveValue("");
  await expect(cards(page)).toHaveCount(12);
});

test("a shared link opens filtered; the viewer and sold-out button work", async ({ page }) => {
  await open(page, "/#/products?kategoria=bracelet&rendit=cmimi-zbritje");
  await expect(page.getByRole("button", { name: /^Bracelet/ })).toHaveAttribute("aria-pressed", "true");
  const first = cards(page).first();
  await expect(first).toContainText("Ka mbaruar");
  await expect(first.getByRole("link", { name: "Na njofto për një të ngjashëm" })).toHaveAttribute("href", "#/contact?produkti=Tigger%20tooth");

  await cards(page).nth(1).getByRole("button", { name: /Shiko .* më të madh/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Bracelet 9" })).toBeVisible();
  await expect(dialog.getByRole("link", { name: "Porosit →" })).toHaveAttribute("href", /#\/checkout\?product=p\d+/);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);

  await first.getByRole("link", { name: "Na njofto për një të ngjashëm" }).click();
  await expect(page.getByLabel("Tema", { exact: true })).toHaveValue("Një pjesë si Tigger tooth");
});

test("no sideways scroll on a 375px phone", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await open(page);
  await expect(cards(page).first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("with server-side paging, the URL's filters are sent to the API", async ({ page }) => {
  const sent: URLSearchParams[] = [];
  const last = () => sent[sent.length - 1];
  await open(page, "/#/products?faqja=99", (r) => {
    const params = new URL(r.request().url()).searchParams;
    sent.push(params);
    const n = Number(params.get("page"));
    const data = n <= 3 ? PRODUCTS.slice(0, n === 3 ? 6 : 12) : [];
    return r.fulfill({ json: { data, meta: { page: n, limit: 12, total: 30, totalPages: 3, counts: { all: 30, ready: 20, custom: 10 } } }, headers: cors });
  });

  // An old link past the end goes to the last page.
  await expect(page).toHaveURL(/faqja=3/);
  await expect(page.getByText("Duke shfaqur 25–30 nga 30 produkte")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Të gatshme/ })).toContainText("20");
  expect(Object.fromEntries(last())).toEqual({ origin: "COMPANY", isActive: "true", page: "3", limit: "12" });

  await page.getByRole("button", { name: /^Me porosi/ }).click();
  await page.getByLabel("Rendit").selectOption("priceDesc");
  await page.getByLabel("Fshih të shiturat").check();
  await page.getByRole("button", { name: /^Mugs/ }).click();
  await page.getByLabel("Kërko").fill("bird");
  await expect.poll(() => last().get("search")).toBe("bird");
  expect(Object.fromEntries(last())).toEqual({
    origin: "COMPANY", isActive: "true", page: "1", limit: "12", sort: "price_desc", type: "custom", inStock: "true", search: "bird", categoryId: MUGS.id,
  });

  // Clearing the search never sends an empty `search=` (the API rejects it).
  // (That query was loaded before typing, so it comes from the cache: no new request.)
  await page.getByLabel("Kërko").fill("");
  await expect(page).not.toHaveURL(/kerko/);
  expect(sent.some((p) => p.get("search") === "")).toBe(false);
  await page.getByRole("button", { name: "Faqja 2" }).click();
  await expect.poll(() => last().get("page")).toBe("2");
  // Only the API's own parameter names are ever sent.
  expect(sent.every((p) => [...p.keys()].every((k) => ["origin", "isActive", "page", "limit", "sort", "type", "inStock", "search", "categoryId"].includes(k)))).toBe(true);
});

test("an API without paging (rejects `page`) still works: the page is made in the browser", async ({ page }) => {
  await open(page, "/#/products?lloji=porosi", (r) => {
    if (new URL(r.request().url()).searchParams.has("page"))
      return r.fulfill({ status: 400, json: { statusCode: 400, message: ["property page should not exist", "property limit should not exist"] }, headers: cors });
    return r.fulfill({ json: PRODUCTS, headers: cors });
  });
  await expect(page.getByText("Duke shfaqur 1–3 nga 3 produkte")).toBeVisible();
  await expect(cards(page)).toHaveCount(3);
});

import { expect, test, type Page } from "@playwright/test";
import { API, CATEGORY, IMG, mockApi } from "./mockApi";

/*
 * The Gift Studio flow: Box → Fill → Note → Review on one page. Packaging, capacity, colours and
 * bundles come from /gift-packaging; items and their type filters from the gift category.
 */
const json = (v: unknown) => ({
  contentType: "application/json",
  headers: { "Access-Control-Allow-Origin": "http://localhost:5174", "Access-Control-Allow-Credentials": "true" },
  body: JSON.stringify(v),
});

const GIFTS = { ...CATEGORY, id: "cat-gift", name: "Gifts", builderType: "GIFT", sizes: [] };
const item = (id: string, name: string, type: string | null, price: number, stock = 20) => ({
  id,
  categoryId: GIFTS.id,
  name,
  description: null,
  imageUrl: `${IMG}/${id}.png`,
  color: null,
  type,
  price,
  stock,
  trackStock: true,
  effectiveLengthMm: null,
  isActive: true,
  sortOrder: 0,
});
const ITEMS = [
  item("choc", "Dark chocolate", "Treats", 450),
  item("cookies", "Butter cookies", "treats ", 350),
  item("tea", "Herbal tea", "Drinks", 500),
  item("candle", "Scented candle", "Decor", 800),
  item("card", "Plain card", null, 100),
];
const color = (id: string, name: string, hex: string, priceAdjustment: number, sortOrder: number) => ({ id, name, hex, priceAdjustment, stock: 10, isActive: true, sortOrder, imageUrl: null });
const PACKAGING = [
  {
    id: "classic",
    name: "Classic closed",
    description: "A surprise when opened",
    type: "OPAQUE",
    shape: "SQUARE",
    imageUrl: null,
    price: 200,
    stock: 0,
    isActive: true,
    sortOrder: 0,
    capacity: 6,
    allowedTypes: [],
    suggestedBundles: [
      { name: "Cozy night in", items: [{ subCategoryId: "tea", quantity: 1 }, { subCategoryId: "candle", quantity: 1 }, { subCategoryId: "cookies", quantity: 2 }] },
      // Its only item no longer exists, so the bundle is not offered.
      { name: "Gone", items: [{ subCategoryId: "deleted", quantity: 1 }] },
    ],
    colors: [color("noir", "Noir", "#1F2125", 0, 0), color("ember", "Ember", "#E5533D", 100, 1)],
  },
  {
    id: "clear",
    name: "Clear window",
    description: "See what's inside",
    type: "TRANSPARENT",
    shape: "SQUARE",
    imageUrl: null,
    price: 300,
    stock: 5,
    isActive: true,
    sortOrder: 1,
    capacity: 2,
    allowedTypes: ["Treats"],
    suggestedBundles: [],
    colors: [],
  },
];

async function mockGifts(page: Page, onProduct?: (body: string) => void) {
  const api = await mockApi(page, {
    onProduct: (req) => {
      onProduct?.(req.postDataBuffer()?.toString("latin1") ?? "");
      return null;
    },
  });
  await page.route(
    (url) => url.href.startsWith(API),
    async (route) => {
      const path = new URL(route.request().url()).pathname.replace("/api/v1", "");
      if (route.request().method() !== "GET") return route.fallback();
      if (path === "/categories") return route.fulfill(json([CATEGORY, GIFTS]));
      if (path === `/categories/${GIFTS.id}`) return route.fulfill(json(GIFTS));
      if (path === `/categories/${GIFTS.id}/sub-categories`) return route.fulfill(json(ITEMS));
      if (path === "/gift-packaging") return route.fulfill(json(PACKAGING));
      return route.fallback();
    },
  );
  return api;
}

const bar = (page: Page) => page.locator("[data-gift-bar]");
const slots = (page: Page) => page.getByRole("list", { name: "Gift box contents" });
const tile = (page: Page, name: string) => page.getByRole("button", { name: new RegExp(`^Add ${name}`) });

test("Box → Fill → Note → Review, with slots, type filters, a bundle and the gift card", async ({ page }) => {
  let saved = "";
  await mockGifts(page, (body) => (saved = body));
  await page.goto("/#/studios/gifts");

  // Box: capacity and price on each card; the first available colour is chosen for you.
  await expect(page.getByRole("radio", { name: /Classic closed/ })).toContainText("6 slots · €2.00");
  await expect(page.getByRole("radio", { name: /Clear window/ })).toContainText("2 slots · €3.00");
  await expect(bar(page).getByRole("button", { name: /Next: Fill/ })).toBeDisabled();
  await expect(bar(page)).toContainText("Choose a box to continue");
  await page.getByRole("radio", { name: /Classic closed/ }).click();
  await expect(page.getByRole("radio", { name: /Noir/ })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("radio", { name: /Ember/ }).click();
  await expect(bar(page)).toContainText("€3.00");
  await bar(page).getByRole("button", { name: /Next: Fill/ }).click();

  // Fill: filters are the item types as written, once each (Treats / treats are one).
  await expect(page).toHaveURL(/#\/studios\/gifts\?step=fill$/);
  await expect(page.getByText("0/6 slots")).toBeVisible();
  const filters = page.getByRole("group", { name: "Item types" });
  await expect(filters.getByRole("button")).toHaveText(["All", "Treats", "Drinks", "Decor"]);
  await filters.getByRole("button", { name: "Treats" }).click();
  await expect(page.getByRole("button", { name: /^Add / })).toHaveCount(2);
  await filters.getByRole("button", { name: "All" }).click();

  // The deleted-item bundle is skipped; the other fills the box in one tap.
  await expect(page.getByRole("button", { name: /Gone/ })).toHaveCount(0);
  await page.getByRole("button", { name: /Cozy night in/ }).click();
  await expect(page.getByText("4/6 slots")).toBeVisible();
  await expect(slots(page).getByRole("button")).toHaveCount(4);

  await tile(page, "Dark chocolate").click();
  await tile(page, "Dark chocolate").click();
  await expect(page.getByText("6/6 slots")).toBeVisible();
  await expect(page.getByText("Your box is full. Remove an item to add another.")).toBeVisible();
  await expect(tile(page, "Herbal tea")).toBeDisabled();

  // Take one out from the preview, and one with the minus on its tile.
  await slots(page).getByRole("button", { name: "Remove Herbal tea from the box" }).click();
  await page.getByRole("button", { name: "Remove one Dark chocolate" }).click();
  await expect(page.getByText("4/6 slots")).toBeVisible();
  // Ember box €3.00 + candle 8.00 + 2 cookies 7.00 + chocolate 4.50
  await expect(bar(page)).toContainText("€22.50");
  await bar(page).getByRole("button", { name: /Next: Note/ }).click();

  // Note: optional card with quick messages and a counter.
  await expect(page).toHaveURL(/step=note/);
  await page.getByRole("textbox", { name: "To" }).fill("Mom");
  await page.getByRole("button", { name: "Thank you for everything" }).click();
  await expect(page.getByRole("textbox", { name: "Message" })).toHaveValue("Thank you for everything");
  await expect(page.getByText("24/200")).toBeVisible();
  await page.getByRole("button", { name: "Close lid" }).click();
  // The card in the box is written as they type, and stays with the lid on.
  await expect(page.getByRole("img", { name: /Gift card preview: To Mom. Thank you for everything/ })).toBeVisible();
  await expect(page.getByText("Dear Mom,")).toBeVisible();
  await bar(page).getByRole("button", { name: /Next: Review/ }).click();

  // Review: packaging, items with quantities, the card and the total; browser Back returns a step.
  await expect(page).toHaveURL(/#\/studios\/gifts\?step=review$/);
  const review = page.getByRole("region", { name: "Review your gift" });
  await expect(review).toContainText("Classic closed · Ember");
  await expect(review).toContainText("Butter cookies× 2");
  await expect(review).toContainText("To Mom");
  await expect(review).toContainText("Thank you for everything");
  await expect(review).toContainText("€22.50");
  await page.goBack();
  await expect(page).toHaveURL(/step=note/);
  await page.goForward();

  await bar(page).getByRole("button", { name: /Continue to order/ }).click();
  await expect(page).toHaveURL(/#\/checkout\?design=p-new/);
  expect(saved).toContain('name="giftPackagingId"\r\n\r\nclassic');
  expect(saved).toContain('name="giftPackagingColorId"\r\n\r\nember');
  expect(saved).toContain('name="giftRecipient"\r\n\r\nMom');
  expect(saved).toContain('name="giftMessage"\r\n\r\nThank you for everything');
  const items = JSON.parse(saved.match(/name="items"\r\n\r\n(.*)\r\n/)![1]) as { subCategoryId: string; quantity: number; position: number }[];
  expect(items.map((i) => i.subCategoryId)).toEqual(["candle", "cookies", "cookies", "choc"]);
  expect(items.every((i) => i.quantity === 1)).toBe(true);
});

test("a smaller box keeps what fits and says what was taken out; steps ahead stay locked", async ({ page }) => {
  await mockGifts(page);
  await page.goto("/#/studios/gifts");
  const steps = page.getByRole("list", { name: /progress/i });
  await expect(steps.getByRole("button", { name: /Review/ })).toBeDisabled();

  await page.getByRole("radio", { name: /Classic closed/ }).click();
  await bar(page).getByRole("button", { name: /Next: Fill/ }).click();
  await tile(page, "Herbal tea").click();
  await tile(page, "Dark chocolate").click();
  await tile(page, "Butter cookies").click();
  await tile(page, "Dark chocolate").click();
  await expect(page.getByText("4/6 slots")).toBeVisible();

  await steps.getByRole("button", { name: /Box/ }).click();
  await page.getByRole("radio", { name: /Clear window/ }).click();
  // Tea is not a treat, and the clear box holds two.
  await expect(page.getByText("2 items didn't fit the new box and were taken out.")).toBeVisible();
  await bar(page).getByRole("button", { name: /Next: Fill/ }).click();
  await expect(page.getByText("2/2 slots")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Add / })).toHaveCount(2);
  await expect(page.getByRole("group", { name: "Item types" })).toHaveCount(0);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("4/6 slots")).toBeVisible();
});

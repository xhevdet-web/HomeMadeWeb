import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { CATEGORY, mockApi } from "./mockApi";

const cors = {
  "Access-Control-Allow-Origin": "http://localhost:5174",
  "Access-Control-Allow-Credentials": "true",
};
const ICON = readFileSync("public/brand/favicon.png");
const LOGO = readFileSync("public/brand/hm-craft-logo-full.png");
const product = (
  id: string,
  name: string,
  price: number,
  stock: number,
  img: string,
  back?: string,
) => ({
  id,
  name,
  price,
  stock,
  categoryId: CATEGORY.id,
  origin: "COMPANY",
  isActive: true,
  imageUrl: `http://shots.test/${img}`,
  backImageUrl: back ? `http://shots.test/${back}` : null,
  description:
    id === "p1"
      ? "Hand-knotted onyx beads with a brass charm. Adjustable cord, fits most wrists."
      : null,
});
const PRODUCTS = [
  product("p5", "Tigger tooth", 3500, 0, "icon.png"),
  product("p1", "Skenderbeu", 15, 4, "icon.png", "logo.png"),
  product("p2", "Black Matt", 5, 3, "logo.png"),
  product("p3", "Clean", 15, 2, "icon.png"),
  product("p4", "Red and Black", 15, 5, "logo.png"),
];

// Ready-made pieces use the shop's product cards; any piece opens full size, with arrows and Escape.
test("ready-made pieces open in a full-size viewer", async ({ page }) => {
  await mockApi(page, { language: "sq" });
  await page.route("http://shots.test/**", (r) =>
    r.fulfill({
      contentType: "image/png",
      body: r.request().url().endsWith("logo.png") ? LOGO : ICON,
      headers: { "Access-Control-Allow-Origin": "*" },
    }),
  );
  await page.route(
    /\/api\/v1\/(products|categories\/[^/]+\/products)(\?|$)/,
    (r) =>
      r.request().method() === "GET"
        ? r.fulfill({ json: PRODUCTS, headers: cors })
        : r.fallback(),
  );
  await page.goto("/#/studios/bracelet");
  const section = page.locator("section[aria-labelledby=ready-title]");
  await expect(section).toBeVisible();
  await expect(section.getByRole("listitem").first()).toContainText("Tigger tooth");
  await expect(section.getByRole("listitem").first()).toContainText("Ka mbaruar");
  await expect(section.getByRole("link", { name: /Shiko të gjitha produktet/ })).toHaveAttribute(
    "href",
    "#/products?kategoria=bracelet",
  );
  await page
    .getByRole("button", { name: "Shiko Skenderbeu më të madh" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Skenderbeu" }),
  ).toBeVisible();
  await expect(dialog.getByRole("link", { name: /Porosit/ })).toHaveAttribute(
    "href",
    "#/checkout?product=p1",
  );
  await dialog.getByRole("button", { name: "Prapa" }).click();
  await expect(dialog.getByRole("img", { name: "Skenderbeu" })).toHaveAttribute(
    "src",
    "http://shots.test/logo.png",
  );
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByRole("heading", { name: "Black Matt" })).toBeVisible();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await expect(
    dialog.getByRole("heading", { name: "Tigger tooth" }),
  ).toBeVisible();
  await expect(dialog.getByText("Ka mbaruar", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Shiko Skenderbeu më të madh" }),
  ).toBeFocused();
});

import { expect, test } from "@playwright/test";
import { IMG, mockApi } from "./mockApi";

// A mug design saved before prints were white: its cream background shows white on the mug.
const PRINT = { front: { widthMm: 200, heightMm: 90, safeMm: { top: 5, right: 5, bottom: 5, left: 5 } } };
const mugDesign = (preview: string) => ({
  id: "my-mug",
  name: "My mugs",
  categoryId: "cat-mug",
  origin: "CUSTOMER",
  price: 1200,
  isActive: true,
  designPreviewUrl: preview,
  baseProductId: "mug-blank",
  baseProduct: { id: "mug-blank", name: "White Mug", price: 1200, printAreas: PRINT },
  category: { id: "cat-mug", name: "Mugs", builderType: "MUG" },
  items: [],
});
const print = (background: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="180"><rect width="400" height="180" fill="${background}"/><text x="200" y="100" font-size="48" text-anchor="middle" fill="#222">Problem</text></svg>`;

for (const [name, background, cream] of [
  ["an old cream print is shown white", "#F3EFE8", true],
  ["a white print is shown as it is", "#FFFFFF", false],
] as const) {
  test(name, async ({ page }) => {
    const src = `${IMG}/print-${cream ? "cream" : "white"}.svg`;
    await mockApi(page, { products: { "my-mug": mugDesign(src) } });
    await page.route(src, (route) => route.fulfill({ contentType: "image/svg+xml", body: print(background), headers: { "Access-Control-Allow-Origin": "*" } }));
    await page.goto("/#/checkout?design=my-mug");
    const img = page.getByRole("img", { name: /on the mug/ }).locator("img");
    await expect(img).toBeVisible();
    if (cream) await expect(img).toHaveCSS("filter", /url/);
    else {
      await page.waitForTimeout(300);
      await expect(img).toHaveCSS("filter", "none");
    }
    if (cream && test.info().project.name === "Desktop Chrome")
      await page.getByRole("complementary", { name: "Order summary" }).screenshot({ path: "test-results/mug-cream-fixed.png" });
  });
}

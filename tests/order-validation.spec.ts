import { expect, test } from "@playwright/test";
import { CATEGORY, IMG, USER, design, mockApi, readyMade, seedDraft } from "./mockApi";

const BELOW = design("d-low", 460, [{ id: "amber", qty: 4, unit: 115 }]);
const ABOVE = design("d-ok", 620, [{ id: "onyx", qty: 2, unit: 310 }]);
const placeOrder = (page: import("@playwright/test").Page) => page.getByRole("button", { name: "Place Order" });

test.describe("Jewelry: ordered by price, not by length", () => {
  test("€4.60 at full length can't continue; saving still works and sends a PNG preview", async ({ page }) => {
    const api = await mockApi(page);
    await seedDraft(page, CATEGORY.id, { kind: "JEWELRY", sizeId: "s-small", lengthMm: 160, pieces: ["amber", "amber", "amber", "amber"] });
    await page.goto("/#/studios/bracelet/preview");

    await expect(page.getByText("Bracelets start at €5.00. Add a few more components to continue.")).toBeVisible();
    await expect(page.getByText("Add €0.40 more to order.")).toBeVisible();
    await expect(page.getByRole("button", { name: /Continue to order/ })).toBeDisabled();
    await expect(page.getByText("Your bracelet fits perfectly")).toBeVisible();

    await page.getByRole("button", { name: "Save design" }).click();
    await expect(page.getByText("Saved to My Designs.")).toBeVisible();
    const post = api.calls.find((c) => c.method === "POST" && c.path === "/products")!;
    const body = post.body!.toString("latin1");
    expect(body).toContain('name="designPreview"; filename="design-preview.png"');
    expect(body).toContain("Content-Type: image/png");
    // A real PNG of some size, not an empty part.
    const start = body.indexOf("\x89PNG");
    expect(start).toBeGreaterThan(0);
    expect(body.indexOf("------", start) - start).toBeGreaterThan(2000);
  });

  test("€6.20 at half length can continue to order", async ({ page }) => {
    const api = await mockApi(page);
    await seedDraft(page, CATEGORY.id, { kind: "JEWELRY", sizeId: "s-small", lengthMm: 160, pieces: ["onyx", "onyx"] });
    await page.goto("/#/studios/bracelet/preview");
    const go = page.getByRole("button", { name: /Continue to order/ });
    await expect(go).toBeEnabled();
    await go.click();
    await expect(page).toHaveURL(/#\/checkout\?design=p-new/);
    expect(api.count("POST", "/products")).toBe(1);
  });

  test("the studio footer keeps Preview enabled under €5.00", async ({ page }) => {
    await mockApi(page);
    await seedDraft(page, CATEGORY.id, { kind: "JEWELRY", sizeId: "s-small", lengthMm: 160, pieces: ["amber"] });
    await page.goto("/#/studios/bracelet/design");
    await expect(page.getByRole("button", { name: /Preview/ }).last()).toBeEnabled();
    await expect(page.getByText("Add €3.85 more to order.").first()).toBeVisible();
  });

  test("checkout refuses a saved design under €5.00, with Edit design", async ({ page }) => {
    await mockApi(page, { products: { "d-low": BELOW } });
    await page.goto("/#/checkout?design=d-low");
    await expect(placeOrder(page)).toBeDisabled();
    await expect(page.getByText("Bracelets start at €5.00. Add a few more components to continue.")).toBeVisible();
    await expect(page.getByText("Add €0.40 more to order.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Edit design" })).toHaveAttribute("href", /#\/studios\/bracelet\/design\?load=d-low/);
  });
});

test.describe("Design previews", () => {
  test("a failed capture never saves and offers Try again", async ({ page }) => {
    const api = await mockApi(page, { imageCors: false });
    await seedDraft(page, CATEGORY.id, { kind: "JEWELRY", sizeId: "s-small", lengthMm: 160, pieces: ["onyx", "onyx"] });
    await page.goto("/#/studios/bracelet/preview");
    await page.getByRole("button", { name: "Save design" }).click();
    await expect(page.getByText("Could not capture your design preview. Your design is safe; please retry.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
    expect(api.count("POST", "/products")).toBe(0);
  });

  test("checkout draws a design without a preview from its items, never a single bead", async ({ page }) => {
    await mockApi(page, { products: { "d-ok": ABOVE } });
    await page.goto("/#/checkout?design=d-ok");
    const summary = page.getByRole("complementary", { name: "Order summary" });
    await expect(summary.locator('svg[aria-label^="My bracelet with 2 components"]')).toBeVisible();
    await expect(summary.getByText("Preview image missing. Re-save this design so our makers see it.")).toBeVisible();
    await expect(summary.getByText("Bracelet · Small · 16 cm")).toBeVisible();
    await summary.getByText("Beads & price details").click();
    await expect(summary.getByText("Onyx × 2")).toBeVisible();
    await expect(summary.getByText("€6.20").first()).toBeVisible();
  });

  test("checkout shows the saved preview large, with a lightbox", async ({ page }) => {
    await mockApi(page, { products: { "d-ok": { ...ABOVE, designPreviewUrl: `${IMG}/preview.png` } } });
    await page.goto("/#/checkout?design=d-ok");
    const img = page.getByRole("complementary", { name: "Order summary" }).getByRole("img", { name: "My bracelet" });
    await expect(img).toHaveAttribute("src", `${IMG}/preview.png`);
    expect((await img.boundingBox())!.width).toBeGreaterThanOrEqual(160);
    await page.getByRole("button", { name: "Open My bracelet full size" }).click();
    await expect(page.getByRole("dialog", { name: "My bracelet" })).toBeVisible();
  });
});

test.describe("Checkout rules", () => {
  test("incomplete delivery details: Add delivery details", async ({ page }) => {
    await mockApi(page, { user: { ...USER, phone: "" }, products: { "d-ok": ABOVE } });
    await page.goto("/#/checkout?design=d-ok");
    await expect(page.getByRole("button", { name: "Add delivery details" })).toBeVisible();
    await expect(page.getByText("We need an address and phone number to deliver your order.").last()).toBeVisible();
    await expect(placeOrder(page)).toHaveCount(0);
  });

  test("ready-made availability", async ({ page }) => {
    const api = await mockApi(page, { products: { r0: readyMade("r0", { stock: 0 }), rs: readyMade("rs", { sizes: [{ size: "M", stock: 0 }, { size: "L", stock: 2 }] }), rx: readyMade("rx", { isActive: false }) } });
    await page.goto("/#/checkout?product=r0");
    await expect(page.getByText("Out of stock")).toBeVisible();
    await expect(placeOrder(page)).toBeDisabled();

    await page.goto("/#/checkout?product=rs");
    await expect(page.getByText("Choose a size", { exact: true })).toBeVisible();
    await expect(page.getByRole("radio", { name: "M", exact: true })).toBeDisabled();
    await page.getByRole("radio", { name: "L", exact: true }).click();
    await expect(placeOrder(page)).toBeEnabled();
    // Sized ready-made products are ordered one at a time.
    await expect(page.getByRole("button", { name: /Increase quantity/ })).toHaveCount(0);

    await page.goto("/#/checkout?product=rx");
    await expect(page.getByText("This product is unavailable.")).toBeVisible();
    expect(api.count("POST", "/orders")).toBe(0);
  });

  test("a profile rejection opens the delivery form and unlocks", async ({ page }) => {
    await mockApi(page, {
      products: { "d-ok": ABOVE },
      onOrder: () => ({ status: 400, json: { message: "Complete firstName, lastName, phone, country and address in your profile before ordering" } }),
    });
    await page.goto("/#/checkout?design=d-ok");
    await placeOrder(page).click();
    await expect(page.getByText("Complete firstName, lastName, phone, country and address in your profile before ordering")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save and continue" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Check my orders" })).toHaveCount(0);
  });

  test("a stock rejection refreshes availability", async ({ page }) => {
    let calls = 0;
    const api = await mockApi(page, {
      products: { r1: readyMade("r1") },
      onOrder: () => {
        calls++;
        return { status: 409, json: { message: "Only 0 of Silver bangle are in stock" } };
      },
    });
    await page.goto("/#/checkout?product=r1");
    await expect(placeOrder(page)).toBeEnabled();
    api.setProduct("r1", readyMade("r1", { stock: 0 }));
    await placeOrder(page).click();
    await expect(page.getByText("Only 0 of Silver bangle are in stock")).toBeVisible();
    await expect(page.getByText("Out of stock")).toBeVisible();
    await expect(placeOrder(page)).toBeDisabled();
    expect(calls).toBe(1);
  });

  for (const [name, reply] of [
    ["a 500", { status: 500, json: { message: "Internal server error" } }],
    ["a network failure", { abort: true }],
  ] as const) {
    test(`${name} after sending locks checkout and never retries`, async ({ page }) => {
      const api = await mockApi(page, { products: { "d-ok": ABOVE }, onOrder: () => reply });
      await page.goto("/#/checkout?design=d-ok");
      await placeOrder(page).click();
      await expect(page.getByText("We could not confirm whether your order was placed. Check My Orders before doing anything else. This checkout will not submit again.")).toBeVisible();
      await expect(page.getByRole("link", { name: "Check my orders" })).toBeVisible();
      await page.reload();
      await expect(page.getByText("An order was submitted for this design. Check My Orders for its status before placing another order.")).toBeVisible();
      await expect(placeOrder(page)).toHaveCount(0);
      expect(api.count("POST", "/orders")).toBe(1);
    });
  }

  test("double clicks send one order; success opens the order and keeps checkout locked", async ({ page }) => {
    const api = await mockApi(page, { products: { "d-ok": ABOVE }, onOrder: () => undefined });
    await page.goto("/#/checkout?design=d-ok");
    await page.getByText("Add a delivery note").click();
    await page.getByRole("textbox", { name: "Delivery note" }).fill("  Ring twice  ");
    await placeOrder(page).dblclick();
    await expect(page).toHaveURL(/#\/orders\/o1\?placed=1/);
    await expect(page.getByText("Your order has been placed.")).toBeVisible();
    expect(api.count("POST", "/orders")).toBe(1);
    const sent = JSON.parse(api.calls.find((c) => c.method === "POST" && c.path === "/orders")!.body!.toString());
    // Notes are trimmed; jewelry sends no quantity and no prices.
    expect(sent).toEqual({ productId: "d-ok", paymentType: "CASH_ON_DELIVERY", customerNotes: "Ring twice" });
    await page.goBack();
    await expect(page.getByRole("link", { name: "Check my orders" })).toBeVisible();
  });
});

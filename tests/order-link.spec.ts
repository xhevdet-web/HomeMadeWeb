import { expect, test } from "@playwright/test";
import { USER, mockApi } from "./mockApi";

/*
 * The "View your order" link in order emails opens #/orders/<id>: a signed-in customer sees
 * the order at once; a signed-out one gets the login pop-up and lands on the order after it.
 */
const ORDER_ID = "019f5ec0-9788-4273-85b1-5eb46703cac7";

test("a signed-out customer opening an order link signs in and lands on that order", async ({ page }) => {
  const api = await mockApi(page, { user: null });
  await page.goto(`/#/orders/${ORDER_ID}`);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Email address").fill(USER.email as string);
  await dialog.getByLabel("Password", { exact: true }).fill("a-long-password-1");
  await dialog.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page).toHaveURL(new RegExp(`#/orders/${ORDER_ID}$`));
  await expect(page.getByText("HC-1001").first()).toBeVisible();
  expect(api.count("GET", `/orders/${ORDER_ID}`)).toBeGreaterThan(0);
});

test("a signed-in customer opening an order link sees the order directly", async ({ page }) => {
  await mockApi(page);
  await page.goto(`/#/orders/${ORDER_ID}`);
  await expect(page.getByText("HC-1001").first()).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

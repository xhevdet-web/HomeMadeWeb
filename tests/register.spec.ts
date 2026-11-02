import { expect, test } from "@playwright/test";
import { mockApi } from "./mockApi";

async function openRegister(page: import("@playwright/test").Page) {
  await page.goto("/#/checkout?design=d-ok");
  await page.getByRole("tab", { name: "Create an account" }).click();
}

test.describe("Create account (like the app)", () => {
  test("sends only name and account; no username or delivery details", async ({ page }) => {
    const api = await mockApi(page, { user: null });
    await openRegister(page);
    const dialog = page.getByRole("dialog");
    for (const section of ["About you", "Your account"]) await expect(dialog.getByRole("group", { name: section })).toBeVisible();
    await expect(dialog.getByRole("group", { name: "Delivery details" })).toHaveCount(0);
    await expect(dialog.getByLabel(/Username/)).toHaveCount(0);

    await dialog.getByLabel("First name").fill("Ana");
    await dialog.getByLabel("Last name").fill("Krasniqi");
    await dialog.getByLabel("Email address").fill(" Ana@Example.test ");
    await dialog.getByLabel("Password", { exact: true }).fill("a-long-password-1");
    await dialog.getByLabel("Confirm password").fill("a-long-password-2");
    await expect(dialog.getByText("Passwords don’t match yet")).toBeVisible();
    await dialog.getByRole("button", { name: /Create Account/ }).click();
    await expect(dialog.getByText("Your passwords do not match.")).toBeVisible();
    expect(api.count("POST", "/auth/register")).toBe(0);

    await dialog.getByLabel("Confirm password").fill("a-long-password-1");
    await expect(dialog.getByText("Passwords match")).toBeVisible();
    await page.screenshot({ path: `test-results/register-${test.info().project.name.replace(/\W+/g, "-")}.png`, fullPage: false });
    await dialog.getByRole("button", { name: /Create Account/ }).click();
    await expect(dialog).toHaveCount(0);

    const sent = JSON.parse(api.calls.find((c) => c.path === "/auth/register")!.body!.toString());
    expect(sent).toEqual({
      firstName: "Ana",
      lastName: "Krasniqi",
      email: "ana@example.test",
      password: "a-long-password-1",
    });
    expect(api.count("POST", "/auth/login")).toBe(1);
    const login = JSON.parse(api.calls.find((c) => c.path === "/auth/login")!.body!.toString());
    expect(login).toEqual({ email: "ana@example.test", password: "a-long-password-1" });
  });

  test("shows the app's messages", async ({ page }) => {
    await mockApi(page, { user: null });
    await openRegister(page);
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("First name").fill("Ana");
    await dialog.getByLabel("Last name").fill("K");
    await dialog.getByLabel("Email address").fill("taken@example.test");
    await dialog.getByLabel("Password", { exact: true }).fill("short");
    await dialog.getByLabel("Confirm password").fill("short");
    await dialog.getByRole("button", { name: /Create Account/ }).click();
    await expect(dialog.getByText("Please use a password between 12 and 128 characters.")).toBeVisible();
    await dialog.getByLabel("Password", { exact: true }).fill("a-long-password-1");
    await dialog.getByLabel("Confirm password").fill("a-long-password-1");
    await dialog.getByRole("button", { name: /Create Account/ }).click();
    await expect(dialog.getByText("This email already has an account. Log in instead.")).toBeVisible();
    await dialog.getByRole("button", { name: "Show password" }).first().click();
    await expect(dialog.getByLabel("Password", { exact: true })).toHaveAttribute("type", "text");
  });
});

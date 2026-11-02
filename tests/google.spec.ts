import { expect, test, type Page } from "@playwright/test";
import { mockApi } from "./mockApi";

/** Google's script is replaced by mockApi's stand-in; the chosen ID token is set per test. */
async function credential(page: Page, idToken: string) {
  await page.addInitScript((token) => Object.assign(window, { __googleCredential: token }), idToken);
}

const googleBodies = (api: Awaited<ReturnType<typeof mockApi>>) =>
  api.calls.filter((c) => c.path === "/auth/google").map((c) => JSON.parse(c.body!.toString()));

test.describe("Continue with Google", () => {
  test("is offered on Sign in and Create account, and signs in through the API", async ({ page }) => {
    const api = await mockApi(page, { user: null });
    await page.goto("/#/checkout?design=d-ok");
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("button", { name: "Continue with Google" })).toBeVisible();
    await dialog.getByRole("tab", { name: "Create an account" }).click();
    await expect(dialog.getByRole("button", { name: "Continue with Google" })).toBeVisible();

    await dialog.getByRole("button", { name: "Continue with Google" }).click();
    await expect(dialog).toHaveCount(0);
    // Only the ID token is sent; who the customer is comes from the API's verification.
    expect(googleBodies(api)).toEqual([{ idToken: "test-id-token" }]);
    expect(api.count("POST", "/auth/login")).toBe(0);
    expect(api.count("POST", "/auth/register")).toBe(0);
  });

  test("an existing email account links once its password is given", async ({ page }) => {
    const api = await mockApi(page, { user: null });
    await credential(page, "link-me");
    await page.goto("/#/checkout?design=d-ok");
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Continue with Google" }).click();
    await expect(dialog.getByText("An account with this email already exists. Enter your password to connect Google.")).toBeVisible();

    await dialog.getByLabel("Your HomeCreator password").fill("wrong-password");
    await dialog.getByRole("button", { name: "Connect Google and sign in" }).click();
    await expect(dialog.getByRole("alert")).toContainText("That password is incorrect.");

    await dialog.getByLabel("Your HomeCreator password").fill("right-password");
    await dialog.getByRole("button", { name: "Connect Google and sign in" }).click();
    await expect(dialog).toHaveCount(0);
    expect(googleBodies(api)).toEqual([
      { idToken: "link-me" },
      { idToken: "link-me", password: "wrong-password" },
      { idToken: "link-me", password: "right-password" },
    ]);
  });

  test("going back from linking returns to the email form", async ({ page }) => {
    await mockApi(page, { user: null });
    await credential(page, "link-me");
    await page.goto("/#/checkout?design=d-ok");
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Continue with Google" }).click();
    await dialog.getByRole("button", { name: "Use email and password instead" }).click();
    await expect(dialog.getByLabel("Email address")).toBeVisible();
  });

  test("a rejected Google sign-in shows a plain message and stays signed out", async ({ page }) => {
    await mockApi(page, { user: null });
    await credential(page, "bad");
    await page.goto("/#/checkout?design=d-ok");
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Continue with Google" }).click();
    await expect(dialog.getByRole("alert")).toContainText("Unable to sign in with Google. Please try again.");
    await expect(dialog).toBeVisible();
  });

  test("a Google account without a name opens the profile editor", async ({ page }) => {
    await mockApi(page, { user: null });
    await credential(page, "no-name");
    await page.goto("/");
    await page.getByRole("button", { name: "Sign in" }).first().click();
    await page.getByRole("dialog").getByRole("button", { name: "Continue with Google" }).click();
    await expect(page).toHaveURL(/#\/profile$/);
    await expect(page.getByLabel("Last name")).toBeVisible();
  });
});

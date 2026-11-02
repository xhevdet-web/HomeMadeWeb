import { expect, test } from "@playwright/test";
import { mockApi } from "./mockApi";

// Shqip is the default, like the app; the language select switches to English and the choice is remembered.
test("opens in Shqip and switches to English", async ({ page }) => {
  await mockApi(page, { language: "sq" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "sq");
  await expect(page.getByRole("heading", { name: /Zgjidh ku do të krijosh/ })).toBeVisible();

  const footer = page.getByRole("contentinfo");
  await footer.getByRole("button", { name: "Gjuha: Shqip" }).click();
  const list = footer.getByRole("listbox", { name: "Gjuha" });
  await expect(list.getByRole("option", { name: /Shqip/ })).toHaveAttribute("aria-selected", "true");
  await list.getByRole("option", { name: /English/ }).click();
  await expect(list).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: /Pick a canvas/ })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: /Pick a canvas/ })).toBeVisible();
  await footer.getByRole("button", { name: "Language: English" }).click();
  await page.keyboard.press("Escape");
  await expect(footer.getByRole("listbox")).toHaveCount(0);
  await footer.getByRole("button", { name: "Language: English" }).click();
  await footer.getByRole("option", { name: /Shqip/ }).click();
  await expect(page.getByRole("heading", { name: /Zgjidh ku do të krijosh/ })).toBeVisible();
});

test("the nav shows the current language as a select", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await mockApi(page, { language: "sq" });
  await page.goto("/");
  const nav = page.getByRole("banner");
  const select = nav.getByRole("button", { name: "Gjuha: Shqip" });
  await expect(select).toHaveText(/SQ/);
  await select.click();
  await page.screenshot({ path: "test-results/language-select.png" });
  await nav.getByRole("option", { name: /English/ }).click();
  await expect(nav.getByRole("button", { name: "Language: English" })).toHaveText(/EN/);
});

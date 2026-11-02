import { expect, test } from "@playwright/test";
import { mockApi } from "./mockApi";

// The stacked category cards. At every scroll position, a tap on a visible "Design a …" button
// must reach the button, or a card that has visibly slid over it; never the next card's
// transparent sticky layer, which used to swallow those taps on phones.
test("category buttons are never covered by an invisible layer", async ({ page }) => {
  await mockApi(page);
  // A failed category request shows the built-in list: seven stacked cards, as on the live site.
  await page.route("http://api.test/api/v1/categories", (route) => route.fulfill({ status: 500, body: "{}" }));
  await page.goto("/");
  await expect(page.locator("article a[href]")).toHaveCount(7);
  // Phones show the cards unstacked: nothing may cover a button at all.
  const phone = page.viewportSize()!.width < 640;
  const problems = await page.evaluate(async (phone) => {
    const found: string[] = [];
    const links = [...document.querySelectorAll<HTMLAnchorElement>("article a[href]")];
    const end = document.documentElement.scrollHeight - innerHeight;
    for (let y = 0; y <= end; y += 20) {
      window.scrollTo(0, y);
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      for (const link of links) {
        const box = link.getBoundingClientRect();
        const x = box.left + box.width / 2;
        const cy = box.top + box.height / 2;
        if (cy < 0 || cy > innerHeight) continue;
        const hit = document.elementFromPoint(x, cy);
        if (hit && (link.contains(hit) || (!phone && hit.closest("article")))) continue;
        found.push(`${link.textContent} at scroll ${y}: tap hit ${hit?.tagName ?? "nothing"}`);
      }
    }
    return found;
  }, phone);
  expect(problems).toEqual([]);
});

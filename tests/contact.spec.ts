import { expect, test } from "@playwright/test";
import { mockApi, USER } from "./mockApi";

const ORDER = {
  id: "o1",
  orderNumber: "HM-2026-000000123",
  status: "PENDING",
  paymentType: "CASH_ON_DELIVERY",
  totalPrice: 12,
  firstName: USER.firstName,
  lastName: USER.lastName,
  phone: USER.phone,
  country: USER.country,
  address: USER.address,
  createdAt: "2026-11-01T10:00:00.000Z",
  productId: "p1",
  product: { id: "p1", name: "Amber bracelet", price: 12 },
};

test("a signed-out visitor picks a topic, fixes the form and sends a message", async ({ page }) => {
  const sent: unknown[] = [];
  await mockApi(page, { user: null, onContact: (_req, body) => (sent.push(body), undefined) });
  await page.goto("/#/contact");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Let's talk.");
  await expect(page.getByRole("link", { name: "homemadecreator.shop@gmail.com" })).toHaveAttribute("href", /^mailto:homemadecreator\.shop@gmail\.com/);

  // Empty form: our own message, and the field gets focus.
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("alert")).toHaveText("Please add your name.");
  await expect(page.getByLabel("Name", { exact: true })).toBeFocused();

  await page.getByLabel("Name", { exact: true }).fill("Arta Berisha");
  await page.getByLabel("Email", { exact: true }).fill("arta@example.test");

  // A help card chooses the topic, fills the subject and asks for the order number.
  await page.getByRole("button", { name: "Write to us about: An order" }).click();
  await expect(page.getByRole("button", { name: "Order question" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Subject", { exact: true })).toHaveValue("Order question");
  await expect(page.getByLabel(/Order number/)).toBeVisible();
  await expect(page.getByLabel("Message", { exact: true })).toBeFocused();

  await page.getByLabel("Message", { exact: true }).fill("Hi");
  await expect(page.getByText("8 more characters needed · 2/5000")).toBeVisible();
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("alert")).toHaveText("Please tell us a little more (at least 10 characters).");

  await page.getByLabel(/Order number/).fill("HM-2026-000000123");
  await page.getByLabel("Message", { exact: true }).fill("When will my bracelet arrive?");
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(page.getByRole("heading", { name: "Message sent" })).toBeFocused();
  await expect(page.getByText("arta@example.test")).toBeVisible();
  expect(sent).toEqual([
    { name: "Arta Berisha", email: "arta@example.test", subject: "Order question", message: "When will my bracelet arrive?", orderNumber: "HM-2026-000000123" },
  ]);

  await page.getByRole("button", { name: "Send another message" }).click();
  await expect(page.getByLabel("Subject", { exact: true })).toHaveValue("");
});

test("signed in, the account is used and a recent order can be picked", async ({ page }) => {
  const sent: unknown[] = [];
  await mockApi(page, { orders: [ORDER], onContact: (_req, body) => (sent.push(body), undefined) });
  await page.goto("/#/contact");
  await expect(page.getByText("Ana Krasniqi")).toBeVisible();
  await expect(page.getByLabel("Name", { exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Order question" }).click();
  await page.getByRole("button", { name: "Order HM-2026-000000123, Amber bracelet" }).click();
  await page.getByLabel("Message", { exact: true }).fill("Can I change the size of this order?");
  await page.getByRole("button", { name: "Send message" }).click();

  await expect(page.getByRole("heading", { name: "Message sent" })).toBeVisible();
  expect(sent).toEqual([
    { name: "Ana Krasniqi", email: USER.email, subject: "Order question", message: "Can I change the size of this order?", orderNumber: "HM-2026-000000123" },
  ]);
});

test("too many messages: a friendly note and the draft stays", async ({ page }) => {
  await mockApi(page, { onContact: () => ({ status: 429, json: { message: "ThrottlerException: Too Many Requests" } }) });
  await page.goto("/#/contact");
  await page.getByLabel("Subject", { exact: true }).fill("Hello");
  await page.getByLabel("Message", { exact: true }).fill("Just saying hello to the team.");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("alert")).toHaveText("You've sent several messages recently. Please wait a few minutes and try again.");
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue("Just saying hello to the team.");
});

test("the page is in Shqip and reachable from the footer", async ({ page }) => {
  await mockApi(page, { user: null, language: "sq" });
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Kontakti" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Le të bisedojmë.");
  await expect(page.getByRole("heading", { name: "Si mund të të ndihmojmë?" })).toBeVisible();
});

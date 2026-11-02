import type { Page, Request, Route } from "@playwright/test";

export const API = "http://api.test/api/v1";
export const IMG = "http://img.test";
const SITE = "http://localhost:5174";

/** An 8 × 8 amber PNG. */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAEklEQVR4nGM4kWfzHx9mGBkKAIhYnEGuk8nrAAAAAElFTkSuQmCC", "base64");

export const USER = {
  id: "u1",
  firstName: "Ana",
  lastName: "Krasniqi",
  email: "ana@example.test",
  phone: "+383 44 000 000",
  address: "Rr. Nëna Terezë 1",
  country: "Kosovo",
  postalCode: "",
  isActive: true,
};

export const CATEGORY = {
  id: "cat-b",
  name: "Bracelet",
  description: null,
  imageUrl: null,
  isActive: true,
  sortOrder: 1,
  builderType: "JEWELRY",
  builderConfig: null,
  designCategoryId: null,
  sizes: [{ id: "s-small", name: "Small", minMeasurementMm: 150, maxMeasurementMm: 200, defaultMeasurementMm: 160 }],
};

const component = (id: string, name: string, price: number) => ({
  id,
  categoryId: CATEGORY.id,
  name,
  description: null,
  imageUrl: `${IMG}/${id}.png`,
  color: null,
  type: null,
  price,
  stock: 50,
  trackStock: true,
  effectiveLengthMm: 40,
  isActive: true,
  sortOrder: 1,
});

/** Four Amber beads fill a 16 cm bracelet at €4.60; two Onyx beads are €6.20 at half length. */
export const COMPONENTS = [component("amber", "Amber", 115), component("onyx", "Onyx", 310)];

export function design(id: string, price: number, items: { id: string; qty: number; unit: number }[], preview: string | null = null) {
  return {
    id,
    name: "My bracelet",
    categoryId: CATEGORY.id,
    origin: "CUSTOMER",
    price,
    isActive: true,
    designPreviewUrl: preview,
    selectedSize: { id: "s-small", name: "Small", selectedMeasurementMm: 160 },
    category: { id: CATEGORY.id, name: "Bracelet", builderType: "JEWELRY" },
    items: items.map((it, position) => ({
      id: `item-${position}`,
      subCategoryId: it.id,
      quantity: it.qty,
      position,
      unitPrice: it.unit,
      subCategory: COMPONENTS.find((c) => c.id === it.id),
    })),
  };
}

export function readyMade(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    name: "Silver bangle",
    categoryId: CATEGORY.id,
    origin: "COMPANY",
    price: 1500,
    stock: 4,
    isActive: true,
    imageUrl: `${IMG}/bangle.png`,
    category: { id: CATEGORY.id, name: "Bracelet", builderType: "JEWELRY" },
    ...extra,
  };
}

type Handler = (req: Request, body: unknown) => { status?: number; json?: unknown; abort?: boolean; delay?: number } | undefined;

export interface MockOptions {
  user?: Record<string, unknown> | null;
  products?: Record<string, unknown>;
  /**
   * false: capture loads (`?cors=1`) fail, as when the image host sends no CORS headers.
   * (Playwright's fulfill adds CORS headers by itself, so a missing header can't be mocked.)
   */
  imageCors?: boolean;
  onOrder?: Handler;
  onProduct?: Handler;
}

/** Routes every API and image request of the page to fixtures, and records the calls. */
export async function mockApi(page: Page, options: MockOptions = {}) {
  const calls: { method: string; path: string; body?: Buffer | null }[] = [];
  const products = { ...(options.products ?? {}) };
  const user = options.user === undefined ? USER : options.user;
  const cors = { "Access-Control-Allow-Origin": SITE, "Access-Control-Allow-Credentials": "true", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE" };

  await page.route(`${IMG}/**`, (route) =>
    options.imageCors === false && new URL(route.request().url()).searchParams.get("cors") === "1"
      ? route.abort("accessdenied")
      : route.fulfill({ status: 200, contentType: "image/png", body: PNG, headers: { "Access-Control-Allow-Origin": "*" } }),
  );

  // Google's script is never loaded: a stand-in draws the button and hands back the ID token in
  // window.__googleCredential (default "test-id-token") when clicked.
  await page.route("https://accounts.google.com/gsi/client", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `window.google = { accounts: { id: {
        initialize(config) { window.__googleConfig = config; },
        renderButton(parent) {
          const button = document.createElement("button");
          button.type = "button";
          button.textContent = "Continue with Google";
          button.onclick = () => window.__googleConfig.callback({ credential: window.__googleCredential || "test-id-token" });
          parent.appendChild(button);
        },
      } } };`,
    }),
  );

  await page.route(`${API}/**`, async (route: Route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace("/api/v1", "");
    const method = req.method();
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
    calls.push({ method, path, body: req.postDataBuffer() });
    const reply = async (json: unknown, status = 200) => route.fulfill({ status, headers: cors, contentType: "application/json", body: JSON.stringify(json) });

    if (path === "/auth/me") return user ? reply(user) : reply({ message: "Unauthorized" }, 401);
    if (path === "/auth/google") {
      const body = req.postDataJSON() as { idToken: string; password?: string };
      if (body.idToken === "bad") return reply({ message: "Unable to sign in with Google" }, 401);
      if (body.idToken === "link-me") {
        if (body.password === undefined)
          return reply({ message: "An account with this email already exists. Enter your password to connect Google.", email: USER.email }, 409);
        if (body.password !== "right-password") return reply({ message: "Incorrect password" }, 401);
      }
      const named = body.idToken !== "no-name";
      return reply({ expiresIn: 3600, user: { ...USER, lastName: named ? USER.lastName : "" }, profileComplete: named });
    }
    if (path === "/auth/register") {
      const body = req.postDataJSON() as Record<string, string>;
      if (body.email === "taken@example.test") return reply({ message: "Email is already in use" }, 409);      return reply({ ...USER, ...body, id: "u-new" }, 201);
    }
    if (path === "/auth/login") return reply({ expiresIn: 3600, user: { ...USER, id: "u-new" } });
    if (path === "/categories") return reply([CATEGORY]);
    if (path === `/categories/${CATEGORY.id}`) return reply(CATEGORY);
    if (path === `/categories/${CATEGORY.id}/sub-categories`) return reply(COMPONENTS);
    if (path === "/products" && method === "GET") return reply([]);
    if (path === "/products" && method === "POST") {
      const custom = options.onProduct?.(req, null);
      if (custom) return reply(custom.json, custom.status);
      return reply(design("p-new", 460, [{ id: "amber", qty: 4, unit: 115 }], `${IMG}/preview.png`), 201);
    }
    const product = path.match(/^\/products\/([^/]+)$/);
    if (product && method === "GET") return products[product[1]] ? reply(products[product[1]]) : reply({ message: "Not found" }, 404);
    if (path === "/orders" && method === "POST") {
      const custom = options.onOrder?.(req, req.postDataJSON());
      if (custom?.delay) await new Promise((r) => setTimeout(r, custom.delay));
      if (custom?.abort) return route.abort("failed");
      if (custom) return reply(custom.json, custom.status);
      return reply(order("o1", Object.values(products)[0]), 201);
    }
    const one = path.match(/^\/orders\/([^/]+)$/);
    if (one) return reply(order(one[1], Object.values(products)[0]));
    if (path === "/orders") return reply({ data: [], total: 0, page: 1, limit: 20 });
    if (path === "/notifications/unread-count") return reply({ count: 0 });
    if (path === "/notifications") return reply([]);
    if (path === "/gift-packaging") return reply([]);
    if (path === "/stats/public") return reply({ users: 1, orders: 1, products: 1 });
    return reply([]);
  });

  return {
    calls,
    count: (method: string, path: string | RegExp) => calls.filter((c) => c.method === method && (typeof path === "string" ? c.path === path : path.test(c.path))).length,
    setProduct: (id: string, value: unknown) => (products[id] = value),
  };
}

function order(id: string, product: unknown) {
  return {
    id,
    orderNumber: "HC-1001",
    status: "PENDING",
    paymentType: "CASH_ON_DELIVERY",
    totalPrice: (product as { price?: number })?.price ?? 0,
    firstName: USER.firstName,
    lastName: USER.lastName,
    phone: USER.phone,
    country: USER.country,
    address: USER.address,
    createdAt: "2026-11-01T10:00:00.000Z",
    productId: (product as { id?: string })?.id ?? "x",
    product,
  };
}

/** Seeds a studio draft before the page loads. */
export async function seedDraft(page: Page, categoryId: string, draft: unknown) {
  await page.addInitScript(
    ([id, d]) => {
      if (sessionStorage.getItem("seeded")) return;
      sessionStorage.setItem("seeded", "1");
      localStorage.setItem("hc.drafts.v1", JSON.stringify({ [id as string]: { draft: d, updatedAt: Date.now() } }));
    },
    [categoryId, draft] as const,
  );
}

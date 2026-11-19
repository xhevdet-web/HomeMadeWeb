/**
 * Google Analytics 4: the website's only analytics code. Everything else calls the small helpers
 * below, never `gtag` itself.
 *
 * - Off unless VITE_GA_MEASUREMENT_ID is set (only `.env.production` sets it), so local
 *   development and the end-to-end tests send nothing.
 * - Optional telemetry: a missing ID, a blocked or failed script, or any error inside gtag never
 *   reaches the website. Calls before the script arrives queue in `dataLayer` as usual.
 * - No personal data: no name, email, phone, address, password, token, uploaded image or the
 *   customer's own text is ever passed in. Products are described by id, catalog name, category
 *   and price only; a customer's design is named after its category, never by its own name.
 * - Google Signals and ad personalisation are off, and the ad consent signals are denied by
 *   default (Consent Mode v2). `setAnalyticsConsent` is ready for a consent banner.
 */
import type { Category, Order, Product } from "../api/models";

type Params = Record<string, string | number | boolean | undefined | GaItem[]>;

export interface GaItem {
  item_id: string;
  item_name: string;
  item_category?: string;
  price?: number;
  quantity?: number;
  index?: number;
  item_list_name?: string;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const MEASUREMENT_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID ?? "").trim();
const CURRENCY = "EUR";
/** GA4 ids look like G-XXXXXXX; anything else is ignored rather than loading a bad script. */
const enabled = /^G-[A-Z0-9]+$/i.test(MEASUREMENT_ID) && typeof window !== "undefined";

let started = false;

/** Runs a gtag command, swallowing every failure: analytics must never break the website. */
function gtag(...args: unknown[]) {
  if (!enabled || !started) return;
  try {
    window.gtag?.(...args);
  } catch {
    // Ignored on purpose.
  }
}

/** Loads gtag.js once and configures GA4. Called once from main.tsx; does nothing when disabled. */
export function initAnalytics() {
  if (!enabled || started) return;
  try {
    window.dataLayer = window.dataLayer || [];
    // gtag.js reads the `arguments` object itself, exactly as Google's snippet pushes it.
    window.gtag = function gtagShim() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    started = true;
    // Consent Mode v2 defaults: measurement only, nothing for advertising.
    gtag("consent", "default", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    // Set globally as well: the Google tag otherwise still sends its own page view on each full
    // load (at the address without the hash, so every page would read as "/").
    gtag("set", { send_page_view: false });
    gtag("js", new Date());
    gtag("config", MEASUREMENT_ID, {
      // Page views are sent by trackPageView on every route, including the first.
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      // A local build with the ID set shows up in GA4 DebugView instead of the reports.
      ...(import.meta.env.DEV ? { debug_mode: true } : {}),
    });

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`;
    // Blocked by an ad blocker or offline: queued events are simply never sent.
    script.onerror = () => undefined;
    document.head.appendChild(script);
  } catch {
    started = false;
  }
}

/** For a future consent banner: grants or withdraws analytics storage (cookies). */
export function setAnalyticsConsent(granted: boolean) {
  gtag("consent", "update", { analytics_storage: granted ? "granted" : "denied" });
}

let lastEvent = { key: "", at: 0 };

/**
 * Sends a GA4 event. The very same event within a second is sent once: React runs effects twice
 * in development, and a double click must not count twice.
 */
export function trackEvent(name: string, params: Params = {}) {
  if (!enabled) return;
  const key = `${name}:${JSON.stringify(params)}`;
  const now = Date.now();
  if (key === lastEvent.key && now - lastEvent.at < 1000) return;
  lastEvent = { key, at: now };
  gtag("event", name, params);
}

/* ---------------- Page views ---------------- */

/** Readable page names for the reports; the website's own title is the same on every page. */
const PAGE_NAMES: Record<string, string> = {
  "": "Home",
  products: "Products",
  studios: "Studios",
  about: "About",
  create: "Create",
  contact: "Contact",
  designs: "My designs",
  checkout: "Checkout",
  orders: "Orders",
  profile: "Profile",
  notifications: "Notifications",
};

let lastPage: string | null = null;
let currentStudio: string | null = null;

/**
 * One page view per route. The website uses hash URLs (`#/products`), and GA4 ignores
 * everything after `#`, so the page is reported at a virtual address (`/products`). The same
 * address twice in a row is sent once (React StrictMode runs effects twice in development).
 */
export function trackPageView(path: string, query: URLSearchParams) {
  const search = query.toString();
  const page = `${path}${search ? `?${search}` : ""}`;
  if (page === lastPage) return;
  lastPage = page;
  const [section = "", slug] = path.split("/").filter(Boolean);
  // Leaving a studio: opening it again later counts as a new visit.
  if (section !== "studios" || !slug || slug !== currentStudio) currentStudio = null;
  let title = PAGE_NAMES[section] ?? "Not found";
  if (section === "studios" && slug) title = `Studio: ${slug}`;
  else if (section === "orders" && slug) title = "Order details";
  gtag("event", "page_view", {
    page_location: `${window.location.origin}${page}`,
    page_title: `${title} | HM Craft`,
  });
}

/* ---------------- Products (GA4 ecommerce) ---------------- */

const euros = (cents: number) => Math.round(cents) / 100;

/** A product as a GA4 item. A customer's design is named after its category, never its own name. */
export function gaItem(product: Product, category?: Pick<Category, "name"> | null, extra: Partial<GaItem> = {}): GaItem {
  const categoryName = category?.name ?? product.category?.name;
  return {
    item_id: product.id,
    item_name: product.origin === "CUSTOMER" ? `${categoryName ?? "Custom"} design` : product.name,
    ...(categoryName ? { item_category: categoryName } : {}),
    price: euros(product.price),
    ...extra,
  };
}

export function trackItemList(listName: string, items: GaItem[]) {
  if (!items.length) return;
  trackEvent("view_item_list", { item_list_name: listName, items: items.slice(0, 50) });
}

export function trackSelectItem(listName: string, item: GaItem) {
  trackEvent("select_item", { item_list_name: listName, items: [item] });
}

export function trackViewItem(item: GaItem) {
  trackEvent("view_item", { currency: CURRENCY, value: item.price ?? 0, items: [item] });
}

export function trackBeginCheckout(item: GaItem) {
  trackEvent("begin_checkout", { currency: CURRENCY, value: euros((item.price ?? 0) * 100 * (item.quantity ?? 1)), items: [item] });
}

const PURCHASES_KEY = "hc.ga.purchases";

/**
 * The order the customer just placed. Sent once per order: the ids already sent are kept in
 * this browser, so a retry, a reload or another tab never counts the same order twice.
 */
export function trackPurchase(order: Pick<Order, "id" | "totalPrice">, item: GaItem) {
  if (!enabled) return;
  let sent: string[] = [];
  try {
    sent = JSON.parse(localStorage.getItem(PURCHASES_KEY) ?? "[]") as string[];
  } catch {
    sent = [];
  }
  if (sent.includes(order.id)) return;
  trackEvent("purchase", { transaction_id: order.id, currency: CURRENCY, value: euros(order.totalPrice), items: [item] });
  try {
    localStorage.setItem(PURCHASES_KEY, JSON.stringify([...sent, order.id].slice(-50)));
  } catch {
    // Storage blocked: the in-page flow still sends it only once.
  }
}

/* ---------------- Account ---------------- */

/** How the customer signed in or registered: "email" or "google". Nothing about the account itself. */
export const trackLogin = (method: "email" | "google") => trackEvent("login", { method });
export const trackSignUp = (method: "email" | "google") => trackEvent("sign_up", { method });

/* ---------------- Creative Studio ---------------- */

interface StudioInfo {
  /** The category's name, e.g. "Gifts". */
  category: string;
  /** Which studio: JEWELRY, GIFT, MUG, APPAREL, CASE or STICKER. */
  studioType: string;
}

const studioParams = ({ category, studioType }: StudioInfo) => ({ category, studio_type: studioType });

/** A studio was opened; moving between its steps is the same visit and is not counted again. */
export function trackStudioOpened(slug: string, info: StudioInfo) {
  if (currentStudio === slug) return;
  currentStudio = slug;
  trackEvent("studio_opened", studioParams(info));
}

/** The first piece went into an empty design (not when a saved design is opened). */
export const trackDesignStarted = (studioType: string) => trackEvent("design_started", { studio_type: studioType });
export const trackDesignPreviewed = (info: StudioInfo) => trackEvent("design_previewed", studioParams(info));
/** "Save design": `save_type` is "update" when an existing saved design was changed, else "new". */
export const trackDesignSaved = (info: StudioInfo, update: boolean) =>
  trackEvent("design_saved", { ...studioParams(info), save_type: update ? "update" : "new" });
export const trackSavedDesignOpened = (info: StudioInfo) => trackEvent("saved_design_opened", studioParams(info));

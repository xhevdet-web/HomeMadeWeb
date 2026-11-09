import { products as fetchProducts, productPage, type ProductPage, type ProductPageQuery } from "../api/catalog";
import { ApiError } from "../api/client";
import type { Category, Product } from "../api/models";
import { lookKey, studioHref } from "../data/homeCategories";
import type { IconName } from "../components/Icon";
import i18n from "../i18n";
import { money } from "./format";

/**
 * How the catalog's COMPANY products are sold. A product with a print area is a blank to design
 * on (the blank mug, apparel bases, phone case models): "made to order", opened in its studio.
 * In a CASE category every product is a phone model, except a ready-made case: it points at the
 * model it fits (baseProductId). Every other COMPANY product is a ready-made piece, ordered as it is.
 */
export function isCustom(p: Pick<Product, "printAreas" | "baseProductId">, category?: Pick<Category, "builderType"> | null) {
  const front = (p.printAreas as { front?: unknown } | null | undefined)?.front;
  return !!front || category?.builderType === "APPAREL" || (category?.builderType === "CASE" && !p.baseProductId);
}

/** "Fits iPhone 15" for a ready-made case; nothing for any other product. */
export const fitsLabel = (p: Pick<Product, "origin" | "baseProduct">, category?: Pick<Category, "builderType"> | null) =>
  category?.builderType === "CASE" && p.origin !== "CUSTOMER" && p.baseProduct?.name ? i18n.t("products.fits", { name: p.baseProduct.name }) : "";

/**
 * Out of stock, as the API decides it: with sizes, when no size has stock left; otherwise (no
 * sizes, or an empty list) when the product's own stock is gone.
 */
export function isSoldOut(p: Pick<Product, "stock" | "sizes">) {
  const sizes = Array.isArray(p.sizes) ? (p.sizes as { stock?: unknown }[]) : [];
  if (sizes.length) return sizes.every((s) => !(Number(s?.stock) > 0));
  return p.stock !== undefined && p.stock <= 0;
}

/** Product photos: the front, then the back if there is one. */
export const productPictures = (p: Product) => [p.imageUrl, p.backImageUrl].filter((src): src is string => !!src);

/** €15, €3,500, or €12.50 when there are cents. */
export function shortMoney(cents: number) {
  if (cents % 100) return money(cents);
  return `€${(cents / 100).toLocaleString("en-US")}`;
}

/** The shown price: "nga €X" (a starting price) for made-to-order blanks. */
export const priceLabel = (p: Product, custom: boolean) => (custom ? i18n.t("products.fromPrice", { price: shortMoney(p.price) }) : shortMoney(p.price));

export type ProductAction = { kind: "order" | "customize" | "notify"; href: string; label: string };

/** What a card's main button does: order it, design it in its studio, or ask about a similar one. */
export function productAction(p: Product, category: Category | null | undefined): ProductAction {
  if (isSoldOut(p)) return { kind: "notify", href: `#/contact?produkti=${encodeURIComponent(p.name)}`, label: i18n.t("products.notify") };
  if (isCustom(p, category) && category) return { kind: "customize", href: studioHref(category), label: i18n.t("products.customize") };
  return { kind: "order", href: `#/checkout?product=${p.id}`, label: i18n.t("designs.order") };
}

/** Line icon for a category tile, by the studio it opens. */
export function categoryIcon(c: Pick<Category, "name" | "builderType" | "builderConfig">): IconName {
  const icons: Record<string, IconName> = { bracelet: "ring", necklace: "necklace", mugs: "mug", apparel: "shirt", cases: "smartphone", stickers: "sticker", gifts: "gift" };
  return icons[lookKey(c) ?? ""] ?? "package";
}

/* ---------------- The products page's listing ---------------- */

const newest = (p: Product) => (p.createdAt ? Date.parse(p.createdAt) : 0);
const byId = (a: Product, b: Product) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * The API's listing rules, applied in the browser: active categories only, the filters, type
 * counts without the type filter, the same tie-breaks (so pages never repeat), then one page.
 * Used when the API is older than server-side paging.
 */
export function pageLocally(all: Product[], q: ProductPageQuery, categories: Category[]): ProductPage {
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const needle = q.search?.trim().toLocaleLowerCase() ?? "";
  const base = all.filter((p) => {
    const c = categoryById.get(p.categoryId);
    if (!c || p.isActive === false) return false;
    if (q.categoryId && p.categoryId !== q.categoryId) return false;
    if (q.inStock && isSoldOut(p)) return false;
    return !needle || [p.name, p.description, p.color, c.name].some((v) => v?.toLocaleLowerCase().includes(needle));
  });
  const custom = (p: Product) => isCustom(p, categoryById.get(p.categoryId));
  const ready = base.filter((p) => !custom(p)).length;
  const counts = { all: base.length, ready, custom: base.length - ready };

  const list = base.filter((p) => (q.type === "custom" ? custom(p) : q.type === "ready" ? !custom(p) : true));
  list.sort((a, b) => {
    if (q.sort === "price_asc" || q.sort === "price_desc") {
      const price = q.sort === "price_asc" ? a.price - b.price : b.price - a.price;
      return price || newest(b) - newest(a) || byId(a, b);
    }
    return newest(b) - newest(a) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || byId(a, b);
  });
  const total = list.length;
  return {
    data: list.slice((q.page - 1) * q.limit, q.page * q.limit),
    meta: { page: q.page, limit: q.limit, total, totalPages: Math.ceil(total / q.limit), counts },
  };
}

/**
 * One page for the products page: filtered, counted and paged by the API. An API from before
 * server-side paging rejects `page` ("property page should not exist") or ignores it and sends
 * the whole list; then the page is made here with the same rules, so either backend works.
 */
export async function loadProductPage(q: ProductPageQuery, categories: Category[], signal: AbortSignal): Promise<ProductPage> {
  try {
    const result = await productPage(q, signal);
    return Array.isArray(result) ? pageLocally(result, q, categories) : result;
  } catch (error) {
    if (error instanceof ApiError && error.status === 400 && /should not exist/i.test(error.message))
      return pageLocally(await fetchProducts({ origin: "COMPANY" }, signal), q, categories);
    throw error;
  }
}

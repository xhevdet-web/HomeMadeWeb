import { request } from "./client";
import {
  activeList,
  parseCategory,
  parseComponent,
  parsePackagingList,
  parseProduct,
  parseProducts,
  type Product,
  type ProductOrigin,
  type PublicStats,
} from "./models";

const id = encodeURIComponent;

export const categories = (signal?: AbortSignal) => request<unknown>("/categories", { signal }).then((v) => activeList(v, parseCategory));

export const category = (categoryId: string, signal?: AbortSignal) =>
  request<unknown>(`/categories/${id(categoryId)}`, { signal }).then(parseCategory);

/** A category's components (beads, gift items, designs…), active only, in admin order. */
export const components = (categoryId: string, signal?: AbortSignal) =>
  request<unknown>(`/categories/${id(categoryId)}/sub-categories`, { signal }).then((v) => activeList(v, parseComponent));

/** The same list via the filter route; used for a category's shared design library. */
export const componentsByCategory = (categoryId: string, signal?: AbortSignal) =>
  request<unknown>("/sub-categories", { params: { categoryId }, signal }).then((v) => activeList(v, parseComponent));

export const component = (subCategoryId: string, signal?: AbortSignal) =>
  request<unknown>(`/sub-categories/${id(subCategoryId)}`, { signal }).then(parseComponent);

/** Active products; the cookie is sent when it exists, so own designs can be included. */
export const products = (query: { categoryId?: string; origin?: ProductOrigin; search?: string }, signal?: AbortSignal) =>
  request<unknown>("/products", { params: { ...query, search: query.search?.trim(), isActive: "true" }, signal }).then(parseProducts);

export interface ProductPageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  /** Every filter except `type`, for the type filter's counts; all = ready + custom. */
  counts: { all: number; ready: number; custom: number };
}
export interface ProductPage {
  data: Product[];
  meta: ProductPageMeta;
}
export interface ProductPageQuery {
  page: number;
  limit: number;
  sort?: "price_asc" | "price_desc";
  type?: "ready" | "custom";
  inStock?: boolean;
  search?: string;
  categoryId?: string;
}

/**
 * One page of the active COMPANY catalog, filtered, sorted and counted by the API (`page` turns
 * that mode on). An API from before paging answers with the plain array instead; that is
 * returned as it is, for the caller to page itself.
 */
export const productPage = (q: ProductPageQuery, signal?: AbortSignal): Promise<ProductPage | Product[]> =>
  request<unknown>("/products", {
    params: {
      origin: "COMPANY",
      isActive: "true",
      page: q.page,
      limit: q.limit,
      sort: q.sort,
      type: q.type,
      inStock: q.inStock ? "true" : undefined,
      // An empty search is a 400: `request` leaves out empty values.
      search: q.search?.trim(),
      categoryId: q.categoryId,
    },
    signal,
  }).then((r) => {
    if (Array.isArray(r)) return parseProducts(r);
    const page = r as { data?: unknown; meta?: ProductPageMeta } | null;
    if (!page || !Array.isArray(page.data) || !page.meta) return parseProducts(r);
    return { data: parseProducts(page.data), meta: page.meta };
  });

export const product = (productId: string, signal?: AbortSignal) =>
  request<unknown>(`/products/${id(productId)}`, { signal }).then(parseProduct);

export const categoryProducts = (categoryId: string, signal?: AbortSignal) =>
  request<unknown>(`/categories/${id(categoryId)}/products`, { signal }).then(parseProducts);

/** Every packaging option, inactive ones too (so saved gifts can still show theirs). */
export const giftPackaging = (signal?: AbortSignal) => request<unknown>("/gift-packaging", { signal }).then(parsePackagingList);

export const publicStats = (signal?: AbortSignal) => request<PublicStats>("/stats/public", { signal });

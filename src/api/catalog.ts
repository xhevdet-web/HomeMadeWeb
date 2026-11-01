import { request } from "./client";
import {
  activeList,
  parseCategory,
  parseComponent,
  parsePackagingList,
  parseProduct,
  parseProducts,
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

export const product = (productId: string, signal?: AbortSignal) =>
  request<unknown>(`/products/${id(productId)}`, { signal }).then(parseProduct);

export const categoryProducts = (categoryId: string, signal?: AbortSignal) =>
  request<unknown>(`/categories/${id(categoryId)}/products`, { signal }).then(parseProducts);

/** Every packaging option, inactive ones too (so saved gifts can still show theirs). */
export const giftPackaging = (signal?: AbortSignal) => request<unknown>("/gift-packaging", { signal }).then(parsePackagingList);

export const publicStats = (signal?: AbortSignal) => request<PublicStats>("/stats/public", { signal });

import { request } from "./client";
import type { Order, OrderPage } from "./models";

export interface OrderInput {
  productId: string;
  /** Only for a ready-made product sold in sizes. */
  size?: string | null;
  /** Only for mugs, stickers and ready-made products. */
  quantity?: number;
  notes?: string;
}

/** Places an order. Never retried automatically: there is no idempotency key. */
export const createOrder = ({ productId, size, quantity, notes }: OrderInput) =>
  request<Order>("/orders", {
    method: "POST",
    auth: true,
    body: {
      productId,
      paymentType: "CASH_ON_DELIVERY",
      ...(size ? { size } : {}),
      ...(quantity ? { quantity } : {}),
      ...(notes?.trim() ? { customerNotes: notes.trim() } : {}),
    },
  });

export const orders = (page: number, signal?: AbortSignal) => request<OrderPage>("/orders", { params: { page, limit: 20 }, auth: true, signal });

export const order = (orderId: string, signal?: AbortSignal) => request<Order>(`/orders/${encodeURIComponent(orderId)}`, { auth: true, signal });

/** How many of a product one order may hold, or null when it is ordered one at a time (as the API rules). */
export function quantityRule(product: { origin?: string; category?: { builderType?: string | null } | null }) {
  const builder = product.category?.builderType;
  if (builder === "STICKER" && product.origin === "COMPANY") return { min: 5, max: 1000 };
  if (builder === "MUG") return { min: 1, max: 100 };
  return null;
}

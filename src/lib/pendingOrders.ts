/**
 * Orders sent but not confirmed, per `userId:productId`, for this browser tab (like the app's
 * commerce store). While one is pending, checkout offers "Check my orders" instead of placing
 * another: there is no idempotency key, so an order is never sent twice.
 */
const key = (userId: string, productId: string) => `hc.pending-order:${userId}:${productId}`;

export function isPending(userId: string, productId: string) {
  try {
    return sessionStorage.getItem(key(userId, productId)) === "1";
  } catch {
    return false;
  }
}

export function setPending(userId: string, productId: string, pending: boolean) {
  try {
    if (pending) sessionStorage.setItem(key(userId, productId), "1");
    else sessionStorage.removeItem(key(userId, productId));
  } catch {
    // Storage blocked: the in-page lock still protects this visit.
  }
}

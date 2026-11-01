import { request } from "./client";
import type { AppNotification } from "./models";

export const notifications = (signal?: AbortSignal) =>
  request<unknown>("/notifications", { auth: true, signal }).then((v) =>
    Array.isArray(v)
      ? (v as AppNotification[]).filter((n) => n && typeof n.id === "string" && typeof n.title === "string" && typeof n.createdAt === "string")
      : [],
  );

export const unreadCount = (signal?: AbortSignal) =>
  request<{ count?: unknown }>("/notifications/unread-count", { auth: true, signal }).then((v) =>
    Number.isSafeInteger(v?.count) ? (v.count as number) : 0,
  );

export const markRead = (notificationId: string) =>
  request<unknown>(`/notifications/${encodeURIComponent(notificationId)}/read`, { method: "PATCH", auth: true });

export const markAllRead = () => request<unknown>("/notifications/read-all", { method: "PATCH", auth: true });

import { errorMessage } from "../api/client";
import type { AppNotification } from "../api/models";
import { markAllRead, markRead, notifications } from "../api/notifications";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Page, PageHeader } from "../components/Page";
import { refreshUnread } from "../components/Nav";
import { useApi } from "../hooks/useApi";
import { formatDate } from "../lib/format";
import { LoadError } from "../studio/StudioShell";
import { useToast } from "../studio/Toasts";

export default function NotificationsPage() {
  const { data, loading, error, retry, setData } = useApi("notifications", notifications);
  const toast = useToast();
  const unread = data?.filter((n) => !n.isRead).length ?? 0;

  /** Optimistic: shown as read at once, put back if the server refuses. */
  const update = async (change: (list: AppNotification[]) => AppNotification[], call: () => Promise<unknown>) => {
    const before = data ?? [];
    setData(change(before));
    try {
      await call();
      refreshUnread();
    } catch (e) {
      setData(before);
      toast(errorMessage(e));
    }
  };

  const open = (n: AppNotification) => {
    if (!n.isRead) void update((list) => list.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)), () => markRead(n.id));
  };

  return (
    <Page>
      <PageHeader
        eyebrow="Notifications"
        title={
          <>
            What's <em className="font-normal text-primary">new.</em>
          </>
        }
        intro={data ? (unread ? `${unread} unread` : "You're all caught up.") : "Updates about your orders."}
        aside={
          unread > 0 && (
            <Button variant="secondary" onClick={() => void update((list) => list.map((x) => ({ ...x, isRead: true })), markAllRead)}>
              Mark all as read
            </Button>
          )
        }
      />

      {loading && (
        <ul className="mt-12 flex flex-col gap-3" role="status" aria-label="Loading notifications">
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="h-20 animate-pulse rounded-2xl bg-card" />
          ))}
        </ul>
      )}
      {error && <LoadError className="mt-12" message={error} onRetry={retry} />}
      {data && data.length === 0 && (
        <div className="mt-12">
          <EmptyState icon="bell" title="No notifications yet" text="When something happens with your orders, you'll see it here." action={{ href: "#/orders", label: "View my orders" }} />
        </div>
      )}
      {data && data.length > 0 && (
        <ul className="mt-12 flex flex-col gap-3">
          {data.map((n) => {
            const body = (
              <>
                <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${n.isRead ? "bg-transparent" : "bg-primary"}`} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className={`block ${n.isRead ? "font-medium text-muted-foreground" : "font-semibold"}`}>{n.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{n.message}</span>
                  <span className="mt-2 block text-xs text-muted-foreground">
                    {formatDate(n.createdAt)}
                    {!n.isRead && <span className="sr-only"> · unread</span>}
                  </span>
                </span>
              </>
            );
            const className = `flex w-full items-start gap-4 rounded-2xl border p-5 text-left transition-colors hover:bg-secondary/50 ${n.isRead ? "border-border bg-card" : "border-primary/40 bg-primary/5"}`;
            return (
              <li key={n.id}>
                {n.orderId ? (
                  <a href={`#/orders/${n.orderId}`} onClick={() => open(n)} className={className}>
                    {body}
                  </a>
                ) : (
                  <button type="button" onClick={() => open(n)} className={className}>
                    {body}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}

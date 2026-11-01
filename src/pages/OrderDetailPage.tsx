import { ORDER_STATUSES, parseTextLayers, paymentLabel, statusIndex, type Order } from "../api/models";
import { order as fetchOrder } from "../api/orders";
import { useAuth } from "../auth/AuthContext";
import { CardTitle } from "../components/CardTitle";
import { Icon } from "../components/Icon";
import { Page, PageHeader } from "../components/Page";
import { StatusPill } from "../components/Status";
import { useApi } from "../hooks/useApi";
import { formatDate, money } from "../lib/format";
import { LoadError } from "../studio/StudioShell";
import { DesignPreview } from "../studios/DesignPreview";

export default function OrderDetailPage({ id, query }: { id: string; query: URLSearchParams }) {
  const { user } = useAuth();
  const { data: order, loading, error, retry } = useApi(`order:${id}`, (signal) => fetchOrder(id, signal));
  const justPlaced = query.get("placed") === "1";

  if (loading)
    return (
      <Page>
        <div className="h-[520px] animate-pulse rounded-[2rem] bg-card" role="status" aria-label="Loading your order" />
      </Page>
    );
  if (error || !order)
    return (
      <Page>
        <LoadError message={error ?? "We couldn't load this order."} onRetry={retry} />
      </Page>
    );

  const items = order.product?.items ?? [];
  const texts = parseTextLayers(order.product?.textLayers);

  return (
    <Page>
      {justPlaced && (
        <div role="status" className="animate-rise mb-12 flex flex-col gap-4 rounded-[2rem] border border-success/40 bg-success/10 p-6 sm:flex-row sm:items-center sm:p-8">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success text-primary-foreground">
            <Icon name="check" size={22} />
          </span>
          <div>
            <p className="font-display text-2xl font-semibold">
              Thank you, {user?.firstName ?? order.firstName}. <em className="font-normal text-success">Your order has been placed.</em>
            </p>
            <p className="mt-1 text-muted-foreground">
              Order {order.orderNumber} · {money(order.totalPrice)} due on delivery
            </p>
          </div>
        </div>
      )}

      <PageHeader
        back={{ href: "#/orders", label: "Back to my orders" }}
        eyebrow="Order tracking"
        title={order.product?.name ?? "Your order"}
        intro={`Order ${order.orderNumber} · Placed ${formatDate(order.createdAt)}`}
        aside={<StatusPill status={order.status} />}
      />

      <div className="mt-12 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-6">
          <div className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 sm:p-10">
            <div className="bg-glow pointer-events-none absolute inset-0" />
            <div className="relative mx-auto w-full max-w-2xl">
              {order.product ? <DesignPreview product={order.product} lightbox className="aspect-[4/3] w-full" /> : <div className="aspect-[4/3] w-full rounded-[1.5rem] bg-secondary" />}
            </div>
          </div>

          <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-10">
            <h2 className="font-display text-3xl font-semibold">
              Your order's <em className="font-normal text-primary">journey.</em>
            </h2>
            <Timeline order={order} />
          </section>
        </div>

        <div className="flex flex-col gap-6 lg:sticky lg:top-28">
          <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
            <CardTitle icon="mapPin">Delivery</CardTitle>
            <address className="space-y-1 not-italic">
              <p className="font-semibold">
                {order.firstName} {order.lastName}
              </p>
              <p className="text-muted-foreground">{order.address}</p>
              <p className="text-muted-foreground">{[order.postalCode, order.country].filter(Boolean).join(", ")}</p>
              <p className="text-muted-foreground">{order.phone}</p>
            </address>
          </section>

          <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
            <CardTitle icon="cash">Payment</CardTitle>
            <p className="font-semibold">
              {paymentLabel(order.paymentType)} · {order.paymentStatus === "PAID" ? "Paid" : "Due on delivery"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Pay when your order arrives.</p>
          </section>

          <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
            <CardTitle icon="message">Your note</CardTitle>
            <p className={order.customerNotes ? "" : "text-muted-foreground"}>{order.customerNotes || "No note added."}</p>
          </section>

          <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
            <CardTitle icon="file">Price details</CardTitle>
            <dl className="space-y-3 text-sm">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">
                    {item.subCategory?.name ?? "Item"} × {item.quantity}
                  </dt>
                  <dd>{money(item.unitPrice * item.quantity)}</dd>
                </div>
              ))}
              {texts.length > 0 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Personal text</dt>
                  <dd>Free</dd>
                </div>
              )}
              {order.quantity && order.quantity > 1 && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Quantity</dt>
                  <dd>×{order.quantity}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between border-t border-border pt-4">
                <dt className="font-semibold">Total</dt>
                <dd className="font-display text-3xl font-semibold text-primary">{money(order.totalPrice)}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </Page>
  );
}

function Timeline({ order }: { order: Order }) {
  const current = statusIndex(order.status);
  const delivered = order.status === "COMPLETED";

  if (current === -1)
    return (
      <p className="mt-6 text-muted-foreground">
        Current status: <span className="font-semibold text-foreground">{order.status.replaceAll("_", " ").toLowerCase()}</span>
      </p>
    );

  return (
    <ol className="mt-8">
      {ORDER_STATUSES.map((s, i) => {
        const done = i < current || delivered;
        const isNow = i === current && !delivered;
        const last = i === ORDER_STATUSES.length - 1;
        return (
          <li key={s.status} className="relative flex gap-5 pb-8 last:pb-0" aria-current={i === current ? "step" : undefined}>
            {!last && <span className={`absolute top-10 bottom-0 left-[19px] w-0.5 ${i < current ? "bg-primary" : "bg-border"}`} aria-hidden="true" />}
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center">
              {done ? (
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Icon name="check" size={16} />
                </span>
              ) : isNow ? (
                <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary ring-4 ring-primary/20">
                  <span className="h-3 w-3 rounded-full bg-primary" />
                </span>
              ) : (
                <span className="h-8 w-8 rounded-full border border-border bg-background" />
              )}
            </span>
            <div className="pt-2">
              <p className={`flex items-center gap-3 font-semibold ${done || isNow ? "" : "text-muted-foreground"}`}>
                {s.label}
                {isNow && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold tracking-widest text-primary-foreground">NOW</span>}
              </p>
              {(isNow || (delivered && last)) && <p className="mt-1 text-muted-foreground">{s.description}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

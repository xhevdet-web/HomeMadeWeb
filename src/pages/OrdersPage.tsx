import { orders } from "../api/orders";
import { paymentLabel } from "../api/models";
import { EmptyState } from "../components/EmptyState";
import { Icon } from "../components/Icon";
import { Page, PageHeader } from "../components/Page";
import { OrderProgress, StatusPill } from "../components/Status";
import { useApi } from "../hooks/useApi";
import { formatDate, money } from "../lib/format";
import { LoadError } from "../studio/StudioShell";
import { DesignPreview } from "../studios/DesignPreview";

export default function OrdersPage({ query }: { query: URLSearchParams }) {
  const page = Math.max(1, Number(query.get("page")) || 1);
  const { data, loading, error, retry } = useApi(`orders:${page}`, (signal) => orders(page, signal));
  const total = data?.meta.total ?? 0;
  const pages = data?.meta.totalPages ?? 1;

  return (
    <Page>
      <PageHeader
        eyebrow="My orders"
        title={
          <>
            From workshop <em className="font-normal text-primary">to doorstep.</em>
          </>
        }
        intro={data ? `${total} order${total === 1 ? "" : "s"}` : "Follow every piece we make for you."}
      />

      {loading && (
        <ul className="mt-12 flex flex-col gap-4" role="status" aria-label="Loading your orders">
          {Array.from({ length: 3 }, (_, i) => (
            <li key={i} className="h-32 animate-pulse rounded-2xl border border-border bg-card" />
          ))}
        </ul>
      )}
      {error && <LoadError className="mt-12" message={error} onRetry={retry} />}
      {data && data.data.length === 0 && (
        <div className="mt-12">
          <EmptyState
            icon="bag"
            title="No orders yet"
            text="When you order a design or a ready-made piece, you can follow it here from workshop to doorstep."
            action={{ href: "#/create", label: "Start designing" }}
          />
        </div>
      )}
      {data && data.data.length > 0 && (
        <ul className="mt-12 flex flex-col gap-4">
          {data.data.map((o) => {
            return (
              <li key={o.id}>
                <a href={`#/orders/${o.id}`} className="group block rounded-2xl border border-border bg-card p-4 transition-colors duration-500 hover:border-foreground/30 sm:p-5">
                  <div className="flex items-center gap-4">
                    <div className="shrink-0">{o.product ? <DesignPreview product={o.product} compact className="h-[72px] w-[72px]" /> : <span className="block h-[72px] w-[72px] rounded-xl bg-secondary" />}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <h2 className="font-display text-xl font-semibold break-words">{o.product?.name ?? "Order"}</h2>
                        <StatusPill status={o.status} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {o.orderNumber} · {formatDate(o.createdAt)}
                        {o.quantity && o.quantity > 1 ? ` · ×${o.quantity}` : ""}
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="font-display text-xl font-semibold text-primary">{money(o.totalPrice)}</p>
                      <p className="text-xs text-muted-foreground">{paymentLabel(o.paymentType)}</p>
                    </div>
                    <Icon name="chevronRight" className="text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between sm:hidden">
                    <p className="font-display text-lg font-semibold text-primary">{money(o.totalPrice)}</p>
                    <p className="text-xs text-muted-foreground">{paymentLabel(o.paymentType)}</p>
                  </div>
                  <OrderProgress status={o.status} className="mt-4" />
                </a>
              </li>
            );
          })}
        </ul>
      )}

      {data && pages > 1 && (
        <nav aria-label="Pagination" className="mt-10 flex justify-center">
          <ul className="flex flex-wrap items-center gap-2">
            <li>
              <a
                href={`#/orders?page=${page - 1}`}
                aria-label="Previous page"
                aria-disabled={page <= 1}
                className={`flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors hover:bg-secondary ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
              >
                <Icon name="chevronLeft" size={18} />
              </a>
            </li>
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <li key={n}>
                <a
                  href={`#/orders?page=${n}`}
                  aria-current={n === page ? "page" : undefined}
                  className={`flex h-10 w-10 items-center justify-center rounded-full font-display font-semibold transition-colors ${
                    n === page ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {n}
                </a>
              </li>
            ))}
            <li>
              <a
                href={`#/orders?page=${page + 1}`}
                aria-label="Next page"
                aria-disabled={page >= pages}
                className={`flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors hover:bg-secondary ${page >= pages ? "pointer-events-none opacity-40" : ""}`}
              >
                <Icon name="chevronRight" size={18} />
              </a>
            </li>
          </ul>
        </nav>
      )}
    </Page>
  );
}

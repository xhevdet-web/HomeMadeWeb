import { EmptyState, PreviewFrame } from "../components/EmptyState";
import { Icon } from "../components/Icon";
import { Page, PageHeader } from "../components/Page";
import { OrderProgress, StatusPill } from "../components/Status";
import { ORDERS, formatDate, money } from "../data/mock";

export default function OrdersPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="My orders"
        title={
          <>
            From workshop <em className="font-normal text-primary">to doorstep.</em>
          </>
        }
        intro={`${ORDERS.length} orders`}
      />

      <ul className="mt-12 flex flex-col gap-4">
        {ORDERS.map((o) => (
          <li key={o.id}>
            <a
              href={`#/orders/${o.id}`}
              className="group block rounded-2xl border border-border bg-card p-4 transition-colors duration-500 hover:border-foreground/30 sm:p-5"
            >
              <div className="flex items-center gap-4">
                <img
                  src={o.item.image}
                  alt=""
                  width={72}
                  height={72}
                  loading="lazy"
                  className="h-[72px] w-[72px] shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <h2 className="font-display text-xl font-semibold">{o.item.name}</h2>
                    <StatusPill status={o.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {o.orderNumber} · {formatDate(o.createdAt)}
                  </p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="font-display text-xl font-semibold text-primary">{money(o.totalPrice)}</p>
                  <p className="text-xs text-muted-foreground">{o.payment}</p>
                </div>
                <Icon
                  name="chevronRight"
                  className="text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground"
                />
              </div>
              <div className="mt-3 flex items-baseline justify-between sm:hidden">
                <p className="font-display text-lg font-semibold text-primary">{money(o.totalPrice)}</p>
                <p className="text-xs text-muted-foreground">{o.payment}</p>
              </div>
              <OrderProgress status={o.status} className="mt-4" />
            </a>
          </li>
        ))}
      </ul>

      <nav aria-label="Pagination" className="mt-10 flex justify-center">
        <ul className="flex items-center gap-2">
          <li>
            <button
              type="button"
              aria-label="Previous page"
              disabled
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground opacity-40"
            >
              <Icon name="chevronLeft" size={18} />
            </button>
          </li>
          {[1, 2, 3].map((n) => (
            <li key={n}>
              <button
                type="button"
                aria-current={n === 1 ? "page" : undefined}
                className={`flex h-10 w-10 items-center justify-center rounded-full font-display font-semibold transition-colors ${
                  n === 1 ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {n}
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              aria-label="Next page"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-secondary"
            >
              <Icon name="chevronRight" size={18} />
            </button>
          </li>
        </ul>
      </nav>

      <PreviewFrame label="Empty state preview">
        <EmptyState
          icon="bag"
          title="No orders yet"
          text="When you order a design or a ready-made piece, you can follow it here from workshop to doorstep."
          action={{ href: "#/create", label: "Start designing" }}
        />
      </PreviewFrame>
    </Page>
  );
}

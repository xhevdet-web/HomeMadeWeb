import { useState } from "react";
import { ButtonLink } from "../components/Button";
import { CardTitle } from "../components/CardTitle";
import { Stepper, inputClass } from "../components/Controls";
import { Icon } from "../components/Icon";
import { Page, PageHeader } from "../components/Page";
import { StepIndicator } from "../components/StepIndicator";
import { DELIVERY_PRICE, NEW_ORDER_ID, PAYMENT_METHOD, money, user } from "../data/mock";
import { useOrderItem } from "../studio/StudioContext";
import { ItemImage } from "../studios/registry";

export default function CheckoutPage({ query }: { query: URLSearchParams }) {
  const item = useOrderItem(query);
  const [quantity, setQuantity] = useState(() => Math.max(1, Number(query.get("qty")) || 1));
  const subtotal = item.unitPrice * quantity;
  const total = subtotal + DELIVERY_PRICE;

  return (
    <Page>
      <PageHeader
        back={{ href: item.editHref, label: "Back to design" }}
        eyebrow="Checkout"
        title={
          <>
            Almost <em className="font-normal text-primary">yours.</em>
          </>
        }
      />

      <StepIndicator steps={["Step 1 of 2: Your design", "Step 2 of 2: Delivery & payment"]} active={1} className="mt-10" />

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-6">
          {/* Deliver to */}
          <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
            <CardTitle
              icon="mapPin"
              action={
                <a href="#/profile" className="text-sm font-semibold text-primary hover:underline">
                  Edit delivery
                </a>
              }
            >
              Deliver to
            </CardTitle>
            <address className="space-y-1 not-italic">
              <p className="font-semibold">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-muted-foreground">{user.address.street}</p>
              <p className="text-muted-foreground">
                {user.address.postalCode}, {user.address.country}
              </p>
              <p className="text-muted-foreground">{user.phone}</p>
            </address>
          </section>

          {/* Payment */}
          <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
            <CardTitle icon="cash">Payment</CardTitle>
            <div role="radiogroup" aria-label="Payment method">
              <div
                role="radio"
                aria-checked="true"
                tabIndex={0}
                className="flex items-start gap-4 rounded-2xl border border-primary bg-primary/10 p-5"
              >
                <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-primary">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                </span>
                <span>
                  <span className="block font-semibold">{PAYMENT_METHOD}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">Nothing to pay now. Pay when your piece arrives.</span>
                </span>
              </div>
            </div>
          </section>

          {/* Delivery note */}
          <details className="group rounded-[2rem] border border-border bg-card p-6 sm:p-8">
            <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Icon name="message" size={18} />
              </span>
              <span className="flex-1">
                <span className="block font-display text-xl font-semibold">Add a delivery note</span>
                <span className="block text-sm text-muted-foreground">Optional · anything your courier should know</span>
              </span>
              <Icon name="chevronDown" className="text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <label htmlFor="delivery-note" className="sr-only">
              Delivery note
            </label>
            <textarea
              id="delivery-note"
              rows={3}
              placeholder="e.g. Ring twice, the doorbell is quiet."
              className={`${inputClass} mt-5 resize-none`}
            />
          </details>
        </div>

        {/* Order summary */}
        <aside aria-label="Order summary" className="rounded-[2rem] border border-border bg-card p-6 sm:p-8 lg:sticky lg:top-28">
          <h2 className="font-display text-xl font-semibold">Order summary</h2>
          <div className="mt-5 flex gap-4">
            <ItemImage item={item} className="h-20 w-20 shrink-0 rounded-2xl" />
            <div className="min-w-0">
              <p className="font-display text-lg leading-tight font-semibold">{item.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.meta}</p>
              <a href={item.editHref} className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
                <Icon name="pencil" size={13} /> Edit design
              </a>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Quantity</span>
            <Stepper value={quantity} onChange={setQuantity} label="quantity" />
          </div>

          <dl className="mt-6 space-y-3 border-t border-border pt-6 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">
                Design{quantity > 1 && ` × ${quantity}`}
              </dt>
              <dd>{money(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Delivery</dt>
              <dd>{money(DELIVERY_PRICE)}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-border pt-4">
              <dt className="font-semibold">Total due on delivery</dt>
              <dd className="font-display text-3xl font-semibold text-primary">{money(total)}</dd>
            </div>
          </dl>

          <ButtonLink href={`#/orders/${NEW_ORDER_ID}?placed=1&${item.ref}&qty=${quantity}`} size="lg" glow className="mt-8 w-full">
            Place Order
          </ButtonLink>
          <p className="mt-3 text-center text-sm text-muted-foreground">Pay cash when your order arrives.</p>
        </aside>
      </div>
    </Page>
  );
}

import { useRef, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { updateProfile } from "../api/auth";
import { product as fetchProduct } from "../api/catalog";
import { ApiError, errorMessage } from "../api/client";
import { missingDelivery, parseSizes, paymentLabel, type Product, type SizeStock, type User } from "../api/models";
import { createOrder, quantityRule } from "../api/orders";
import { useAuth } from "../auth/AuthContext";
import { Button, ButtonLink } from "../components/Button";
import { CardTitle } from "../components/CardTitle";
import { Stepper, inputClass } from "../components/Controls";
import { Icon } from "../components/Icon";
import { Page, PageHeader } from "../components/Page";
import { StepIndicator } from "../components/StepIndicator";
import { invalidate, useApi } from "../hooks/useApi";
import { studioBuilder, studioHref, useStudioCategories } from "../data/homeCategories";
import i18n from "../i18n";
import { cm, money } from "../lib/format";
import { isPending, setPending } from "../lib/pendingOrders";
import { navigate } from "../router";
import { LoadError } from "../studio/StudioShell";
import { corsImage } from "../studio/capture";
import { useStudio } from "../studio/StudioContext";
import { DesignPreview } from "../studios/DesignPreview";
import { MIN_JEWELRY_PRICE_CENTS, minimumMessage, missingForMinimum } from "../studios/jewelry/logic";

/** The app's companyUnavailable: why a ready-made product can't be ordered right now. */
function companyUnavailable(product: Product, sizes: SizeStock[], size: string | null) {
  if (product.isActive !== true) return i18n.t("checkout.unavailable");
  if (sizes.length) {
    if (!size) return i18n.t("checkout.chooseSize");
    return (sizes.find((s) => s.size === size)?.stock ?? 0) > 0 ? null : i18n.t("checkout.sizeSoldOut", { size });
  }
  if (!Number.isSafeInteger(product.stock) || product.stock! < 0) return i18n.t("checkout.stockUnknown");
  return product.stock === 0 ? i18n.t("checkout.outOfStock") : null;
}

const PROFILE_ERROR = /profile|firstName|lastName|phone|country|address/i;
const STOCK_ERROR = /stock|inventory|insufficient|sold out/i;

export function DeliveryForm({ user, onSaved, submitLabel }: { user: User; onSaved: (u: User) => void; submitLabel?: string }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    country: user.country,
    address: user.address,
    postalCode: user.postalCode,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // Only changed fields are sent; an empty postal code is cleared.
      const changes: Record<string, string | null> = {};
      for (const [k, v] of Object.entries(form)) {
        const value = v.trim();
        if (value !== (user[k as keyof User] ?? "")) changes[k] = k === "postalCode" && !value ? null : value;
      }
      onSaved(Object.keys(changes).length ? await updateProfile(changes) : user);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const field = (k: keyof typeof form, label: string, opts: { type?: string; auto?: string; required?: boolean; wide?: boolean } = {}) => (
    <div className={opts.wide ? "sm:col-span-2" : ""}>
      <label htmlFor={`delivery-${k}`} className="mb-1.5 block text-sm font-semibold">
        {label} {!opts.required && <span className="font-normal text-muted-foreground">{t("common.optional")}</span>}
      </label>
      <input id={`delivery-${k}`} type={opts.type ?? "text"} autoComplete={opts.auto} required={opts.required} value={form[k]} onChange={set(k)} className={inputClass} />
    </div>
  );

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      {field("firstName", t("delivery.firstName"), { auto: "given-name", required: true })}
      {field("lastName", t("delivery.lastName"), { auto: "family-name", required: true })}
      {field("phone", t("delivery.phone"), { type: "tel", auto: "tel", required: true })}
      {field("country", t("delivery.country"), { auto: "country-name", required: true })}
      {field("address", t("delivery.address"), { auto: "street-address", required: true, wide: true })}
      {field("postalCode", t("delivery.postalCode"), { auto: "postal-code" })}
      {error && (
        <p role="alert" className="text-sm text-destructive sm:col-span-2">
          {error}
        </p>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={busy}>
          {busy ? t("common.saving") : (submitLabel ?? t("delivery.save"))}
        </Button>
      </div>
    </form>
  );
}

export default function CheckoutPage({ query }: { query: URLSearchParams }) {
  const { t } = useTranslation();
  const { user, setUser } = useAuth();
  const { clearOrdered } = useStudio();
  const categories = useStudioCategories();
  const productId = query.get("design") ?? query.get("product");
  const { data: product, loading, error, retry, setData: setProduct } = useApi(productId ? `checkout:${productId}` : null, (signal) => fetchProduct(productId!, signal));
  const [quantity, setQuantity] = useState(() => Math.max(1, Number(query.get("qty")) || 1));
  const [size, setSize] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [editing, setEditing] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [, rerender] = useState(0);
  const sending = useRef(false);
  const formRef = useRef<HTMLElement>(null);

  if (!productId)
    return (
      <Page>
        <LoadError message={t("checkout.nothing")} onRetry={() => navigate("#/designs")} />
      </Page>
    );
  if (loading || !user)
    return (
      <Page>
        <div className="h-[520px] animate-pulse rounded-[2rem] bg-card" role="status" aria-label={t("checkout.loading")} />
      </Page>
    );
  if (error || !product)
    return (
      <Page>
        <LoadError message={error ?? t("checkout.loadFailed")} onRetry={retry} />
      </Page>
    );

  const readyMade = product.origin === "COMPANY";
  const category = categories.data?.find((c) => c.id === product.categoryId);
  const jewelry = category ? studioBuilder(category) === "JEWELRY" : product.category?.builderType === "JEWELRY";
  const sizes = readyMade ? parseSizes(product.sizes) : [];
  // Sized ready-made products are ordered one at a time, like every design except mugs.
  const rule = sizes.length ? null : quantityRule(product);
  const qty = rule ? Math.min(rule.max, Math.max(rule.min, quantity)) : 1;
  const needsDelivery = missingDelivery(user).length > 0 || editing;
  const pending = isPending(user.id, product.id);
  const belowMinimum = !readyMade && jewelry && product.price < MIN_JEWELRY_PRICE_CENTS;
  const unavailable = readyMade
    ? companyUnavailable(product, sizes, size)
    : belowMinimum
      ? minimumMessage(category ?? { name: product.category?.name ?? "", builderConfig: null })
      : null;
  const editHref = category && !readyMade ? `${studioHref(category, "design")}?load=${product.id}` : null;
  const measurement = Number(product.selectedSize?.selectedMeasurementMm);
  const meta = [product.category?.name ?? category?.name, product.selectedSize?.name, measurement > 0 ? cm(measurement) : null, product.baseProduct?.name]
    .filter(Boolean)
    .join(" · ");

  const lock = (on: boolean) => {
    setPending(user.id, product.id, on);
    rerender((n) => n + 1);
  };

  /** After a stock rejection, the new availability is shown right away. */
  const refreshStock = async () => {
    try {
      if (readyMade) setProduct(await fetchProduct(product.id));
      else invalidate(`studio:${product.categoryId}`);
    } catch {
      setOrderError((m) => `${m ?? ""} ${t("checkout.stockRefreshFailed")}`.trim());
    }
  };

  const place = async () => {
    if (sending.current || isPending(user.id, product.id) || needsDelivery || unavailable) return;
    sending.current = true;
    setPlacing(true);
    setOrderError(null);
    setUncertain(false);
    lock(true);
    try {
      const order = await createOrder({ productId: product.id, size: sizes.length ? size : undefined, quantity: rule ? qty : undefined, notes });
      // Stays locked, so the back button can't submit this checkout again.
      clearOrdered(product.id);
      invalidate("orders");
      invalidate(`studio:${product.categoryId}`);
      navigate(`#/orders/${order.id}?placed=1`);
    } catch (e) {
      // Never retried: without an idempotency key an unknown result must be checked first.
      const unsure = e instanceof ApiError && (e.kind === "network" || e.kind === "timeout" || e.status >= 500);
      if (unsure) setUncertain(true);
      else {
        lock(false);
        const message = errorMessage(e);
        setOrderError(message);
        if (e instanceof ApiError && [400, 409, 422].includes(e.status)) {
          if (PROFILE_ERROR.test(message)) setEditing(true);
          if (STOCK_ERROR.test(message)) await refreshStock();
        }
      }
    } finally {
      sending.current = false;
      setPlacing(false);
    }
  };

  const openDelivery = () => {
    setEditing(true);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      formRef.current?.querySelector("input")?.focus({ preventScroll: true });
    });
  };

  const locked = pending || uncertain;
  const caption = needsDelivery ? t("checkout.needDelivery") : (unavailable ?? t("checkout.payCash"));

  return (
    <Page>
      <PageHeader
        back={{ href: query.get("design") ? "#/designs" : "#/studios", label: query.get("design") ? t("checkout.backToDesigns") : t("checkout.backToStudios") }}
        eyebrow={t("checkout.eyebrow")}
        title={
          <>
            {t("checkout.title")} <em className="font-normal text-primary">{t("checkout.titleAccent")}</em>
          </>
        }
      />
      <StepIndicator steps={[t("checkout.stepDesign"), t("checkout.stepDelivery")]} active={1} className="mt-10" />

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-6">
          <section ref={formRef} className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
            <CardTitle
              icon="mapPin"
              action={
                !needsDelivery &&
                !locked && (
                  <button type="button" onClick={openDelivery} className="text-sm font-semibold text-primary hover:underline">
                    {t("checkout.editDelivery")}
                  </button>
                )
              }
            >
              {t("checkout.deliverTo")}
            </CardTitle>
            {needsDelivery ? (
              <>
                <p className="mb-5 text-sm text-muted-foreground">
                  {t("checkout.needDelivery")} {t("checkout.postalOptional")}
                </p>
                <DeliveryForm
                  user={user}
                  submitLabel={t("checkout.saveAndContinue")}
                  onSaved={(u) => {
                    setUser(u);
                    setEditing(false);
                  }}
                />
              </>
            ) : (
              <address className="space-y-1 not-italic">
                <p className="font-semibold">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-muted-foreground">{user.address}</p>
                <p className="text-muted-foreground">{[user.postalCode, user.country].filter(Boolean).join(", ")}</p>
                <p className="text-muted-foreground">{user.phone}</p>
              </address>
            )}
          </section>

          <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
            <CardTitle icon="cash">{t("checkout.payment")}</CardTitle>
            <div role="radiogroup" aria-label={t("checkout.paymentMethod")}>
              <div role="radio" aria-checked="true" tabIndex={0} className="flex items-start gap-4 rounded-2xl border border-primary bg-primary/10 p-5">
                <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-primary">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                </span>
                <span>
                  <span className="block font-semibold">{paymentLabel("CASH_ON_DELIVERY")}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{t("checkout.payCash")}</span>
                </span>
              </div>
            </div>
          </section>

          <details className="group rounded-[2rem] border border-border bg-card p-6 sm:p-8">
            <summary className="flex cursor-pointer list-none items-center gap-3 [&::-webkit-details-marker]:hidden">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
                <Icon name="message" size={18} />
              </span>
              <span className="flex-1">
                <span className="block font-display text-xl font-semibold">{t("checkout.noteTitle")}</span>
                <span className="block text-sm text-muted-foreground">{t("checkout.noteSummary")}</span>
              </span>
              <Icon name="chevronDown" className="text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <label htmlFor="delivery-note" className="sr-only">
              {t("checkout.noteLabel")}
            </label>
            <textarea
              id="delivery-note"
              rows={3}
              maxLength={5000}
              value={notes}
              disabled={locked}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("checkout.notePlaceholder")}
              className={`${inputClass} mt-5 resize-none`}
            />
          </details>
        </div>

        <aside aria-label={t("checkout.summary")} className="rounded-[2rem] border border-border bg-card p-6 sm:p-8 lg:sticky lg:top-28">
          <h2 className="font-display text-xl font-semibold">{t("checkout.summary")}</h2>
          <div className="mt-5">
            <DesignPreview product={product} category={category} lightbox missingNote className="aspect-square min-h-40 w-full" />
          </div>
          <p className="mt-5 font-display text-xl leading-tight font-semibold break-words">{product.name}</p>
          {meta && <p className="mt-1 text-sm text-muted-foreground">{meta}</p>}

          {!readyMade && (product.items?.length ?? 0) > 0 && (
            <details className="group mt-5 rounded-2xl border border-border">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                {jewelry ? t("checkout.beadsDetails") : t("checkout.itemsDetails")}
                <Icon name="chevronDown" size={16} className="text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <ul className="space-y-2.5 border-t border-border px-4 py-3 text-sm">
                {product.items!.map((item) => {
                  const src = item.customImageUrl ?? item.subCategory?.imageUrl;
                  return (
                    <li key={item.id} className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary">
                        {src && <img {...corsImage} src={src} alt="" loading="lazy" className="h-8 w-8 object-contain" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">
                        {item.customImageUrl ? t("checkout.yourImage") : item.subCategory?.name} × {item.quantity}
                      </span>
                      <span>{money(item.unitPrice * item.quantity)}</span>
                    </li>
                  );
                })}
              </ul>
            </details>
          )}

          {sizes.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-sm text-muted-foreground">{t("checkout.size")}</p>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("checkout.size")}>
                {sizes.map((s) => (
                  <button
                    key={s.size}
                    type="button"
                    role="radio"
                    aria-checked={size === s.size}
                    disabled={s.stock <= 0 || locked}
                    onClick={() => setSize(s.size)}
                    className={`min-h-11 rounded-full border px-4 text-sm font-semibold disabled:line-through disabled:opacity-40 ${size === s.size ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`}
                  >
                    {s.size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {rule && (
            <div className="mt-6 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{rule.min > 1 ? t("checkout.quantityFrom", { min: rule.min }) : t("checkout.quantity")}</span>
              <Stepper value={qty} min={rule.min} max={rule.max} onChange={setQuantity} label={t("checkout.quantityLabel")} />
            </div>
          )}

          <dl className="mt-6 space-y-3 border-t border-border pt-6 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">
                {product.name}
                {qty > 1 && ` × ${qty}`}
              </dt>
              <dd>{money(product.price * qty)}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-border pt-4">
              <dt className="font-semibold">{t("checkout.totalDue")}</dt>
              <dd className="font-display text-3xl font-semibold text-primary">{money(product.price * qty)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">{t("checkout.finalTotalNote")}</p>

          {locked && !placing ? (
            <div className="mt-8">
              <ButtonLink href="#/orders" size="lg" className="w-full">
                {t("checkout.checkOrders")}
              </ButtonLink>
              <p role="alert" className="mt-3 rounded-2xl border border-primary/40 bg-primary/10 p-4 text-sm">
                {uncertain ? t("checkout.uncertain") : t("checkout.pendingNotice")}
              </p>
            </div>
          ) : (
            <>
              {needsDelivery && !editing ? (
                <Button size="lg" glow className="mt-8 w-full" onClick={openDelivery}>
                  {t("checkout.addDelivery")}
                </Button>
              ) : (
                <Button size="lg" glow className="mt-8 w-full" onClick={() => void place()} disabled={needsDelivery || !!unavailable || placing}>
                  {placing ? t("checkout.placing") : t("checkout.placeOrder")}
                </Button>
              )}
              <p role="status" className="mt-3 text-center text-sm text-muted-foreground">
                {caption}
                {belowMinimum && <span className="mt-1 block font-semibold text-foreground">{missingForMinimum(product.price)}</span>}
              </p>
              {belowMinimum && editHref && (
                <p className="mt-2 text-center">
                  <a href={editHref} className="text-sm font-semibold text-primary hover:underline">
                    {t("checkout.editDesign")}
                  </a>
                </p>
              )}
              {orderError && (
                <p role="alert" className="mt-3 text-center text-sm text-destructive">
                  {orderError}
                </p>
              )}
            </>
          )}
        </aside>
      </div>
    </Page>
  );
}

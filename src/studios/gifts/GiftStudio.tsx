import { useMemo, useState, type ReactNode } from "react";
import { colorAvailable, needsColor, packagingAvailable, type Category, type Component, type GiftPackaging } from "../../api/models";
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { Page, PageHeader } from "../../components/Page";
import { studioHref } from "../../data/homeCategories";
import { money } from "../../lib/format";
import { backOrNavigate } from "../../router";
import { corsImage, imageSize } from "../../studio/capture";
import type { GiftDraft } from "../../studio/drafts";
import { imageElement } from "../../studio/elements";
import { useSaveDesign, useStudioHistory } from "../../studio/StudioContext";
import { Notice } from "../../studio/StudioShell";
import { useToast } from "../../studio/Toasts";
import { ReadyMade } from "../ReadyMade";
import { componentById, stockProblem, stockState, type StudioProps } from "../data";
import { GiftBox } from "./GiftBox";
import { GiftCard } from "./GiftCard";
import { boxGeometry, boxHex, captureGift, colorOf, contentsOf, fits, giftInput, giftPrice, layoutSlots, packagingOf, slotGrid, slotOrder, typeFilters, usableBundle } from "./logic";
import i18n from "../../i18n";

// Re-renders with the app when the language changes.
const t = i18n.t.bind(i18n);

const STEPS = ["box", "fill", "note", "review"] as const;
type StepKey = (typeof STEPS)[number];

const RECIPIENT_MAX = 60;
const MESSAGE_MAX = 200;
const QUICK = ["birthday", "thinking", "thanks", "congrats"] as const;

/**
 * Each step has its own address on the same page (`?step=`), so the browser's Back and Forward
 * move between steps while the studio, and its undo history, stays as it is.
 */
export function giftStepHref(category: Pick<Category, "name">, step: StepKey) {
  return `${studioHref(category)}${step === "box" ? "" : `?step=${step}`}`;
}

/** The step asked for; the older /design and /preview links (e.g. "Edit copy") still land right. */
const requestedStep = (route: string | undefined, query: URLSearchParams | undefined): StepKey => {
  const asked = query?.get("step");
  if (asked && (STEPS as readonly string[]).includes(asked)) return asked as StepKey;
  return route === "preview" ? "review" : route === "design" ? "fill" : "box";
};

/** Lowest price a customer can pay for the packaging: with its cheapest available colour. */
const fromPrice = (p: GiftPackaging) => {
  const adjustments = needsColor(p) ? p.colors.filter(colorAvailable).map((c) => c.priceAdjustment) : [];
  return p.price + (adjustments.length ? Math.min(...adjustments) : 0);
};

const capacityLabel = (p: GiftPackaging) => (p.capacity ? t("giftFlow.slots", { count: p.capacity }) : t("giftFlow.anySize"));

const panel = "flex min-w-0 flex-col gap-6 rounded-[2rem] border border-border bg-card p-5 sm:p-8";
const heading = "font-display text-2xl font-semibold sm:text-3xl";

/**
 * The Gift Studio in four steps on one page: Box → Fill → Note → Review, with the box drawn live
 * and the running total below. Packaging, items, types and bundles all come from the catalog.
 */
export function GiftStudio({ category, data, step: route, query }: StudioProps) {
  const history = useStudioHistory(category.id, "GIFT");
  const { state: d, dispatch: update } = history;
  const toast = useToast();
  const [filter, setFilter] = useState("");
  const [closed, setClosed] = useState(false);
  const byId = useMemo(() => componentById(data), [data]);
  const saver = useSaveDesign(category, async () => ({ input: giftInput(category, d, byId), files: { preview: await captureGift(d, data) } }));

  const offered = data.packaging.filter((p) => p.isActive);
  const p = packagingOf(d, data);
  const color = colorOf(d, p);
  const items = slotOrder(d);
  const textEls = d.elements.filter((e) => e.kind === "text");
  const total = giftPrice(d, data, byId);
  const used = (ref: string) => items.filter((e) => e.ref === ref).length;
  const full = p?.capacity != null && items.length >= p.capacity;
  const overBy = p?.capacity != null ? items.length - p.capacity : 0;
  const misfit = items.map((e) => byId.get(e.ref ?? "")).find((c) => c && !fits(c, p));
  const undo = { label: t("studio.toolbar.undo"), onClick: history.undo };

  const boxBlocked = !p ? t("giftFlow.needBox") : needsColor(p) && !color ? t("giftFlow.needColor") : null;
  const fillBlocked =
    boxBlocked ??
    (!items.length
      ? t("giftFlow.needItem")
      : overBy > 0
        ? t("giftFlow.overCapacity", { count: overBy, capacity: p?.capacity })
        : misfit
          ? t("giftFlow.doesNotFit", { name: misfit.name })
          : null);
  const orderBlocked =
    fillBlocked ??
    (p && !packagingAvailable(p)
      ? t("gifts.soldOut", { name: p.name })
      : color && !colorAvailable(color)
        ? t("gifts.soldOut", { name: `${p?.name} · ${color.name}` })
        : stockProblem(items.map((e) => e.ref), byId));
  const reachable = (s: StepKey) => s === "box" || (s === "review" ? !fillBlocked : !boxBlocked);
  // A step that isn't ready yet (an old link, a reload after emptying the box) opens the one to finish first.
  const asked = requestedStep(route, query);
  const step: StepKey = reachable(asked) ? asked : boxBlocked ? "box" : "fill";
  const index = STEPS.indexOf(step);
  const nextBlocked = step === "box" ? boxBlocked : step === "fill" ? fillBlocked : null;
  const go = (s: StepKey) => backOrNavigate(giftStepHref(category, s));

  /** Changing the box keeps what fits (by type, then up to its capacity) and says what was taken out. */
  const chooseBox = (next: GiftPackaging) => {
    const keepColor = next.colors.find((c) => c.id === d.colorId && colorAvailable(c));
    const nextColor = needsColor(next) ? (keepColor ?? next.colors.find(colorAvailable) ?? null) : null;
    const drop = new Set<string>();
    let kept = 0;
    for (const e of items) {
      const c = byId.get(e.ref ?? "");
      if ((c && !fits(c, next)) || (next.capacity != null && kept >= next.capacity)) drop.add(e.id);
      else kept++;
    }
    update((x) => layoutSlots({ ...x, packagingId: next.id, colorId: nextColor?.id ?? null, elements: x.elements.filter((e) => !drop.has(e.id)) }, next));
    if (drop.size) toast(t("giftFlow.removedToFit", { count: drop.size }), { action: undo });
  };

  const add = async (c: Component) => {
    if (!p || !c.imageUrl) return;
    if (full) return toast(t("giftFlow.boxFull"));
    const stock = stockState(c, used(c.id));
    if (stock.disabled) return toast(c.stock <= 0 ? t("gifts.soldOut", { name: c.name }) : t("gifts.allUsed", { name: c.name }));
    const size = await imageSize(c.imageUrl);
    update((x) => {
      if (p.capacity != null && x.elements.filter((e) => e.kind === "image").length >= p.capacity) return x;
      const z = Math.max(0, ...x.elements.map((e) => e.z)) + 1;
      const el = imageElement({ src: c.imageUrl!, ref: c.id, name: c.name, aspect: size.height / size.width, scale: 0.2, z });
      return layoutSlots({ ...x, elements: [...x.elements, el] }, p);
    });
  };

  const remove = (id: string) => {
    const name = d.elements.find((e) => e.id === id)?.name ?? t("order.item");
    update((x) => layoutSlots({ ...x, elements: x.elements.filter((e) => e.id !== id) }, p));
    toast(t("giftFlow.removed", { name }), { action: undo });
  };
  /** The minus on an item: takes out the one added last. */
  const removeOne = (ref: string) => {
    const last = [...items].reverse().find((e) => e.ref === ref);
    if (last) update((x) => layoutSlots({ ...x, elements: x.elements.filter((e) => e.id !== last.id) }, p));
  };

  const applyBundle = async (bundle: ReturnType<typeof usableBundle>) => {
    const sizes = await Promise.all(bundle.items.map((i) => imageSize(i.component.imageUrl!)));
    update((x) => {
      const kept = x.elements.filter((e) => e.kind !== "image");
      let z = Math.max(0, ...kept.map((e) => e.z));
      const added = bundle.items.flatMap((i, k) =>
        Array.from({ length: i.quantity }, () =>
          imageElement({ src: i.component.imageUrl!, ref: i.component.id, name: i.component.name, aspect: sizes[k].height / sizes[k].width, scale: 0.2, z: ++z }),
        ),
      );
      return layoutSlots({ ...x, elements: [...kept, ...added] }, p);
    });
    toast(t("giftFlow.bundleAdded", { name: bundle.name }), { action: undo });
  };

  const summary = t("giftFlow.summary", {
    items: t("gifts.items", { count: items.length }),
    box: p ? `${p.name}${color ? ` · ${color.name}` : ""}` : t("giftFlow.noBox"),
  });

  let content: ReactNode;
  if (step === "box")
    content = (
      <section className={panel} aria-labelledby="gift-step-title">
        <h2 id="gift-step-title" className={heading}>
          {t("giftFlow.chooseBox")}
        </h2>
        <div role="radiogroup" aria-label={t("gifts.packaging")} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {offered.map((o) => {
            const active = d.packagingId === o.id;
            const price = active ? o.price + (color?.priceAdjustment ?? 0) : fromPrice(o);
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={active}
                disabled={!packagingAvailable(o)}
                onClick={() => chooseBox(o)}
                className={`flex flex-col rounded-2xl border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                  active ? "border-primary bg-primary/10 shadow-glow" : "border-border hover:border-foreground/30"
                }`}
              >
                <span className="flex h-24 items-center justify-center">
                  {o.imageUrl ? (
                    <img {...corsImage} src={o.imageUrl} alt="" className="max-h-24 w-auto object-contain" />
                  ) : (
                    <span className="w-24">
                      <GiftBox shape={o.shape} transparent={o.type === "TRANSPARENT"} hex={o.type === "TRANSPARENT" ? "#D9CFC1" : "#2B2F45"} insideLabel={false} />
                    </span>
                  )}
                </span>
                <span className="mt-3 font-semibold">{o.name}</span>
                {o.description && <span className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{o.description}</span>}
                <span className="mt-2 text-sm text-primary">
                  {capacityLabel(o)} · {money(price)}
                </span>
                {!packagingAvailable(o) && <span className="mt-1 text-xs text-muted-foreground">{t("studio.soldOut")}</span>}
              </button>
            );
          })}
        </div>
        {p && needsColor(p) && (
          <div>
            <h3 className="font-display text-xl font-semibold">{t("giftFlow.color")}</h3>
            <div role="radiogroup" aria-label={t("gifts.boxColour")} className="mt-4 flex flex-wrap gap-4">
              {p.colors
                .filter((c) => c.isActive)
                .map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={d.colorId === c.id}
                    disabled={!colorAvailable(c)}
                    onClick={() => update((x) => ({ ...x, colorId: c.id }))}
                    className="flex w-16 flex-col items-center gap-1.5 text-center disabled:opacity-40"
                  >
                    <span
                      className={`h-12 w-12 rounded-full border border-border ${d.colorId === c.id ? "ring-2 ring-primary ring-offset-4 ring-offset-card" : ""}`}
                      style={{ background: c.hex }}
                    />
                    <span className="text-xs leading-tight">{c.name}</span>
                    <span className="text-[11px] text-primary">{!colorAvailable(c) ? t("studio.soldOut") : c.priceAdjustment ? `+${money(c.priceAdjustment)}` : t("gifts.included")}</span>
                  </button>
                ))}
            </div>
          </div>
        )}
      </section>
    );
  else if (step === "fill") content = <FillStep {...{ d, p, data, byId, used, full, filter, setFilter, add, removeOne, applyBundle }} warning={overBy > 0 || misfit ? fillBlocked : null} />;
  else if (step === "note")
    content = (
      <section className={panel} aria-labelledby="gift-step-title">
        <div>
          <h2 id="gift-step-title" className={heading}>
            {t("giftFlow.noteTitle")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("giftFlow.noteIntro")}</p>
        </div>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold">{t("giftFlow.to")}</span>
          <input
            value={d.recipient ?? ""}
            onChange={(e) => update((x) => ({ ...x, recipient: e.target.value.slice(0, RECIPIENT_MAX) }), "recipient")}
            maxLength={RECIPIENT_MAX}
            placeholder={t("giftFlow.toPlaceholder")}
            autoComplete="off"
            className="rounded-2xl border border-border bg-secondary/40 px-4 py-3 outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-semibold">{t("giftFlow.message")}</span>
          <textarea
            value={d.message ?? ""}
            onChange={(e) => update((x) => ({ ...x, message: e.target.value.slice(0, MESSAGE_MAX) }), "message")}
            maxLength={MESSAGE_MAX}
            rows={5}
            placeholder={t("giftFlow.messagePlaceholder")}
            className="resize-y rounded-2xl border border-border bg-secondary/40 px-4 py-3 outline-none focus:border-primary"
          />
          <span className="self-end text-xs text-muted-foreground">{t("giftFlow.characters", { count: (d.message ?? "").length, max: MESSAGE_MAX })}</span>
        </label>
        <div>
          <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">{t("giftFlow.quickMessages")}</p>
          <div className="flex flex-wrap gap-2">
            {QUICK.map((key) => {
              const text = t(`giftFlow.quick.${key}`);
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={d.message === text}
                  onClick={() => update((x) => ({ ...x, message: text }))}
                  className={`rounded-full px-4 py-2 text-sm transition-colors ${d.message === text ? "bg-primary text-primary-foreground" : "bg-secondary hover:text-foreground"}`}
                >
                  {text}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    );
  else
    content = (
      <section className={panel} aria-labelledby="gift-step-title">
        <h2 id="gift-step-title" className={heading}>
          {t("giftFlow.reviewTitle")}
        </h2>
        {items.length === 0 ? (
          <p className="text-muted-foreground">{t("giftFlow.emptyBox")}</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {p && (
              <li className="flex items-center justify-between gap-4 py-3">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    <Icon name="package" size={16} className="text-primary" />
                  </span>
                  <span className="truncate">
                    {p.name}
                    {color ? ` · ${color.name}` : ""}
                  </span>
                </span>
                <span>{money(p.price + (color?.priceAdjustment ?? 0))}</span>
              </li>
            )}
            {contentsOf(d, byId).map((r) => (
              <li key={r.ref} className="flex items-center justify-between gap-4 py-3">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                    {r.image && <img {...corsImage} src={r.image} alt="" className="h-7 w-7 object-contain" />}
                  </span>
                  <span className="truncate">{r.name}</span>
                  <span className="shrink-0 text-muted-foreground">× {r.count}</span>
                </span>
                <span>{money(r.price * r.count)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">{t("giftFlow.card")}</p>
            <button type="button" onClick={() => go("note")} className="text-sm font-semibold text-primary">
              {t("giftFlow.edit")}
            </button>
          </div>
          {d.recipient?.trim() || d.message?.trim() ? (
            <>
              {d.recipient?.trim() && <p className="mt-2 font-semibold">{t("giftFlow.cardTo", { name: d.recipient.trim() })}</p>}
              {d.message?.trim() && <p className="mt-1 text-sm whitespace-pre-line text-muted-foreground">{d.message.trim()}</p>}
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">{t("giftFlow.noCard")}</p>
          )}
        </div>
        {textEls.length > 0 && (
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">{t("giftFlow.textOnBox")}</p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {textEls.map((e) => (
                <li key={e.id}>“{e.text}”</li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex items-baseline justify-between border-t border-border pt-4">
          <span className="font-display text-2xl font-semibold">{t("common.total")}</span>
          <span className="font-display text-3xl font-semibold text-primary">{money(total)}</span>
        </div>
        <p className="-mt-3 text-xs text-muted-foreground">{t("giftFlow.priceNote")}</p>
        {orderBlocked && items.length > 0 && <Notice>{orderBlocked}</Notice>}
        {/* On phones the bar only has room for the order button. */}
        <Button variant="secondary" size="md" onClick={saver.save} disabled={saver.saving || !!fillBlocked} className="w-full sm:hidden">
          {t("studio.saveDesign")}
        </Button>
      </section>
    );

  return (
    <Page>
      <PageHeader back={{ href: "#/studios", label: t("studio.allStudios") }} eyebrow={t("giftFlow.eyebrow")} title={t("giftFlow.title")} accent={t("giftFlow.titleAccent")} intro={t("giftFlow.intro")} />

      <ol className="mt-10 grid grid-cols-4 gap-2 sm:gap-3" aria-label={t("controls.progress")}>
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => go(s)}
              disabled={!reachable(s) || s === step}
              aria-current={s === step ? "step" : undefined}
              className="flex w-full flex-col gap-2 text-left disabled:cursor-default"
            >
              <span className={`h-1 w-full rounded-full transition-colors ${i <= index ? "bg-primary" : "bg-secondary"}`} />
              <span className={`text-xs sm:text-sm ${s === step ? "font-semibold text-foreground" : reachable(s) ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/60"}`}>
                {i + 1}. {t(`giftFlow.steps.${s}`)}
              </span>
            </button>
          </li>
        ))}
      </ol>

      {offered.length === 0 ? (
        <p className="mt-10 rounded-[2rem] border border-border bg-card px-6 py-12 text-center text-muted-foreground">{t("gifts.noPackaging")}</p>
      ) : (
        <>
          <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
            <div className="order-2 min-w-0 lg:order-1">{content}</div>
            <div className="order-1 lg:sticky lg:top-28 lg:order-2">
              <LivePreview d={d} p={p} hex={boxHex(d, data)} closed={closed} writing={step === "note"} onToggleLid={() => setClosed((c) => !c)} onRemove={remove} label={p ? `${p.name}${color ? ` · ${color.name}` : ""}` : t("gifts.boxPreview")} />
            </div>
          </div>

          {/* Sticky on phones, where the steps scroll; in place below the panels on desktop, like the design. */}
          <div
            data-gift-bar
            className="sticky bottom-3 z-30 mt-8 flex items-center justify-between gap-3 rounded-[2rem] border border-border bg-card/95 px-4 py-3 backdrop-blur-md sm:px-7 sm:py-4 lg:static"
          >
            <div className="min-w-0">
              <p role="status" className={`truncate text-xs ${nextBlocked ? "text-foreground" : "text-muted-foreground"}`}>
                {nextBlocked ?? summary}
              </p>
              <p className="font-display text-xl font-semibold text-primary sm:text-2xl">{money(total)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {index > 0 && (
                <Button variant="neutral" size="bar" onClick={() => go(STEPS[index - 1])} aria-label={t("giftFlow.back")}>
                  <Icon name="arrowLeft" size={16} className="sm:hidden" />
                  <span className="hidden sm:inline">{t("giftFlow.back")}</span>
                </Button>
              )}
              {step !== "review" ? (
                <Button size="bar" glow onClick={() => go(STEPS[index + 1])} disabled={!!nextBlocked}>
                  {t("giftFlow.next", { step: t(`giftFlow.steps.${STEPS[index + 1]}`) })} <Icon name="arrowRight" size={16} />
                </Button>
              ) : (
                <>
                  <span className="hidden sm:contents">
                    <Button variant="secondary" size="bar" onClick={saver.save} disabled={saver.saving || !!fillBlocked}>
                      {t("studio.saveDesign")}
                    </Button>
                  </span>
                  <Button size="bar" glow onClick={saver.order} disabled={saver.saving || !!orderBlocked}>
                    {saver.saving ? t("common.saving") : t("studio.continueToOrder")} <Icon name="arrowRight" size={16} />
                  </Button>
                </>
              )}
            </div>
          </div>
        </>
      )}

      {step === "box" && <ReadyMade products={data.products} category={category} />}
    </Page>
  );
}

/** Step 2: suggested bundles, type filters and the items of the gift category that fit the box. */
function FillStep({ d, p, data, byId, used, full, filter, setFilter, add, removeOne, applyBundle, warning }: {
  d: GiftDraft;
  p: GiftPackaging | null;
  data: StudioProps["data"];
  byId: Map<string, Component>;
  used: (ref: string) => number;
  full: boolean;
  filter: string;
  setFilter: (key: string) => void;
  add: (c: Component) => void;
  removeOne: (ref: string) => void;
  applyBundle: (b: ReturnType<typeof usableBundle>) => void;
  warning: string | null;
}) {
  const fitting = data.components.filter((c) => fits(c, p));
  const filters = typeFilters(fitting);
  const active = filters.some((f) => f.key === filter) ? filter : "";
  const shown = active ? fitting.filter((c) => (c.type ?? "").trim().toLowerCase() === active) : fitting;
  const bundles = (p?.suggestedBundles ?? []).map((b) => usableBundle(b, p, byId)).filter((b) => b.blocked !== "hidden");
  const count = slotOrder(d).length;

  return (
    <section className={panel} aria-labelledby="gift-step-title">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="gift-step-title" className={heading}>
          {t("giftFlow.fillTitle")}
        </h2>
        <span className="text-sm text-muted-foreground" aria-live="polite">
          {p?.capacity != null ? t("giftFlow.slotsUsed", { used: count, total: p.capacity }) : t("gifts.items", { count })}
        </span>
      </div>

      {bundles.length > 0 && (
        <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-primary uppercase">
            <Icon name="sparkle" size={14} /> {t("giftFlow.bundles")}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {bundles.map((b) => (
              <button
                key={b.name}
                type="button"
                onClick={() => applyBundle(b)}
                disabled={b.blocked === "stock"}
                title={b.blocked === "stock" ? t("giftFlow.bundleSoldOut", { name: b.name }) : undefined}
                className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-background/60 py-1.5 pr-2 pl-4 text-sm transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-45"
              >
                <span className="font-semibold">{b.name}</span>
                <span className="flex -space-x-1.5" aria-hidden="true">
                  {b.items.slice(0, 4).map((i) => (
                    <img key={i.component.id} {...corsImage} src={i.component.imageUrl!} alt="" className="h-7 w-7 rounded-full border border-border bg-secondary object-contain p-0.5" />
                  ))}
                </span>
                <span className="text-xs text-muted-foreground">{t("gifts.items", { count: b.count })}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {filters.length > 1 && (
        <div role="group" aria-label={t("giftFlow.itemTypes")} className="flex flex-wrap gap-2">
          {[{ key: "", label: t("giftFlow.all") }, ...filters].map((f) => (
            <button
              key={f.key || "all"}
              type="button"
              aria-pressed={active === f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${active === f.key ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {warning ? <Notice>{warning}</Notice> : full ? <Notice tone="muted">{t("giftFlow.boxFull")}</Notice> : null}

      {shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t("giftFlow.noItems")}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {shown.map((c) => {
            const n = used(c.id);
            const stock = stockState(c, n);
            const disabled = !p || full || stock.disabled || !c.imageUrl;
            return (
              <li key={c.id} className="relative">
                <button
                  type="button"
                  onClick={() => add(c)}
                  disabled={disabled}
                  aria-label={`${t("giftFlow.add", { name: c.name })}, ${money(c.price)}`}
                  className={`flex h-full w-full flex-col rounded-2xl border p-3 text-left transition-colors disabled:cursor-not-allowed ${
                    n ? "border-primary/60 bg-primary/5" : "border-border hover:border-foreground/30"
                  } ${disabled && !n ? "opacity-45" : ""}`}
                >
                  <span className="flex aspect-[4/3] w-full items-center justify-center rounded-xl bg-secondary p-3">
                    {c.imageUrl ? (
                      <img {...corsImage} src={c.imageUrl} alt="" className="max-h-full max-w-full object-contain" draggable={false} />
                    ) : (
                      <span className="text-center text-xs text-muted-foreground">{t("giftFlow.noPicture")}</span>
                    )}
                  </span>
                  <span className="mt-2 text-sm leading-tight font-semibold">{c.name}</span>
                  <span className="mt-0.5 text-xs text-primary">+ {money(c.price)}</span>
                  {stock.label && <span className="mt-0.5 text-[11px] text-muted-foreground">{stock.label}</span>}
                </button>
                {n > 0 && (
                  <>
                    <span className="pointer-events-none absolute top-2 right-2 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">×{n}</span>
                    <button
                      type="button"
                      onClick={() => removeOne(c.id)}
                      aria-label={t("giftFlow.removeOne", { name: c.name })}
                      className="absolute right-2 bottom-2 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/90 transition-colors hover:bg-secondary"
                    >
                      <Icon name="minus" size={16} />
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** The box as it will be packed: one slot per item it holds; tap an item to take it out. */
function LivePreview({ d, p, hex, closed, writing, onToggleLid, onRemove, label }: {
  d: GiftDraft;
  p: GiftPackaging | null;
  hex: string;
  closed: boolean;
  /** On the Note step: the card is shown (even empty) and lifts while the customer writes. */
  writing: boolean;
  onToggleLid: () => void;
  onRemove: (id: string) => void;
  label: string;
}) {
  const items = slotOrder(d);
  const { slots, cols, rows } = slotGrid(p, items.length);
  const g = boxGeometry(p?.shape);
  const transparent = p?.type === "TRANSPARENT";
  const lidOn = closed && !!p && !transparent;
  const showCard = !!p && (writing || !!d.recipient?.trim() || !!d.message?.trim());

  return (
    <section aria-label={t("giftFlow.livePreview")} className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-5 sm:p-6">
      <div className="bg-glow pointer-events-none absolute inset-0" />
      <div className="relative flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">{t("giftFlow.livePreview")}</p>
        {p && !transparent && (
          <button type="button" onClick={onToggleLid} aria-pressed={closed} className="text-xs font-semibold text-primary">
            {closed ? t("giftFlow.openLid") : t("giftFlow.closeLid")}
          </button>
        )}
      </div>
      <div
        className={`@container relative mx-auto mt-4 w-full transition-[margin] duration-300 ${showCard ? "mb-[22%]" : ""} ${p?.shape === "RECTANGULAR" ? "max-w-[280px] sm:max-w-[380px]" : "max-w-[220px] sm:max-w-[320px]"}`}
      >
        <GiftBox shape={p?.shape} transparent={transparent} hex={hex} closed={lidOn} insideLabel={false}>
          {!lidOn && p && (
            <ol
              aria-label={t("gifts.contents")}
              className="absolute grid gap-[3%] p-[2%]"
              style={{
                left: `${g.inner.x0 * 100}%`,
                top: `${g.inner.y0 * 100}%`,
                width: `${(g.inner.x1 - g.inner.x0) * 100}%`,
                height: `${(g.inner.y1 - g.inner.y0) * 100}%`,
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: slots }, (_, i) => {
                const e = items[i];
                return (
                  <li key={e?.id ?? `empty-${i}`} className="min-h-0 min-w-0">
                    {e ? (
                      <button
                        type="button"
                        onClick={() => onRemove(e.id)}
                        aria-label={t("giftFlow.removeFromBox", { name: e.name ?? t("order.item") })}
                        title={t("giftFlow.removeFromBox", { name: e.name ?? t("order.item") })}
                        className="group relative flex h-full w-full items-center justify-center rounded-lg border border-white/20 bg-black/15 transition-colors hover:border-primary focus-visible:border-primary"
                      >
                        {e.src && <img {...corsImage} src={e.src} alt="" className="max-h-[78%] max-w-[78%] object-contain" draggable={false} />}
                        <span className="absolute top-0.5 right-0.5 hidden h-5 w-5 items-center justify-center rounded-full bg-background/90 text-foreground group-hover:flex group-focus-visible:flex">
                          <Icon name="close" size={11} />
                        </span>
                      </button>
                    ) : (
                      <span className="block h-full w-full rounded-lg border border-dashed border-white/30">
                        <span className="sr-only">{t("giftFlow.emptySlot")}</span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </GiftBox>
        {showCard && <GiftCard recipient={d.recipient ?? ""} message={d.message ?? ""} writing={writing} />}
      </div>
      <p className="relative mt-4 text-center text-sm text-muted-foreground">{label}</p>
    </section>
  );
}

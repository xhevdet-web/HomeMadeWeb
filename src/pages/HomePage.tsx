import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { publicStats } from "../api/catalog";
import { communityGallery } from "../api/designs";
import type { PublicStats } from "../api/models";
import { useAuth } from "../auth/AuthContext";
import { ButtonLink } from "../components/Button";
import { Chip } from "../components/Controls";
import { Icon, type IconName } from "../components/Icon";
import { STATIC_CATEGORIES, lookByKey, lookFor, lookKey, studioHref, useStudioCategories } from "../data/homeCategories";
import { useApi } from "../hooks/useApi";
import { EASE, prefersReducedMotion, useInView } from "../hooks/useInView";
import i18n from "../i18n";
import { formatNumber } from "../lib/format";

/* ---------------- Hero ---------------- */

function Hero() {
  const { t } = useTranslation();
  const rise = (delay: number) => ({ animationDelay: `${delay}ms` });

  return (
    <section data-theme="dark" className="relative h-screen min-h-[640px] overflow-hidden bg-background text-foreground">
      <img
        src="/images/hero.jpg"
        alt={t("home.heroImage")}
        width={1920}
        height={1080}
        loading="eager"
        fetchPriority="high"
        className="absolute inset-0 h-full w-full animate-slowzoom object-cover"
      />
      <div className="bg-fade absolute inset-0" />
      <div className="bg-bottom-fade absolute inset-0" />

      <div className="relative mx-auto flex h-full max-w-7xl flex-col justify-center px-6">
        <p className="animate-rise" style={rise(0)}>
          <span className="eyebrow">{t("home.heroEyebrow")}</span>
        </p>
        <h1 style={rise(150)} className="animate-rise mt-5 font-display text-[2.625rem] leading-[1.02] font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
          {t("home.heroTitle")}
          <br />
          <em className="font-normal text-primary">{t("home.heroTitleAccent")}</em>
        </h1>
        <p style={rise(300)} className="animate-rise mt-5 max-w-md text-base text-muted-foreground sm:mt-6 sm:text-lg">
          {t("home.heroBody")}
        </p>
        <div style={rise(450)} className="animate-rise mt-8 flex flex-wrap gap-3 sm:mt-10">
          <ButtonLink href="#/create" size="cta" glow>
            {t("home.createYourOwn")}
          </ButtonLink>
          <ButtonLink href="#/studios" variant="secondary" size="cta" className="backdrop-blur-md">
            {t("home.exploreCategories")}
          </ButtonLink>
        </div>
      </div>

      <a href="#home-categories" className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[11px] font-semibold tracking-[0.3em] text-[var(--page-muted)] uppercase">
        {t("home.scroll")}
      </a>
    </section>
  );
}

/* ---------------- Categories (GET /categories) ---------------- */

interface StackCard {
  key: string;
  name: string;
  image: string | null;
  line: string;
  text: string;
  href: string;
}

/** Active categories in API order with the local photos and copy; the static list if the API fails. */
function useStackCards(): { cards: StackCard[]; loading: boolean } {
  const { data, error, loading } = useStudioCategories();
  if (data)
    return {
      loading: false,
      cards: data.map((c) => {
        const look = lookFor(c);
        const known = lookKey(c);
        return { key: c.id, name: known ? i18n.t(`looks.${known}.name`) : c.name, image: look.image, line: look.line, text: look.text, href: studioHref(c) };
      }),
    };
  if (error)
    return {
      loading: false,
      cards: STATIC_CATEGORIES.map((key) => {
        const look = lookByKey(key);
        return { key, name: i18n.t(`looks.${key}.name`), image: look.image, line: look.line, text: look.text, href: "#/studios" };
      }),
    };
  return { loading, cards: [] };
}

function CategoryIntro({ count }: { count: number | null }) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-7xl px-6 pt-32 pb-10">
      <p className="eyebrow">{count === null ? t("home.waysToCreate") : t("home.waysToCreateCount", { count })}</p>
      <h2 className="mt-4 font-display text-3xl leading-tight font-semibold tracking-tight sm:text-4xl lg:text-5xl">
        {t("home.pickCanvas")} <em className="font-normal text-primary">{t("home.makeItYours")}</em>
      </h2>
    </div>
  );
}

function CategoryStack({ cards, loading }: { cards: StackCard[]; loading: boolean }) {
  const { t } = useTranslation();
  const wrappers = useRef<(HTMLDivElement | null)[]>([]);
  const items = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let frame = 0;

    // Phones show the cards unstacked (see the wrapper below), so they stay flat and clear.
    const stacked = window.matchMedia("(min-width: 640px)");

    const update = () => {
      const vh = window.innerHeight;
      items.current.forEach((card, i) => {
        if (!card) return;
        const next = wrappers.current[i + 1];
        const p = next && stacked.matches ? Math.min(1, Math.max(0, 1 - next.getBoundingClientRect().top / vh)) : 0;
        card.style.transform = `translateY(${p * 40}px) scale(${1 - p * 0.12}) rotateX(${p * 8}deg)`;
        card.style.opacity = String(1 - p * 0.6);
        card.style.filter = `blur(${p * 4}px)`;
      });
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [cards.length]);

  if (loading)
    return (
      <div className="flex h-screen items-center px-4 sm:px-6" role="status" aria-label={t("home.loadingCategories")}>
        <div className="mx-auto h-[82vh] w-full max-w-7xl animate-pulse rounded-[2rem] border border-border bg-card" />
      </div>
    );

  const total = String(cards.length).padStart(2, "0");

  return (
    <div>
      {cards.map((c, i) => (
        <div
          key={c.key}
          ref={(el) => {
            wrappers.current[i] = el;
          }}
          // Phones: plain cards one after another, so no card ever lies over another's button.
          // From sm up the cards stack: each wrapper is a transparent full-screen sticky layer
          // over the previous card, so it lets taps through and only the card is clickable.
          // svh is the height between a browser's bars, so the card always fits on screen.
          className="pointer-events-none flex items-center px-4 py-2 [perspective:1200px] sm:sticky sm:top-0 sm:h-svh sm:px-6 sm:py-0"
        >
          <article
            ref={(el) => {
              items.current[i] = el;
            }}
            data-theme="dark"
            className="pointer-events-auto relative mx-auto h-[72svh] w-full max-w-7xl origin-top overflow-hidden rounded-[2rem] border border-border bg-card text-foreground will-change-transform sm:h-[82svh]"
          >
            {c.image ? (
              <img src={c.image} alt={t("home.categoryImage", { name: c.name })} width={1280} height={960} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="bg-glow absolute inset-0" />
            )}
            <div className="bg-fade absolute inset-0" />

            <div className="relative flex h-full flex-col justify-between p-6 sm:p-14">
              <span className="font-display text-xs tracking-[0.3em] text-muted-foreground sm:text-sm">
                {String(i + 1).padStart(2, "0")} / {total}
              </span>
              <div className="max-w-lg">
                <p className="font-display text-lg text-primary italic sm:text-xl">{c.line}</p>
                <h3 className="mt-2 font-display text-4xl leading-none font-extrabold tracking-tight break-words sm:text-6xl lg:text-7xl">{c.name}</h3>
                <p className="mt-3 text-sm text-muted-foreground sm:mt-4 sm:text-base">{c.text}</p>
                <ButtonLink href={c.href} variant="secondary" size="cta" className="mt-5 sm:mt-6">
                  {t("home.designCategory", { name: c.name.toLowerCase() })}
                </ButtonLink>
              </div>
            </div>
          </article>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Stats (GET /stats/public) ---------------- */

function Counter({ value, start }: { value: number; start: boolean }) {
  const [current, setCurrent] = useState(() => (prefersReducedMotion() ? value : 0));

  useEffect(() => {
    if (!start) return;
    if (prefersReducedMotion()) {
      setCurrent(value);
      return;
    }
    const duration = 1800;
    let frame = 0;
    let t0: number | null = null;
    const tick = (t: number) => {
      t0 ??= t;
      const k = Math.min(1, (t - t0) / duration);
      setCurrent(value * (1 - Math.pow(1 - k, 3)));
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [start, value]);

  return <>{formatNumber(Math.round(current))}</>;
}

/** Tiles shown in the stats grid; add a tile by adding a field here (labels are translation keys). */
const STAT_TILES: { label: "home.statUsers" | "home.statOrders" | "home.statProducts"; field: keyof PublicStats; icon: IconName }[] = [
  { label: "home.statUsers", field: "registeredUsers", icon: "user" },
  { label: "home.statOrders", field: "completedOrders", icon: "package" },
  { label: "home.statProducts", field: "products", icon: "sparkle" },
];

function Stats() {
  const { t } = useTranslation();
  const [ref, inView] = useInView<HTMLElement>(0.3);
  // Loaded lazily, when the section scrolls into view.
  const { data, error } = useApi(inView ? "stats" : null, publicStats, { ttl: 60_000 });

  const reveal = (delay: number, from: string, shown = inView) => ({
    opacity: shown ? 1 : 0,
    transform: shown ? "none" : from,
    transition: `opacity 1000ms ${EASE} ${delay}ms, transform 1000ms ${EASE} ${delay}ms`,
  });

  return (
    <section id="home-stats" ref={ref} className="relative overflow-hidden py-20 sm:py-28 lg:py-32">
      <div className="bg-glow pointer-events-none absolute inset-0" />
      <div className={`relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:items-center lg:gap-20 ${error ? "" : "lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]"}`}>
        <div>
          <p className="eyebrow" style={reveal(0, "translateY(32px)")}>
            {t("home.statsEyebrow")}
          </p>
          <h2 className="mt-4 font-display text-3xl leading-[1.1] font-semibold tracking-tight sm:text-4xl lg:text-5xl" style={reveal(150, "translateY(32px)")}>
            {t("home.statsTitle")}
            <em className="mt-1 block font-normal text-primary">{t("home.statsTitleAccent")}</em>
          </h2>
          <p className="mt-6 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg" style={reveal(250, "translateY(32px)")}>
            {t("home.statsBody")}
          </p>
          {/* The reveal sits on a wrapper so its inline transition doesn't replace the button's hover transition. */}
          <div className="mt-8" style={reveal(350, "translateY(32px)")}>
            <ButtonLink href="#/create" variant="secondary" size="cta">
              {t("home.createYourOwn")}
            </ButtonLink>
          </div>
        </div>

        {/* Never a fake number: the cards are hidden if the stats can't be loaded. */}
        {!error && (
          <ul className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1" aria-busy={!data}>
            {STAT_TILES.map((s, i) => (
              <li
                key={s.label}
                className="flex items-center gap-5 rounded-3xl border border-border bg-card p-5 transition-colors duration-300 hover:border-primary/50 sm:flex-col sm:items-start sm:p-6 lg:flex-row lg:items-center lg:p-7"
                style={reveal(300 + i * 150, "translateY(32px)", !!data)}
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary lg:size-14">
                  <Icon name={s.icon} size={24} />
                </span>
                <div className="min-w-0">
                  <div className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">{data ? <Counter value={Number(data[s.field]) || 0} start /> : " "}</div>
                  <p className="mt-1 text-sm text-muted-foreground sm:text-base">{t(s.label)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ---------------- Community gallery (signed in only) ---------------- */

function Community() {
  const { t } = useTranslation();
  const { status } = useAuth();
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const { data } = useApi(status === "signedIn" ? `community:${categoryId ?? ""}` : null, (signal) => communityGallery(categoryId, signal));
  if (!data?.creations.length) return null;
  return (
    <section className="mx-auto max-w-7xl px-6 pb-20 sm:pb-28 lg:pb-32" aria-labelledby="community-title">
      <p className="eyebrow">{t("home.communityEyebrow")}</p>
      <h2 id="community-title" className="mt-4 font-display text-3xl leading-tight font-semibold tracking-tight sm:text-4xl lg:text-5xl">
        {t("home.communityTitle")} <em className="font-normal text-primary">{t("home.communityTitleAccent")}</em>
      </h2>
      {data.categories.length > 1 && (
        <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label={t("home.communityFilter")}>
          {data.categories.map((c) => (
            <Chip key={c.id} selected={c.id === data.categoryId} onClick={() => setCategoryId(c.id)}>
              {c.name}
            </Chip>
          ))}
        </div>
      )}
      <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {data.creations.map((c) => (
          <li key={c.id} className="overflow-hidden rounded-2xl border border-border bg-card">
            {c.designPreviewUrl ? (
              <img src={c.designPreviewUrl} alt={c.name} loading="lazy" className="aspect-square w-full bg-secondary object-cover" />
            ) : (
              <span className="block aspect-square w-full bg-secondary" />
            )}
            <p className="truncate px-3 pt-2.5 text-sm font-semibold">{c.name}</p>
            <p className="px-3 pb-3 text-xs text-muted-foreground">{c.categoryName}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------- Steps ---------------- */

/** The customer journey; `studio` is the main step and is highlighted. */
const STEPS: { key: "choose" | "options" | "studio" | "order"; icon: IconName }[] = [
  { key: "choose", icon: "grid" },
  { key: "options", icon: "layers" },
  { key: "studio", icon: "pencil" },
  { key: "order", icon: "bag" },
];

function Steps() {
  const { t } = useTranslation();
  const [ref, inView] = useInView<HTMLOListElement>(0.25);

  const reveal = (delay: number) => ({
    opacity: inView ? 1 : 0,
    transform: inView ? "none" : "translateY(32px)",
    transition: `opacity 700ms ${EASE} ${delay}ms, transform 700ms ${EASE} ${delay}ms`,
  });

  return (
    <section id="how-it-works" className="px-4 pb-20 sm:px-6 sm:pb-28 lg:pb-32">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-border bg-card p-6 sm:p-12 lg:p-16">
        <div className="bg-glow pointer-events-none absolute inset-0 opacity-60" />

        <div className="relative grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-x-12 lg:gap-y-14">
          <div>
            <p className="eyebrow">{t("home.howItWorks")}</p>
            <h2 className="mt-4 font-display text-3xl leading-[1.1] font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              {t("home.stepsTitle")} <em className="font-normal text-primary">{t("home.stepsTitleAccent")}</em>
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">{t("home.stepsSubtitle")}</p>
          </div>

          {/* Phones: one column, a vertical line joins the steps. Desktop: four columns, a horizontal line. */}
          <ol ref={ref} className="grid gap-4 lg:col-span-2 lg:grid-cols-4">
            {STEPS.map((s, i) => {
              const main = s.key === "studio";
              return (
                <li key={s.key} className="relative" style={reveal(i * 130)}>
                  {i < STEPS.length - 1 && (
                    <span
                      aria-hidden
                      className="absolute top-[76px] -bottom-7 left-[44px] w-px bg-linear-to-b from-primary/70 to-primary/10 lg:top-[44px] lg:-right-7 lg:bottom-auto lg:left-[76px] lg:h-px lg:w-auto lg:bg-linear-to-r"
                    />
                  )}
                  <div
                    className={`group flex h-full gap-5 rounded-3xl border p-5 transition-all duration-300 motion-safe:hover:-translate-y-1 lg:flex-col lg:gap-6 ${
                      main ? "border-primary/40 bg-primary/[0.07] shadow-glow" : "border-transparent hover:border-border hover:bg-background/40"
                    }`}
                  >
                    <span
                      className={`grid size-12 shrink-0 place-items-center rounded-2xl transition-transform duration-300 motion-safe:group-hover:scale-110 ${
                        main ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                      }`}
                    >
                      <Icon name={s.icon} size={22} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">{t("home.stepsStep", { n: i + 1 })}</p>
                      <h3 className="mt-1.5 font-display text-xl font-semibold">{t(`home.steps.${s.key}.title`)}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">{t(`home.steps.${s.key}.text`)}</p>
                      {main && (
                        <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                          <Icon name="sparkle" size={14} />
                          {t("home.stepsHighlight")}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Beside the title on desktop, after the steps on phones. */}
          <ButtonLink href="#/create" size="cta" glow className="justify-self-start lg:col-start-2 lg:row-start-1 lg:self-end">
            {t("home.startCreating")}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Page ---------------- */

export default function HomePage() {
  // Re-renders the category copy when the language changes.
  useTranslation();
  const { cards, loading } = useStackCards();
  return (
    <>
      <Hero />
      <section id="home-categories">
        <CategoryIntro count={loading ? null : cards.length} />
        <CategoryStack cards={cards} loading={loading} />
      </section>
      <Stats />
      <Community />
      <Steps />
    </>
  );
}

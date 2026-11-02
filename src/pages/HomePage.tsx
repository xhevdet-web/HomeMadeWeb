import { useEffect, useRef, useState } from "react";
import { publicStats } from "../api/catalog";
import { communityGallery } from "../api/designs";
import type { PublicStats } from "../api/models";
import { useAuth } from "../auth/AuthContext";
import { Chip } from "../components/Controls";
import { LOOK, STATIC_CATEGORIES, lookFor, studioHref, useStudioCategories } from "../data/homeCategories";
import { useApi } from "../hooks/useApi";
import { countWord, formatNumber } from "../lib/format";

const EASE = "cubic-bezier(.2,.7,.2,1)";

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Observes the element once; flips to true on first intersection, then disconnects. */
function useInView<T extends Element>(threshold = 0.3) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return [ref, inView] as const;
}

/* ---------------- Hero ---------------- */

function Hero() {
  const rise = (delay: number) => ({ animationDelay: `${delay}ms` });

  return (
    <section data-theme="dark" className="relative h-screen min-h-[640px] overflow-hidden bg-background text-foreground">
      <img
        src="/images/hero.jpg"
        alt="Custom mug, beaded bracelet, gold pendant necklace and folded hoodie on dark navy velvet"
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
          <span className="eyebrow">Design · Order · Delivered</span>
        </p>
        <h1
          style={rise(150)}
          className="animate-rise mt-6 font-display text-6xl leading-[0.95] font-extrabold tracking-tight sm:text-8xl lg:text-[128px]"
        >
          Your idea.
          <br />
          <em className="font-normal text-primary">Made real.</em>
        </h1>
        <p
          style={rise(300)}
          className="animate-rise mt-8 max-w-md text-lg text-muted-foreground"
        >
          Create something that's completely yours. We make it by hand and
          deliver it to your door.
        </p>
        <div style={rise(450)} className="animate-rise mt-10 flex flex-wrap gap-4">
          <a
            href="#/create"
            className="rounded-full bg-primary px-8 py-4 font-semibold text-primary-foreground shadow-glow transition-transform duration-300 hover:scale-105"
          >
            Create your own →
          </a>
          <a
            href="#/studios"
            className="rounded-full border border-border px-8 py-4 font-semibold backdrop-blur-md transition-colors hover:bg-secondary"
          >
            Explore categories
          </a>
        </div>
      </div>

      <a
        href="#home-categories"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[11px] font-semibold tracking-[0.3em] text-[var(--page-muted)] uppercase"
      >
        Scroll ↓
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
        return { key: c.id, name: c.name, image: look.image, line: look.line, text: look.text, href: studioHref(c) };
      }),
    };
  if (error)
    return {
      loading: false,
      cards: STATIC_CATEGORIES.map((c) => ({ key: c.key, name: c.name, image: LOOK[c.key].image, line: LOOK[c.key].line, text: LOOK[c.key].text, href: "#/studios" })),
    };
  return { loading, cards: [] };
}

function CategoryIntro({ count }: { count: number | null }) {
  return (
    <div className="mx-auto max-w-7xl px-6 pt-32 pb-10">
      <p className="eyebrow">{count === null ? "Ways to create" : `${countWord(count)} ${count === 1 ? "way" : "ways"} to create`}</p>
      <h2 className="mt-5 font-display text-5xl font-semibold tracking-tight sm:text-6xl">
        Pick a canvas. <em className="font-normal text-primary">Make it yours.</em>
      </h2>
    </div>
  );
}

function CategoryStack({ cards, loading }: { cards: StackCard[]; loading: boolean }) {
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
      <div className="flex h-screen items-center px-4 sm:px-6" role="status" aria-label="Loading categories">
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
              <img src={c.image} alt={`Custom ${c.name.toLowerCase()} by HomeCreator`} width={1280} height={960} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="bg-glow absolute inset-0" />
            )}
            <div className="bg-fade absolute inset-0" />

            <div className="relative flex h-full flex-col justify-between p-6 sm:p-14">
              <span className="font-display text-sm tracking-[0.3em] text-muted-foreground">
                {String(i + 1).padStart(2, "0")} / {total}
              </span>
              <div className="max-w-lg">
                <p className="font-display text-xl text-primary italic sm:text-2xl">{c.line}</p>
                <h3 className="mt-2 font-display text-5xl leading-none font-extrabold tracking-tight break-words sm:text-8xl">{c.name}</h3>
                <p className="mt-3 text-base text-muted-foreground sm:mt-5 sm:text-lg">{c.text}</p>
                <a
                  href={c.href}
                  className="mt-5 inline-block rounded-full bg-primary px-7 py-3.5 font-semibold text-primary-foreground transition-transform duration-300 hover:scale-105 sm:mt-8"
                >
                  Design a {c.name.toLowerCase()} →
                </a>
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

/** Tiles shown in the stats grid; add a tile by adding a field here. */
const STAT_TILES: { label: string; field: keyof PublicStats }[] = [
  { label: "Registered users", field: "registeredUsers" },
  { label: "Completed orders", field: "completedOrders" },
  { label: "Products", field: "products" },
];

function Stats() {
  const [ref, inView] = useInView<HTMLElement>(0.3);
  // Loaded lazily, when the section scrolls into view.
  const { data, error } = useApi(inView ? "stats" : null, publicStats, { ttl: 60_000 });

  const reveal = (delay: number, from: string, shown = inView) => ({
    opacity: shown ? 1 : 0,
    transform: shown ? "none" : from,
    transition: `opacity 1000ms ${EASE} ${delay}ms, transform 1000ms ${EASE} ${delay}ms`,
  });

  return (
    <section id="home-stats" ref={ref} className="relative overflow-hidden py-32">
      <div className="bg-glow pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-7xl px-6">
        <p className="eyebrow" style={reveal(0, "translateY(32px)")}>
          HomeCreator in numbers
        </p>
        <h2 className="mt-5 font-display text-5xl font-semibold tracking-tight sm:text-6xl" style={reveal(150, "translateY(32px)")}>
          Made by hand. <em className="font-normal text-primary">Loved by thousands.</em>
        </h2>

        {/* Never a fake number: the grid is hidden if the stats can't be loaded. */}
        {!error && (
          <div className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-[2rem] border border-border bg-border sm:grid-cols-3" aria-busy={!data}>
            {STAT_TILES.map((s, i) => (
              <div key={s.label} className="bg-card p-8 sm:p-12" style={reveal(300 + i * 150, "translateY(-64px)", !!data)}>
                <div className="font-display text-5xl font-extrabold tracking-tight text-primary sm:text-6xl">
                  {data ? <Counter value={Number(data[s.field]) || 0} start /> : " "}
                </div>
                <p className="mt-3 text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------- Community gallery (signed in only) ---------------- */

function Community() {
  const { status } = useAuth();
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const { data } = useApi(status === "signedIn" ? `community:${categoryId ?? ""}` : null, (signal) => communityGallery(categoryId, signal));
  if (!data?.creations.length) return null;
  return (
    <section className="mx-auto max-w-7xl px-6 pb-32" aria-labelledby="community-title">
      <p className="eyebrow">From the community</p>
      <h2 id="community-title" className="mt-5 font-display text-5xl font-semibold tracking-tight sm:text-6xl">
        Made for <em className="font-normal text-primary">someone special.</em>
      </h2>
      {data.categories.length > 1 && (
        <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Category">
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

const STEPS = [
  { title: "Create", text: "Choose a category and design it your way." },
  { title: "Order", text: "Review your piece and place the order." },
  { title: "Track", text: "Our maker crafts it by hand while you follow along." },
  { title: "Enjoy", text: "Delivered to your door, ready to wear or gift." },
];

function Steps() {
  const [ref, inView] = useInView<HTMLOListElement>(0.3);

  return (
    <section id="how-it-works" className="px-4 pb-32 sm:px-6">
      <div className="mx-auto max-w-7xl rounded-[2rem] border border-border bg-card p-8 sm:p-16">
        <p className="eyebrow">How it works</p>
        <h2 className="mt-5 font-display text-5xl font-semibold tracking-tight sm:text-6xl">
          Your idea. <em className="font-normal text-primary">Made real.</em>
        </h2>

        <ol ref={ref} className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "none" : "translateY(40px)",
                transition: `opacity 700ms ${EASE} ${i * 120}ms, transform 700ms ${EASE} ${i * 120}ms`,
              }}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary font-display text-xl font-bold text-primary-foreground">
                {i + 1}
              </span>
              <h3 className="mt-5 font-display text-2xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-muted-foreground">{s.text}</p>
            </li>
          ))}
        </ol>

        <a
          href="#/create"
          className="mt-14 inline-block rounded-full bg-primary px-8 py-4 font-semibold text-primary-foreground shadow-glow transition-transform duration-300 hover:scale-105"
        >
          Create your own →
        </a>
      </div>
    </section>
  );
}

/* ---------------- Page ---------------- */

export default function HomePage() {
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

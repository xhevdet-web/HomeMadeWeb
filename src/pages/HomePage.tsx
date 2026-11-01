import { useEffect, useRef, useState } from "react";

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
    <section className="relative h-screen min-h-[640px] overflow-hidden">
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
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-[11px] font-semibold tracking-[0.3em] text-muted-foreground uppercase"
      >
        Scroll ↓
      </a>
    </section>
  );
}

/* ---------------- Categories ---------------- */

const CATEGORIES = [
  { name: "Bracelet", slug: "bracelet", image: "bracelet", line: "Bead by bead.", text: "Pick your beads, letters and charms. Spell a name, a date, a feeling." },
  { name: "Necklace", slug: "necklace", image: "necklace", line: "Wear your story.", text: "Names, initials and pendants shaped in gold and silver, just for you." },
  { name: "Gifts", slug: "gifts", image: "gifts", line: "Made to be opened.", text: "Personal boxes and keepsakes they will remember long after the ribbon." },
  { name: "Mugs", slug: "mugs", image: "mugs", line: "Morning, personalised.", text: "Your artwork, photo or words printed on a mug made for daily rituals." },
  { name: "Apparel", slug: "apparel", image: "apparel", line: "Wear your design.", text: "Hoodies and tees with your own graphics, printed to last." },
  { name: "Cases", slug: "cases", image: "cases", line: "Protect in style.", text: "Phone cases designed by you, for the device you carry every day." },
  { name: "Sticker", slug: "stickers", image: "stickers", line: "Stick it anywhere.", text: "Die-cut stickers from your doodles, logos and inside jokes." },
];

function CategoryIntro() {
  return (
    <div className="mx-auto max-w-7xl px-6 pt-32 pb-10">
      <p className="eyebrow">Seven ways to create</p>
      <h2 className="mt-5 font-display text-5xl font-semibold tracking-tight sm:text-6xl">
        Pick a canvas. <em className="font-normal text-primary">Make it yours.</em>
      </h2>
    </div>
  );
}

function CategoryStack() {
  const wrappers = useRef<(HTMLDivElement | null)[]>([]);
  const cards = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let frame = 0;

    const update = () => {
      const vh = window.innerHeight;
      cards.current.forEach((card, i) => {
        if (!card) return;
        const next = wrappers.current[i + 1];
        const p = next
          ? Math.min(1, Math.max(0, 1 - next.getBoundingClientRect().top / vh))
          : 0;
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
  }, []);

  const total = String(CATEGORIES.length).padStart(2, "0");

  return (
    <div>
      {CATEGORIES.map((c, i) => (
        <div
          key={c.name}
          ref={(el) => {
            wrappers.current[i] = el;
          }}
          className="sticky top-0 flex h-screen items-center px-4 [perspective:1200px] sm:px-6"
        >
          <article
            ref={(el) => {
              cards.current[i] = el;
            }}
            className="relative mx-auto h-[82vh] w-full max-w-7xl origin-top overflow-hidden rounded-[2rem] border border-border bg-card will-change-transform"
          >
            <img
              src={`/images/${c.image}.jpg`}
              alt={`Custom ${c.name.toLowerCase()} by HomeCreator`}
              width={1280}
              height={960}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="bg-fade absolute inset-0" />

            <div className="relative flex h-full flex-col justify-between p-8 sm:p-14">
              <span className="font-display text-sm tracking-[0.3em] text-muted-foreground">
                {String(i + 1).padStart(2, "0")} / {total}
              </span>
              <div className="max-w-lg">
                <p className="font-display text-2xl text-primary italic">{c.line}</p>
                <h3 className="mt-2 font-display text-6xl leading-none font-extrabold tracking-tight sm:text-8xl">
                  {c.name}
                </h3>
                <p className="mt-5 text-lg text-muted-foreground">{c.text}</p>
                <a
                  href={`#/studios/${c.slug}`}
                  className="mt-8 inline-block rounded-full bg-primary px-7 py-3.5 font-semibold text-primary-foreground transition-transform duration-300 hover:scale-105"
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

/* ---------------- Stats ---------------- */

function Counter({ value, decimals = 0, suffix = "", start }: {
  value: number;
  decimals?: number;
  suffix?: string;
  start: boolean;
}) {
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

  const text =
    decimals > 0 ? current.toFixed(decimals) : Math.round(current).toLocaleString("en-US");
  return (
    <>
      {text}
      {suffix}
    </>
  );
}

const STATS = [
  { value: 50000, suffix: "+", label: "Happy creators" },
  { value: 120000, suffix: "+", label: "Orders completed" },
  { value: 7, suffix: "", label: "Product categories" },
  { value: 4.9, decimals: 1, suffix: "★", label: "Average rating" },
];

function Stats() {
  const [ref, inView] = useInView<HTMLElement>(0.3);

  const reveal = (delay: number, from: string, duration = 1000) => ({
    opacity: inView ? 1 : 0,
    transform: inView ? "none" : from,
    transition: `opacity ${duration}ms ${EASE} ${delay}ms, transform ${duration}ms ${EASE} ${delay}ms`,
  });

  return (
    <section id="home-stats" ref={ref} className="relative overflow-hidden py-32">
      <div className="bg-glow pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-7xl px-6">
        <p className="eyebrow" style={reveal(0, "translateY(32px)")}>
          HomeCreator in numbers
        </p>
        <h2
          className="mt-5 font-display text-5xl font-semibold tracking-tight sm:text-6xl"
          style={reveal(150, "translateY(32px)")}
        >
          Made by hand. <em className="font-normal text-primary">Loved by thousands.</em>
        </h2>

        <div className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-[2rem] border border-border bg-border lg:grid-cols-4">
          {STATS.map((s, i) => (
            <div
              key={s.label}
              className="bg-card p-8 sm:p-12"
              style={reveal(300 + i * 150, "translateY(-64px)")}
            >
              <div className="font-display text-5xl font-extrabold tracking-tight text-primary sm:text-6xl">
                <Counter value={s.value} decimals={s.decimals} suffix={s.suffix} start={inView} />
              </div>
              <p className="mt-3 text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
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
  return (
    <>
      <Hero />
      <section id="home-categories">
        <CategoryIntro />
        <CategoryStack />
      </section>
      <Stats />
      <Steps />
    </>
  );
}

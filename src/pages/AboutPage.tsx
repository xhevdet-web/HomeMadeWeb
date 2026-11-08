import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CreationGuide } from "../about/CreationGuide";
import { shotSrc } from "../about/guides";
import { Button, ButtonLink } from "../components/Button";
import { Icon, type IconName } from "../components/Icon";
import { lookByKey, type LookKey } from "../data/homeCategories";
import { prefersReducedMotion, reveal, useInView } from "../hooks/useInView";
import { useTheme } from "../theme";

const HOW_ID = "about-how";
const rise = (delay: number) => ({ animationDelay: `${delay}ms` });

/** Fades its children in the first time they scroll into view. */
function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.2);
  return (
    <div ref={ref} className={className} style={reveal(inView, delay)}>
      {children}
    </div>
  );
}

/** Title with the site's italic accent ending: "Made for *your ideas.*" */
function SectionTitle({ id, title, accent, className = "" }: { id?: string; title: string; accent: string; className?: string }) {
  return (
    <h2 id={id} className={`font-display text-4xl font-semibold tracking-tight sm:text-6xl ${className}`}>
      {title} <em className="font-normal text-primary">{accent}</em>
    </h2>
  );
}

/* ---------------- Hero ---------------- */

const HERO_TILES: LookKey[] = ["bracelet", "mugs", "cases", "gifts", "necklace", "stickers"];

function AboutHero() {
  const { t } = useTranslation();
  const scrollToGuide = () =>
    document.getElementById(HOW_ID)?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });

  return (
    <section className="relative overflow-hidden" aria-labelledby="about-title">
      <div className="bg-glow pointer-events-none absolute inset-0" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-6 pt-32 pb-20 sm:pt-40 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-28">
        <div>
          <p className="eyebrow animate-rise" style={rise(0)}>
            {t("about.eyebrow")}
          </p>
          <h1
            id="about-title"
            className="animate-rise mt-6 font-display text-5xl leading-[0.98] font-extrabold tracking-tight sm:text-7xl xl:text-8xl"
            style={rise(150)}
          >
            {t("about.heroTitle")}
            <br />
            {t("about.heroTitle2")}
            <br />
            <em className="font-normal text-primary">{t("about.heroTitleAccent")}</em>
          </h1>
          <p className="animate-rise mt-8 max-w-lg text-lg text-muted-foreground" style={rise(300)}>
            {t("about.heroBody")}
          </p>
          <div className="animate-rise mt-10 flex flex-wrap gap-3 sm:gap-4" style={rise(450)}>
            <ButtonLink href="#/create" size="lg" glow>
              {t("about.startCreating")}
            </ButtonLink>
            <Button variant="secondary" size="lg" onClick={scrollToGuide}>
              {t("about.seeHow")}
            </Button>
          </div>
        </div>

        {/* Six of the things you can make; phones show the first three in one row. */}
        <ul className="animate-rise grid grid-cols-3 gap-3 sm:gap-4" style={rise(450)}>
          {HERO_TILES.map((key, i) => (
            <li key={key} className={`${i >= 3 ? "hidden sm:block" : ""} ${i % 3 === 1 ? "sm:translate-y-10" : ""}`}>
              <img
                src={lookByKey(key).image!}
                alt={t("about.heroImage", { name: t(`looks.${key}.name`).toLowerCase() })}
                width={1280}
                height={960}
                decoding="async"
                className="aspect-[3/4] w-full rounded-[1.5rem] border border-border bg-secondary object-cover"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ---------------- Our idea ---------------- */

const FORMULA: { key: "creativity" | "personal" | "craft"; icon: IconName }[] = [
  { key: "creativity", icon: "sparkle" },
  { key: "personal", icon: "pencil" },
  { key: "craft", icon: "hand" },
];

function BrandStory() {
  const { t } = useTranslation();
  return (
    <section className="px-4 sm:px-6" aria-labelledby="about-story">
      <div className="mx-auto grid max-w-7xl gap-6 rounded-[2rem] border border-border bg-card p-6 sm:p-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:p-16">
        <Reveal>
          <p className="eyebrow">{t("about.storyEyebrow")}</p>
          <SectionTitle id="about-story" title={t("about.storyTitle")} accent={t("about.storyTitleAccent")} className="mt-5" />
          <p className="mt-6 text-lg text-muted-foreground">{t("about.storyBody")}</p>
          <p className="mt-4 text-lg text-muted-foreground">{t("about.storyBody2")}</p>

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border p-5">
              <p className="text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">{t("about.shopAsks")}</p>
              <p className="mt-2 font-display text-xl text-muted-foreground italic">{t("about.shopQuestion")}</p>
            </div>
            <div className="rounded-2xl border border-primary/50 bg-primary/10 p-5">
              <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">{t("about.weAsk")}</p>
              <p className="mt-2 font-display text-xl font-semibold italic">{t("about.weQuestion")}</p>
            </div>
          </div>
        </Reveal>

        {/* Creativity + Personalisation + Real craft = the brand. */}
        <Reveal delay={150} className="flex flex-col justify-center">
          <p className="sr-only">{t("about.formulaLabel")}</p>
          <ol className="flex flex-col">
            {FORMULA.map((f, i) => (
              <li key={f.key}>
                {i > 0 && (
                  <span aria-hidden="true" className="flex h-10 items-center pl-[1.6rem] font-display text-2xl text-primary">
                    +
                  </span>
                )}
                <div className="flex items-center gap-4 rounded-2xl border border-border bg-background/40 p-4 sm:p-5">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Icon name={f.icon} size={20} />
                  </span>
                  <div>
                    <p className="font-display text-xl font-semibold">{t(`about.formula.${f.key}.title`)}</p>
                    <p className="text-sm text-muted-foreground">{t(`about.formula.${f.key}.text`)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <div aria-hidden="true" className="flex h-10 items-center pl-[1.6rem] font-display text-2xl text-primary">
            =
          </div>
          <div className="rounded-2xl bg-primary p-5 text-primary-foreground shadow-glow">
            <p className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{t("common.brand")}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- From your screen to your hands ---------------- */

const JOURNEY_STEPS = ["craft", "check", "pack", "ship"] as const;

/** A studio screenshot in the current theme, or the product photo if it's missing. */
function Screenshot({ look, alt }: { look: LookKey; alt: string }) {
  const { theme } = useTheme();
  const { i18n } = useTranslation();
  const [failed, setFailed] = useState(false);
  return (
    <img
      src={failed ? lookByKey(look).image! : shotSrc(look, "detail", theme, i18n.language)}
      alt={alt}
      width={1280}
      height={960}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className="stage-photo aspect-[4/3] w-full rounded-[1.5rem] border border-border object-cover"
    />
  );
}

function Arrow() {
  return (
    <li aria-hidden="true" className="flex items-center justify-center text-primary">
      <Icon name="arrowDown" size={26} className="lg:hidden" />
      <Icon name="arrowRight" size={26} className="hidden lg:block" />
    </li>
  );
}

function ScreenToHands() {
  const { t } = useTranslation();
  return (
    <section className="relative overflow-hidden py-24 sm:py-32" aria-labelledby="about-journey">
      <div className="bg-glow pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-7xl px-6">
        <Reveal>
          <p className="eyebrow">{t("about.journeyEyebrow")}</p>
          <SectionTitle id="about-journey" title={t("about.journeyTitle")} accent={t("about.journeyTitleAccent")} className="mt-5" />
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">{t("about.journeyIntro")}</p>
        </Reveal>

        <ol className="mt-14 grid items-center gap-4 lg:grid-cols-[1fr_auto_0.8fr_auto_1fr] lg:gap-6">
          <li>
            <Reveal>
              <Screenshot look="mugs" alt={t("about.journeyDesignImage")} />
              <h3 className="mt-5 font-display text-2xl font-semibold">{t("about.journeyDesign")}</h3>
              <p className="mt-1 text-muted-foreground">{t("about.journeyDesignText")}</p>
            </Reveal>
          </li>
          <Arrow />
          <li>
            <Reveal delay={150}>
              <div className="rounded-[1.5rem] border border-primary/40 bg-card p-6 sm:p-7">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Icon name="hand" size={22} />
                </span>
                <h3 className="mt-5 font-display text-2xl font-semibold">{t("about.journeyUs")}</h3>
                <ul className="mt-4 flex flex-col gap-3">
                  {JOURNEY_STEPS.map((s) => (
                    <li key={s} className="flex items-center gap-3 text-muted-foreground">
                      <Icon name="check" size={16} className="text-primary" />
                      {t(`about.journeySteps.${s}`)}
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          </li>
          <Arrow />
          <li>
            <Reveal delay={300}>
              <img
                src={lookByKey("mugs").image!}
                alt={t("about.journeyProductImage")}
                width={1280}
                height={960}
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full rounded-[1.5rem] border border-border bg-secondary object-cover"
              />
              <h3 className="mt-5 font-display text-2xl font-semibold">{t("about.journeyProduct")}</h3>
              <p className="mt-1 text-muted-foreground">{t("about.journeyProductText")}</p>
            </Reveal>
          </li>
        </ol>
      </div>
    </section>
  );
}

/* ---------------- Why ---------------- */

const WHY: { key: "you" | "care" | "preview" | "personal"; icon: IconName }[] = [
  { key: "you", icon: "pencil" },
  { key: "care", icon: "hand" },
  { key: "preview", icon: "eye" },
  { key: "personal", icon: "sparkle" },
];

function WhyUs() {
  const { t } = useTranslation();
  return (
    <section className="mx-auto max-w-7xl px-6 pb-24 sm:pb-32" aria-labelledby="about-why">
      <Reveal>
        <p className="eyebrow">{t("about.whyEyebrow")}</p>
        <SectionTitle id="about-why" title={t("about.whyTitle")} accent={t("about.whyTitleAccent")} className="mt-5" />
      </Reveal>
      <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {WHY.map((w, i) => (
          <li key={w.key}>
            <Reveal delay={i * 100} className="h-full">
              <div className="h-full rounded-[1.5rem] border border-border bg-card p-6 sm:p-7">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Icon name={w.icon} size={20} />
                </span>
                <h3 className="mt-6 font-display text-2xl font-semibold">{t(`about.why.${w.key}.title`)}</h3>
                <p className="mt-2 text-muted-foreground">{t(`about.why.${w.key}.text`)}</p>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------- Something that's yours ---------------- */

const MEANING = ["bracelet", "gift", "mug", "case", "stickers"] as const;

function PersonalMeaning() {
  const { t } = useTranslation();
  return (
    <section className="px-4 pb-24 sm:px-6 sm:pb-32" aria-labelledby="about-meaning">
      <div data-theme="dark" className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-border bg-card text-foreground">
        <img
          src={lookByKey("gifts").image!}
          alt={t("about.meaningImage")}
          width={1280}
          height={960}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="bg-fade absolute inset-0" />
        <div className="relative max-w-2xl p-6 py-14 sm:p-14 lg:p-20">
          <Reveal>
            <h2 id="about-meaning" className="font-display text-4xl leading-[1.05] font-extrabold tracking-tight sm:text-6xl">
              {t("about.meaningTitle")}
              <br />
              <em className="font-normal text-primary">{t("about.meaningTitleAccent")}</em>
            </h2>
            <p className="mt-6 text-lg text-muted-foreground">{t("about.meaningBody")}</p>
          </Reveal>
          <ul className="mt-8 flex flex-col gap-3">
            {MEANING.map((m, i) => (
              <li key={m}>
                <Reveal delay={150 + i * 90}>
                  <p className="font-display text-xl italic sm:text-2xl">{t(`about.meaning.${m}`)}</p>
                </Reveal>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ---------------- Final call to action ---------------- */

function FinalCta() {
  const { t } = useTranslation();
  return (
    <section className="px-4 pb-24 sm:px-6 sm:pb-32" aria-labelledby="about-cta">
      <Reveal className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-border bg-card px-6 py-16 text-center sm:px-16 sm:py-24">
        <div className="bg-glow pointer-events-none absolute inset-0" />
        <div className="relative">
          <SectionTitle id="about-cta" title={t("about.ctaTitle")} accent={t("about.ctaTitleAccent")} />
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">{t("about.ctaBody")}</p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <ButtonLink href="#/create" size="lg" glow className="w-full sm:w-auto">
              {t("about.startCreating")}
            </ButtonLink>
            <ButtonLink href="#/studios" variant="secondary" size="lg" className="w-full sm:w-auto">
              {t("about.browseStudios")}
            </ButtonLink>
          </div>
          <p className="mt-10 font-display text-xl text-primary italic">{t("about.ctaTagline")}</p>
        </div>
      </Reveal>
    </section>
  );
}

/* ---------------- Page ---------------- */

export default function AboutPage() {
  // Re-renders text made outside components (guide steps, chip labels) when the language changes.
  useTranslation();
  return (
    <>
      <AboutHero />
      <BrandStory />
      <CreationGuide id={HOW_ID} />
      <ScreenToHands />
      <WhyUs />
      <PersonalMeaning />
      <FinalCta />
    </>
  );
}

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { ButtonLink } from "../components/Button";
import { Chip } from "../components/Controls";
import { Icon } from "../components/Icon";
import { STATIC_CATEGORIES, lookByKey, lookKey, studioBuilder, studioHref, useStudioCategories, type LookKey } from "../data/homeCategories";
import { prefersReducedMotion } from "../hooks/useInView";
import i18n from "../i18n";
import { useTheme } from "../theme";
import { BUILDER_OF_LOOK, GUIDES, shotSrc, type GuideBuilder, type Shot } from "./guides";

/** One chip: a studio the website has, with its walkthrough. */
interface GuideOption {
  key: string;
  name: string;
  look: LookKey;
  builder: GuideBuilder;
  href: string;
}

/** Live studios in API order (labels in the page language); the known studios if the API fails. */
function useGuideOptions(): { options: GuideOption[]; loading: boolean } {
  const { data, error, loading } = useStudioCategories();
  if (data) {
    const options = data.flatMap((c): GuideOption[] => {
      const builder = studioBuilder(c);
      const look = lookKey(c);
      if (!builder || builder === "BOUQUET") return [];
      return [{ key: c.id, name: look ? i18n.t(`looks.${look}.name`) : c.name, look: look ?? "bracelet", builder, href: studioHref(c) }];
    });
    return { options, loading: false };
  }
  if (error)
    return {
      loading: false,
      options: STATIC_CATEGORIES.map((look) => ({ key: look, name: i18n.t(`looks.${look}.name`), look, builder: BUILDER_OF_LOOK[look], href: "#/studios" })),
    };
  return { options: [], loading };
}

/** `about.guide.<builder>.<step>.<field>`; the ids come from GUIDES, which mirrors the translations. */
const guideText = (builder: GuideBuilder, step: string, field: "title" | "text") =>
  i18n.t(`about.guide.${builder}.${step}.${field}` as "about.guide.MUG.image.title");

const pad = (n: number) => String(n).padStart(2, "0");

function StepImage({ option, shot, alt, eager }: { option: GuideOption; shot: Shot; alt: string; eager: boolean }) {
  const { theme } = useTheme();
  const { i18n: { language } } = useTranslation();
  const photo = lookByKey(option.look).image;
  const screenshot = shot === "photo" ? null : shotSrc(option.look, shot, theme, language);
  const [failed, setFailed] = useState(false);
  const src = screenshot && !failed ? screenshot : photo;
  // Studio screens fill the frame from the top; a cropped stage or a product photo is centred.
  const fit = src === photo ? "object-cover" : shot === "detail" ? "object-contain p-3 sm:p-5" : "object-cover object-top";

  return (
    <div className={`stage-photo aspect-[4/3] overflow-hidden rounded-[1.5rem] ${src === photo ? "" : "border border-border"}`}>
      {src && (
        <img
          key={src}
          src={src}
          alt={alt}
          width={1280}
          height={960}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onError={() => setFailed(true)}
          className={`img-fade h-full w-full ${fit}`}
        />
      )}
    </div>
  );
}

function CreationSlider({ option }: { option: GuideOption }) {
  const { t } = useTranslation();
  const steps = GUIDES[option.builder];
  const total = steps.length;
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  /** While a button-driven smooth scroll runs, scroll events in between don't move the index. */
  const target = useRef<number | null>(null);
  const settle = useRef(0);

  const titles = steps.map((s) => guideText(option.builder, s.id, "title"));

  const go = (next: number) => {
    const el = track.current;
    const i = Math.max(0, Math.min(total - 1, next));
    if (!el) return;
    target.current = i;
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => (target.current = null), 800);
    el.scrollTo({ left: i * el.clientWidth, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    setIndex(i);
  };

  const onScroll = () => {
    const el = track.current;
    if (!el || !el.clientWidth) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (target.current !== null) {
      if (i === target.current) target.current = null;
      return;
    }
    setIndex(i);
  };

  // Keeps the current step in view when the track's width changes (rotation, window resize).
  const indexRef = useRef(index);
  indexRef.current = index;
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      el.scrollTo({ left: indexRef.current * width, behavior: "auto" });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => window.clearTimeout(settle.current), []);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") go(index + 1);
    else if (e.key === "ArrowLeft") go(index - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(total - 1);
    else return;
    e.preventDefault();
  };

  const roundButton =
    "flex h-12 w-12 items-center justify-center rounded-full border border-border transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent";

  return (
    <div className="img-fade mt-10">
      {/* Desktop: the whole journey at a glance, every step clickable. */}
      <ol className="mb-6 hidden items-center gap-3 lg:flex" aria-label={t("controls.progress")}>
        {steps.map((s, i) => (
          <li key={s.id} className={`flex items-center gap-3 ${i < total - 1 ? "flex-1" : ""}`}>
            <button
              type="button"
              onClick={() => go(i)}
              aria-current={i === index ? "step" : undefined}
              aria-label={t("about.goToStep", { number: i + 1, title: titles[i] })}
              className={`flex items-center gap-2.5 rounded-full py-1 pr-2 text-left text-sm font-semibold transition-colors ${
                i === index ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display font-bold transition-colors ${
                  i === index ? "bg-primary text-primary-foreground" : i < index ? "border border-primary text-primary" : "border border-border"
                }`}
              >
                {pad(i + 1)}
              </span>
              <span className="max-w-[11rem] leading-tight">{titles[i]}</span>
            </button>
            {i < total - 1 && <span aria-hidden="true" className={`h-px flex-1 transition-colors ${i < index ? "bg-primary" : "bg-border"}`} />}
          </li>
        ))}
      </ol>

      <div
        ref={track}
        onScroll={onScroll}
        onKeyDown={onKey}
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label={t("about.carouselLabel", { name: option.name })}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-[2rem] border border-border bg-card"
      >
        {steps.map((s, i) => {
          const active = i === index;
          const last = i === total - 1;
          return (
            <section
              key={s.id}
              role="group"
              aria-roledescription="slide"
              aria-label={t("about.stepOf", { number: i + 1, total })}
              aria-hidden={!active}
              className="grid w-full shrink-0 snap-start snap-always grid-cols-1 gap-6 p-4 sm:p-6 md:grid-cols-[1.15fr_1fr] md:items-center md:gap-10 lg:p-10"
            >
              <StepImage option={option} shot={s.shot} eager={i === 0} alt={t("about.stepImage", { title: titles[i], name: option.name })} />
              <div className="px-2 pb-2 sm:px-0 md:pb-0">
                <p className="font-display text-6xl leading-none font-extrabold tracking-tight text-primary sm:text-7xl">{pad(i + 1)}</p>
                <p className="mt-4 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">{t("about.stepOf", { number: i + 1, total })}</p>
                <h3 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{titles[i]}</h3>
                <p className="mt-3 text-base text-muted-foreground sm:text-lg">{guideText(option.builder, s.id, "text")}</p>
                {last && (
                  <ButtonLink href={option.href} glow className="mt-7" tabIndex={active ? undefined : -1}>
                    {t("about.openStudio", { name: option.name.toLowerCase() })}
                  </ButtonLink>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <button type="button" onClick={() => go(index - 1)} disabled={index === 0} aria-label={t("about.previous")} className={roundButton}>
          <Icon name="chevronLeft" size={20} />
        </button>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1" aria-hidden="true">
            {steps.map((s, i) => (
              <button
                key={s.id}
                type="button"
                tabIndex={-1}
                onClick={() => go(i)}
                className="flex h-6 items-center px-1"
              >
                <span className={`block h-2 rounded-full transition-all duration-300 ${i === index ? "w-6 bg-primary" : "w-2 bg-border"}`} />
              </button>
            ))}
          </div>
          <p className="min-w-[3.5rem] font-display text-sm font-semibold text-muted-foreground tabular-nums" aria-live="polite">
            <span className="sr-only">{t("about.stepLabel", { number: index + 1, title: titles[index] })}</span>
            <span aria-hidden="true">
              {index + 1} / {total}
            </span>
          </p>
        </div>
        <button type="button" onClick={() => go(index + 1)} disabled={index === total - 1} aria-label={t("about.next")} className={roundButton}>
          <Icon name="chevronRight" size={20} />
        </button>
      </div>
    </div>
  );
}

/** "How do you want to create?": pick a studio, then walk through its real steps. */
export function CreationGuide({ id }: { id: string }) {
  const { t } = useTranslation();
  const { options, loading } = useGuideOptions();
  const [selected, setSelected] = useState<string | null>(null);
  const current = options.find((o) => o.key === selected) ?? options[0];

  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="px-2 sm:px-0">
          <p className="eyebrow">{t("about.howEyebrow")}</p>
          <h2 id={`${id}-title`} className="mt-5 font-display text-4xl font-semibold tracking-tight sm:text-6xl">
            {t("about.howTitle")} <em className="font-normal text-primary">{t("about.howTitleAccent")}</em>
          </h2>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">{t("about.howIntro")}</p>
        </div>

        {loading ? (
          <div role="status" aria-label={t("about.loadingProducts")}>
            <div className="mt-10 flex gap-2 px-2 sm:px-0">
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className="h-10 w-24 animate-pulse rounded-full border border-border bg-card" />
              ))}
            </div>
            <div className="mt-10 h-[520px] animate-pulse rounded-[2rem] border border-border bg-card" />
          </div>
        ) : (
          current && (
            <>
              {/* Phones: one swipeable row that runs to the screen edges; wraps from sm up. */}
              <div
                role="group"
                aria-label={t("about.filterLabel")}
                className="no-scrollbar -mx-4 mt-10 flex gap-2 overflow-x-auto px-6 py-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0"
              >
                {options.map((o) => (
                  <Chip key={o.key} selected={o.key === current.key} onClick={() => setSelected(o.key)}>
                    {o.name}
                  </Chip>
                ))}
              </div>
              {/* Keyed so each studio starts on step 1 with a soft fade. */}
              <CreationSlider key={current.key} option={current} />
            </>
          )
        )}
      </div>
    </section>
  );
}

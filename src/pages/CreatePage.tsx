import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { BuilderType, Category } from "../api/models";
import { ButtonLink } from "../components/Button";
import { Chip, inputClass } from "../components/Controls";
import { Icon } from "../components/Icon";
import { Page, PageHeader } from "../components/Page";
import { StepIndicator } from "../components/StepIndicator";
import { lookFor, studioBuilder, studioHref, useStudioCategories } from "../data/homeCategories";
import i18n, { dateLocale } from "../i18n";
import { hasContent, missingUploads } from "../studio/drafts";
import { useStudio } from "../studio/StudioContext";
import { LoadError } from "../studio/StudioShell";

type GroupId = "all" | "jewelry" | "home" | "apparel" | "tech" | "gifts";
const GROUPS: { id: GroupId; builders: BuilderType[] }[] = [
  { id: "all", builders: [] },
  { id: "jewelry", builders: ["JEWELRY"] },
  { id: "home", builders: ["MUG", "STICKER"] },
  { id: "apparel", builders: ["APPAREL"] },
  { id: "tech", builders: ["CASE"] },
  { id: "gifts", builders: ["GIFT"] },
];

/** "5 minutes ago" / "5 minuta më parë", in the current language. */
function timeAgo(ms: number) {
  const minutes = Math.round((Date.now() - ms) / 60_000);
  if (minutes < 1) return i18n.t("create.justNow");
  const rtf = new Intl.RelativeTimeFormat(dateLocale(), { numeric: "auto" });
  if (minutes < 60) return rtf.format(-minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (hours < 24) return rtf.format(-hours, "hour");
  return rtf.format(-Math.round(hours / 24), "day");
}

/** The most recently edited draft that has something in it, kept in this browser. */
function useLastDraft(categories: Category[] | undefined) {
  const { drafts } = useStudio();
  if (!categories) return null;
  const entries = Object.entries(drafts)
    .filter(([, e]) => hasContent(e.draft))
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt);
  for (const [id, entry] of entries) {
    const category = categories.find((c) => c.id === id);
    if (category) return { category, entry };
  }
  return null;
}

export default function CreatePage() {
  const { t } = useTranslation();
  const { data, loading, error, retry } = useStudioCategories();
  const [group, setGroup] = useState<GroupId>("all");
  const [search, setSearch] = useState("");
  const last = useLastDraft(data);

  const q = search.trim().toLowerCase();
  const builders = GROUPS.find((g) => g.id === group)?.builders ?? [];
  const shown = (data ?? []).filter((c) => {
    const b = studioBuilder(c);
    const look = lookFor(c);
    return (!builders.length || (b && builders.includes(b))) && (!q || `${c.name} ${look.text} ${c.description ?? ""}`.toLowerCase().includes(q));
  });

  return (
    <Page>
      <PageHeader
        eyebrow={t("nav.startCreating")}
        title={
          <>
            {t("create.title")} <em className="font-normal text-primary">{t("create.titleAccent")}</em>
          </>
        }
        intro={t("create.intro")}
      />

      {last && (
        <section
          aria-label={t("create.continueMine")}
          className="animate-rise mt-12 flex flex-col gap-5 rounded-[2rem] border border-border bg-card p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5"
          style={{ animationDelay: "450ms" }}
        >
          {lookFor(last.category).image && <img src={lookFor(last.category).image!} alt="" className="aspect-[4/3] w-full rounded-2xl object-cover sm:h-24 sm:w-32" />}
          <div className="flex-1 px-2 sm:px-0">
            <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">{t("create.continueMine")}</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">{t("create.yourDesign", { name: last.category.name.toLowerCase() })}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("create.lastEdited", { time: timeAgo(last.entry.updatedAt) })}
              {missingUploads(last.entry.draft) > 0 && ` · ${t("create.reuploadToFinish")}`}
            </p>
          </div>
          <ButtonLink href={studioHref(last.category, "design")} variant="secondary" className="mx-2 mb-2 sm:m-0 sm:mr-2">
            {t("create.continueDesigning")}
          </ButtonLink>
        </section>
      )}

      <StepIndicator steps={[t("create.stepChoose"), t("create.stepExplore"), t("create.stepCreate")]} active={0} className="mt-14" />

      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative lg:w-80">
          <label htmlFor="studio-search" className="sr-only">
            {t("create.searchLabel")}
          </label>
          <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground" />
          <input id="studio-search" type="search" placeholder={t("create.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} className={`${inputClass} rounded-full pl-11`} />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("create.filterLabel")}>
          {GROUPS.map((g) => (
            <Chip key={g.id} selected={g.id === group} onClick={() => setGroup(g.id)}>
              {t(`create.groups.${g.id}`)}
            </Chip>
          ))}
        </div>
      </div>

      {loading && (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-label={t("common.loading")}>
          {Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="h-72 animate-pulse rounded-2xl border border-border bg-card" />
          ))}
        </ul>
      )}
      {error && <LoadError className="mt-8" message={error} onRetry={retry} />}
      {data &&
        (shown.length > 0 ? (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {shown.map((c) => {
              const look = lookFor(c);
              return (
                <li key={c.id}>
                  <a href={studioHref(c)} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors duration-500 hover:border-foreground/30">
                    <div className="aspect-[4/3] overflow-hidden bg-secondary">
                      {look.image && <img src={look.image} alt={t("studios.imageAlt", { name: c.name })} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h2 className="font-display text-2xl font-semibold">{c.name}</h2>
                      <p className="mt-2 text-sm text-muted-foreground">{look.text}</p>
                      <p className="mt-auto pt-4 text-sm font-semibold text-primary">{t("create.designYourOwn")}</p>
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-10 rounded-2xl border border-border bg-card px-6 py-10 text-center text-muted-foreground">
            {data.length ? t("create.noMatch", { query: search || t(`create.groups.${group}`) }) : t("studios.emptyLong")}
          </p>
        ))}
    </Page>
  );
}

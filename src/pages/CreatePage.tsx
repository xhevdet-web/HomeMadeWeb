import { useState } from "react";
import type { BuilderType, Category } from "../api/models";
import { ButtonLink } from "../components/Button";
import { Chip, inputClass } from "../components/Controls";
import { Icon } from "../components/Icon";
import { Page, PageHeader } from "../components/Page";
import { StepIndicator } from "../components/StepIndicator";
import { lookFor, studioBuilder, studioHref, useStudioCategories } from "../data/homeCategories";
import { hasContent, missingUploads } from "../studio/drafts";
import { useStudio } from "../studio/StudioContext";
import { LoadError } from "../studio/StudioShell";

const GROUPS: { label: string; builders: BuilderType[] }[] = [
  { label: "All", builders: [] },
  { label: "Jewelry", builders: ["JEWELRY"] },
  { label: "Home", builders: ["MUG", "STICKER"] },
  { label: "Apparel", builders: ["APPAREL"] },
  { label: "Tech", builders: ["CASE"] },
  { label: "Gifts", builders: ["GIFT"] },
];

function timeAgo(ms: number) {
  const minutes = Math.round((Date.now() - ms) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
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
  const { data, loading, error, retry } = useStudioCategories();
  const [group, setGroup] = useState("All");
  const [search, setSearch] = useState("");
  const last = useLastDraft(data);

  const q = search.trim().toLowerCase();
  const builders = GROUPS.find((g) => g.label === group)?.builders ?? [];
  const shown = (data ?? []).filter((c) => {
    const b = studioBuilder(c);
    const look = lookFor(c);
    return (!builders.length || (b && builders.includes(b))) && (!q || `${c.name} ${look.text} ${c.description ?? ""}`.toLowerCase().includes(q));
  });

  return (
    <Page>
      <PageHeader
        eyebrow="Start creating"
        title={
          <>
            Create your <em className="font-normal text-primary">story.</em>
          </>
        }
        intro="A bracelet for a memory. A necklace for someone special. Start with a piece and make it yours."
      />

      {last && (
        <section
          aria-label="Continue my design"
          className="animate-rise mt-12 flex flex-col gap-5 rounded-[2rem] border border-border bg-card p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5"
          style={{ animationDelay: "450ms" }}
        >
          {lookFor(last.category).image && <img src={lookFor(last.category).image!} alt="" className="aspect-[4/3] w-full rounded-2xl object-cover sm:h-24 sm:w-32" />}
          <div className="flex-1 px-2 sm:px-0">
            <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Continue my design</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">Your {last.category.name.toLowerCase()} design</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Last edited {timeAgo(last.entry.updatedAt)}
              {missingUploads(last.entry.draft) > 0 && " · re-upload your image to finish it"}
            </p>
          </div>
          <ButtonLink href={studioHref(last.category, "design")} variant="secondary" className="mx-2 mb-2 sm:m-0 sm:mr-2">
            Continue designing →
          </ButtonLink>
        </section>
      )}

      <StepIndicator steps={["Choose a category", "Explore", "Create"]} active={0} className="mt-14" />

      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative lg:w-80">
          <label htmlFor="studio-search" className="sr-only">
            Search categories
          </label>
          <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground" />
          <input id="studio-search" type="search" placeholder="Search bracelets, mugs, cases…" value={search} onChange={(e) => setSearch(e.target.value)} className={`${inputClass} rounded-full pl-11`} />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {GROUPS.map((g) => (
            <Chip key={g.label} selected={g.label === group} onClick={() => setGroup(g.label)}>
              {g.label}
            </Chip>
          ))}
        </div>
      </div>

      {loading && (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="status" aria-label="Loading">
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
                      {look.image && <img src={look.image} alt={`Custom ${c.name.toLowerCase()}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h2 className="font-display text-2xl font-semibold">{c.name}</h2>
                      <p className="mt-2 text-sm text-muted-foreground">{look.text}</p>
                      <p className="mt-auto pt-4 text-sm font-semibold text-primary">Design your own</p>
                    </div>
                  </a>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-10 rounded-2xl border border-border bg-card px-6 py-10 text-center text-muted-foreground">
            {data.length ? `No categories match “${search || group}”.` : "No studios yet. Please check back soon."}
          </p>
        ))}
    </Page>
  );
}

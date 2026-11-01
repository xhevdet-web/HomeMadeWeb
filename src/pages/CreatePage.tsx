import { useState } from "react";
import { ButtonLink } from "../components/Button";
import { Chip, inputClass } from "../components/Controls";
import { Icon } from "../components/Icon";
import { Page, PageHeader } from "../components/Page";
import { StepIndicator } from "../components/StepIndicator";
import { CATEGORY_GROUPS, STUDIOS, lastDraft } from "../data/mock";

export default function CreatePage() {
  const [group, setGroup] = useState<(typeof CATEGORY_GROUPS)[number]>("All");
  const [search, setSearch] = useState("");

  const q = search.trim().toLowerCase();
  const studios = STUDIOS.filter(
    (s) => (group === "All" || s.group === group) && (!q || `${s.name} ${s.text}`.toLowerCase().includes(q)),
  );

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

      {/* Continue my design */}
      <section
        aria-label="Continue my design"
        className="animate-rise mt-12 flex flex-col gap-5 rounded-[2rem] border border-border bg-card p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5"
        style={{ animationDelay: "450ms" }}
      >
        <img
          src={lastDraft.image}
          alt={lastDraft.name}
          width={128}
          height={128}
          className="aspect-[4/3] w-full rounded-2xl object-cover sm:h-24 sm:w-32"
        />
        <div className="flex-1 px-2 sm:px-0">
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Continue my design</p>
          <h2 className="mt-1 font-display text-2xl font-semibold">{lastDraft.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Last edited {lastDraft.lastEdited}</p>
        </div>
        <ButtonLink href={`#/studios/${lastDraft.studio}/design?load=last`} variant="secondary" className="mx-2 mb-2 sm:m-0 sm:mr-2">
          Continue designing →
        </ButtonLink>
      </section>

      <StepIndicator steps={["Choose a category", "Explore", "Create"]} active={0} className="mt-14" />

      {/* Search + filters */}
      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative lg:w-80">
          <label htmlFor="studio-search" className="sr-only">
            Search categories
          </label>
          <Icon name="search" size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="studio-search"
            type="search"
            placeholder="Search bracelets, mugs, cases…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${inputClass} rounded-full pl-11`}
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {CATEGORY_GROUPS.map((g) => (
            <Chip key={g} selected={g === group} onClick={() => setGroup(g)}>
              {g}
            </Chip>
          ))}
        </div>
      </div>

      {/* Category grid */}
      {studios.length > 0 ? (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {studios.map((s) => (
            <li key={s.slug}>
              <a
                href={`#/studios/${s.slug}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors duration-500 hover:border-foreground/30"
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={s.image}
                    alt={`Custom ${s.name.toLowerCase()}`}
                    width={1280}
                    height={960}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="font-display text-2xl font-semibold">{s.name}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
                  <p className="mt-auto pt-4 text-sm font-semibold text-primary">{s.meta}</p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-10 rounded-2xl border border-border bg-card px-6 py-10 text-center text-muted-foreground">
          No categories match “{search}”. Try another word.
        </p>
      )}
    </Page>
  );
}

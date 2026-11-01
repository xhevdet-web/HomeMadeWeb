import { useState, type ReactNode } from "react";
import { ButtonLink } from "../components/Button";
import { Chip } from "../components/Controls";
import { EmptyState, PreviewFrame } from "../components/EmptyState";
import { Icon } from "../components/Icon";
import { Page, PageHeader } from "../components/Page";
import { DESIGNS, getStudio, money, type StudioSlug } from "../data/mock";
import { useStudio } from "../studio/StudioContext";
import { SavedThumb } from "../studios/registry";

const MAX_CHIPS = 3;

interface Card {
  id: string;
  name: string;
  studio: StudioSlug;
  price: number;
  meta: string;
  materials: string[];
  readyMade?: boolean;
  isNew?: boolean;
  thumb: ReactNode;
  orderHref: string;
}

export default function DesignsPage() {
  const { saved } = useStudio();
  const [filter, setFilter] = useState("all");
  const all: Card[] = [
    ...saved.map((d) => ({
      id: d.id,
      name: d.name,
      studio: d.studio,
      price: d.price,
      meta: d.meta,
      materials: d.materials ?? [],
      isNew: true,
      thumb: <SavedThumb design={d} />,
      orderHref: `#/checkout?design=${d.id}&qty=${d.quantity}`,
    })),
    ...DESIGNS.map((d) => ({
      id: d.id,
      name: d.name,
      studio: d.studio,
      price: d.price,
      meta: d.meta,
      materials: d.materials ?? [],
      readyMade: d.readyMade,
      thumb: <img src={d.image} alt={d.name} width={960} height={960} loading="lazy" className="h-full w-full object-cover" />,
      orderHref: `#/checkout?design=${d.id}`,
    })),
  ];
  const studios = [...new Set(all.map((d) => d.studio))];
  const designs = filter === "all" ? all : all.filter((d) => d.studio === filter);

  return (
    <Page>
      <PageHeader
        eyebrow="My designs"
        title={
          <>
            Saved and <em className="font-normal text-primary">ready to order.</em>
          </>
        }
        intro={`${all.length} saved designs`}
        aside={
          <ButtonLink href="#/create">
            <Icon name="plus" size={18} /> New design
          </ButtonLink>
        }
      />

      <div className="mt-12 flex flex-wrap gap-2" role="group" aria-label="Filter by studio">
        <Chip selected={filter === "all"} onClick={() => setFilter("all")}>
          All
        </Chip>
        {studios.map((slug) => (
          <Chip key={slug} selected={filter === slug} onClick={() => setFilter(slug)}>
            {getStudio(slug)?.name}
          </Chip>
        ))}
      </div>

      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {designs.map((d) => {
          const materials = d.materials;
          return (
            <li key={d.id} className="flex flex-col rounded-[2rem] border border-border bg-card p-4">
              <div className="relative aspect-square overflow-hidden rounded-[1.5rem] bg-secondary">
                {d.thumb}
                {d.isNew && (
                  <span className="absolute top-4 left-4 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Saved this session
                  </span>
                )}
                {d.readyMade && (
                  <span className="absolute top-4 left-4 rounded-full bg-background/80 px-3 py-1 text-xs font-semibold backdrop-blur-md">
                    Ready-made
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col px-2 pt-5">
                <div className="flex items-start justify-between gap-4">
                  <h2 className="font-display text-2xl font-semibold">{d.name}</h2>
                  <span className="font-display text-xl font-semibold text-primary">{money(d.price)}</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{d.meta}</p>

                {materials.length > 0 && (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {materials.slice(0, MAX_CHIPS).map((m) => (
                      <li key={m} className="rounded-full bg-secondary px-3 py-1 text-xs">
                        {m}
                      </li>
                    ))}
                    {materials.length > MAX_CHIPS && (
                      <li className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                        +{materials.length - MAX_CHIPS} more
                      </li>
                    )}
                  </ul>
                )}

                <div className="mt-auto" />
                <div className="mt-6 flex items-center justify-between gap-4 border-t border-border pt-4">
                  {d.readyMade ? (
                    <span className="text-sm text-muted-foreground">Made by HomeCreator</span>
                  ) : (
                    <a
                      href={`#/studios/${d.studio}/design?load=${d.id}`}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Icon name="pencil" size={15} /> Edit copy
                    </a>
                  )}
                  <ButtonLink href={d.orderHref} size="sm">
                    Order →
                  </ButtonLink>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <PreviewFrame label="Empty state preview">
        <EmptyState
          icon="sparkle"
          title="No saved designs yet"
          text="Create your first piece in the studio. Saved designs appear here, ready to order."
          action={{ href: "#/create", label: "Start designing" }}
        />
      </PreviewFrame>
    </Page>
  );
}

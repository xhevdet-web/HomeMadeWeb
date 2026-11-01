import { EmptyState } from "../components/EmptyState";
import { Page, PageHeader } from "../components/Page";
import { lookFor, studioHref, useStudioCategories } from "../data/homeCategories";
import { countWord } from "../lib/format";
import { LoadError } from "../studio/StudioShell";

export function CategorySkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className="h-[420px] animate-pulse rounded-[2rem] border border-border bg-card" />
      ))}
    </ul>
  );
}

export default function StudiosPage() {
  const { data, loading, error, retry } = useStudioCategories();
  const n = data?.length ?? 0;

  return (
    <Page>
      <PageHeader
        eyebrow="Creative studios"
        title={
          <>
            {data ? `${countWord(n)} studio${n === 1 ? "" : "s"}.` : "Our studios."} <em className="font-normal text-primary">One idea: yours.</em>
          </>
        }
        intro="Every piece starts in a studio. Pick one, design it your way, and we make it by hand."
      />

      {loading && <CategorySkeleton />}
      {error && <LoadError className="mt-16" message={error} onRetry={retry} />}
      {data && n === 0 && (
        <div className="mt-16">
          <EmptyState icon="sparkle" title="No studios yet" text="New studios are on their way. Please check back soon." action={{ href: "#/", label: "Back to home" }} />
        </div>
      )}
      {data && n > 0 && (
        <ul className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c, i) => {
            const look = lookFor(c);
            return (
              <li key={c.id} className="animate-rise" style={{ animationDelay: `${450 + i * 80}ms` }}>
                <a
                  href={studioHref(c)}
                  className="group flex h-full flex-col rounded-[2rem] border border-border bg-card p-4 transition-colors duration-500 hover:border-foreground/30"
                >
                  <div className="aspect-[4/3] overflow-hidden rounded-[1.5rem] bg-secondary">
                    {look.image && (
                      <img
                        src={look.image}
                        alt={`Custom ${c.name.toLowerCase()}`}
                        width={1280}
                        height={960}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col px-3 pt-6 pb-3">
                    <p className="font-display text-lg text-primary italic">{look.line}</p>
                    <h2 className="mt-1 font-display text-4xl font-extrabold tracking-tight">{c.name}</h2>
                    <p className="mt-3 text-muted-foreground">{look.studio}</p>
                    <span className="mt-auto pt-8 text-right text-sm font-semibold transition-colors group-hover:text-primary">Open studio →</span>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </Page>
  );
}

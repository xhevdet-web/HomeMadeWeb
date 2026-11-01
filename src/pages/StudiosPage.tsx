import { Page, PageHeader } from "../components/Page";
import { STUDIOS, money } from "../data/mock";

export default function StudiosPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="Creative studios"
        title={
          <>
            Seven studios. <em className="font-normal text-primary">One idea: yours.</em>
          </>
        }
        intro="Every piece starts in a studio. Pick one, design it your way, and we make it by hand."
      />

      <ul className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {STUDIOS.map((s, i) => (
          <li key={s.slug} className="animate-rise" style={{ animationDelay: `${450 + i * 80}ms` }}>
            <a
              href={`#/studios/${s.slug}`}
              className="group flex h-full flex-col rounded-[2rem] border border-border bg-card p-4 transition-colors duration-500 hover:border-foreground/30"
            >
              <div className="aspect-[4/3] overflow-hidden rounded-[1.5rem]">
                <img
                  src={s.image}
                  alt={`Custom ${s.name.toLowerCase()}`}
                  width={1280}
                  height={960}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col px-3 pt-6 pb-3">
                <p className="font-display text-lg text-primary italic">{s.line}</p>
                <h2 className="mt-1 font-display text-4xl font-extrabold tracking-tight">{s.name}</h2>
                <p className="mt-3 text-muted-foreground">{s.description}</p>
                <div className="mt-auto flex items-end justify-between gap-4 pt-8">
                  <span className="text-sm text-muted-foreground">
                    from <span className="font-display text-xl font-semibold text-primary">{money(s.fromPrice)}</span>
                  </span>
                  <span className="text-sm font-semibold transition-colors group-hover:text-primary">Open studio →</span>
                </div>
              </div>
            </a>
          </li>
        ))}
      </ul>
    </Page>
  );
}

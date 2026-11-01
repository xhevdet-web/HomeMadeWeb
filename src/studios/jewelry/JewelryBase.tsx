import { Icon } from "../../components/Icon";
import { JEWELRY } from "../../data/studioCatalog";
import { useStudio } from "../../studio/StudioContext";
import { ContinueButton, StudioShell } from "../../studio/StudioShell";
import { formatCm, type JewelrySlug } from "./logic";

/** Step 1: choose a size card, then fine-tune the length in 0.5 cm steps. */
export function JewelryBase({ slug }: { slug: JewelrySlug }) {
  const config = JEWELRY[slug];
  const { drafts, setDraft } = useStudio();
  const draft = drafts[slug];
  const size = config.sizes.find((s) => s.id === draft.sizeId);

  const setLength = (mm: number) => {
    if (!size) return;
    setDraft(slug, { ...draft, lengthMm: Math.min(size.maxCm * 10, Math.max(size.minCm * 10, mm)) });
  };

  return (
    <StudioShell
      slug={slug}
      step={0}
      title={
        <>
          Choose your <em className="font-normal text-primary">size.</em>
        </>
      }
      intro={`Pick a size, then fine-tune the length of your ${config.noun} in half-centimetre steps.`}
    >
      <div className="mt-10 grid gap-4 sm:grid-cols-3" role="radiogroup" aria-label="Size">
        {config.sizes.map((s) => {
          const active = s.id === draft.sizeId;
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setDraft(slug, { ...draft, sizeId: s.id, lengthMm: s.usualCm * 10 })}
              className={`rounded-[2rem] border p-6 text-left transition-colors sm:p-8 ${
                active ? "border-primary bg-primary/10" : "border-border bg-card hover:border-foreground/30"
              }`}
            >
              <span className="block font-display text-4xl font-extrabold">{s.label}</span>
              <span className="mt-2 block text-lg">
                {s.minCm}–{s.maxCm} cm
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">Usually {s.usualCm} cm</span>
            </button>
          );
        })}
      </div>

      {size && (
        <section className="mt-6 rounded-[2rem] border border-border bg-card p-6 sm:p-8" aria-label="Length">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="text-muted-foreground">Your {config.noun} length</p>
            <p className="font-display text-4xl font-semibold text-primary">{formatCm(draft.lengthMm)}</p>
          </div>
          <div className="mt-6 flex items-center gap-4">
            <button
              type="button"
              aria-label="Shorter by 0.5 cm"
              onClick={() => setLength(draft.lengthMm - 5)}
              disabled={draft.lengthMm <= size.minCm * 10}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border transition-colors hover:bg-secondary disabled:opacity-40"
            >
              <Icon name="minus" size={18} />
            </button>
            <label htmlFor="length-slider" className="sr-only">
              Length in millimetres
            </label>
            <input
              id="length-slider"
              type="range"
              min={size.minCm * 10}
              max={size.maxCm * 10}
              step={5}
              value={draft.lengthMm}
              onChange={(e) => setLength(Number(e.target.value))}
              aria-valuetext={formatCm(draft.lengthMm)}
              className="w-full accent-[var(--primary)]"
            />
            <button
              type="button"
              aria-label="Longer by 0.5 cm"
              onClick={() => setLength(draft.lengthMm + 5)}
              disabled={draft.lengthMm >= size.maxCm * 10}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border transition-colors hover:bg-secondary disabled:opacity-40"
            >
              <Icon name="plus" size={18} />
            </button>
          </div>
          <div className="mt-2 flex justify-between px-14 text-xs text-muted-foreground">
            <span>{size.minCm} cm</span>
            <span>{size.maxCm} cm</span>
          </div>
        </section>
      )}

      <div className="mt-8">
        <ContinueButton ready={!!size} href={`#/studios/${slug}/design`} label="Continue to the studio" />
      </div>
    </StudioShell>
  );
}

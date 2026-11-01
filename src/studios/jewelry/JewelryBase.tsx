import { Icon } from "../../components/Icon";
import { measuredSizes } from "../../api/models";
import { cm } from "../../lib/format";
import { useStudio } from "../../studio/StudioContext";
import { ContinueButton, StudioShell } from "../../studio/StudioShell";
import { studioHref } from "../../data/homeCategories";
import { ReadyMade } from "../ReadyMade";
import type { StudioProps } from "../data";
import { STEP_MM, nounOf, sizeOf } from "./logic";

/** Step 1: choose a size card, then fine-tune the length in 0.5 cm steps. */
export function JewelryBase({ category, data }: StudioProps) {
  const { getDraft, setDraft } = useStudio();
  const draft = getDraft(category.id, "JEWELRY");
  const sizes = measuredSizes(category);
  const size = sizeOf(category, draft);
  const noun = nounOf(category);

  const setLength = (mm: number) => {
    if (!size) return;
    setDraft(category.id, { ...draft, lengthMm: Math.min(size.maxMeasurementMm, Math.max(size.minMeasurementMm, Math.round(mm))) });
  };

  return (
    <StudioShell
      category={category}
      step={0}
      others
      title={
        <>
          Choose your <em className="font-normal text-primary">size.</em>
        </>
      }
      intro={`Pick a size, then fine-tune the length of your ${noun} in half-centimetre steps.`}
    >
      {sizes.length === 0 ? (
        <p className="mt-10 rounded-[2rem] border border-border bg-card px-6 py-12 text-center text-muted-foreground">
          This studio has no sizes yet. Please check back soon.
        </p>
      ) : (
        <div className="mt-10 grid gap-4 sm:grid-cols-3" role="radiogroup" aria-label="Size">
          {sizes.map((s) => {
            const active = s.id === draft.sizeId;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setDraft(category.id, { ...draft, sizeId: s.id, lengthMm: s.defaultMeasurementMm })}
                className={`rounded-[2rem] border p-6 text-left transition-colors sm:p-8 ${
                  active ? "border-primary bg-primary/10" : "border-border bg-card hover:border-foreground/30"
                }`}
              >
                <span className="block font-display text-4xl font-extrabold">{s.name}</span>
                <span className="mt-2 block text-lg">
                  {cm(s.minMeasurementMm).replace(" cm", "")}–{cm(s.maxMeasurementMm)}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">Usually {cm(s.defaultMeasurementMm)}</span>
              </button>
            );
          })}
        </div>
      )}

      {size && (
        <section className="mt-6 rounded-[2rem] border border-border bg-card p-6 sm:p-8" aria-label="Length">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="text-muted-foreground">Your {noun} length</p>
            <p className="font-display text-4xl font-semibold text-primary">{cm(draft.lengthMm)}</p>
          </div>
          <div className="mt-6 flex items-center gap-4">
            <button
              type="button"
              aria-label="Shorter by 0.5 cm"
              onClick={() => setLength(draft.lengthMm - STEP_MM)}
              disabled={draft.lengthMm <= size.minMeasurementMm}
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
              min={size.minMeasurementMm}
              max={size.maxMeasurementMm}
              step={1}
              value={draft.lengthMm}
              onChange={(e) => setLength(Number(e.target.value))}
              aria-valuetext={cm(draft.lengthMm)}
              className="w-full accent-[var(--primary)]"
            />
            <button
              type="button"
              aria-label="Longer by 0.5 cm"
              onClick={() => setLength(draft.lengthMm + STEP_MM)}
              disabled={draft.lengthMm >= size.maxMeasurementMm}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border transition-colors hover:bg-secondary disabled:opacity-40"
            >
              <Icon name="plus" size={18} />
            </button>
          </div>
          <div className="mt-2 flex justify-between px-14 text-xs text-muted-foreground">
            <span>{cm(size.minMeasurementMm)}</span>
            <span>{cm(size.maxMeasurementMm)}</span>
          </div>
        </section>
      )}

      <div className="mt-8">
        <ContinueButton ready={!!size} href={studioHref(category, "design")} label="Continue to the studio" blockedLabel="Choose a size to continue" />
      </div>
      <ReadyMade products={data.products} />
    </StudioShell>
  );
}

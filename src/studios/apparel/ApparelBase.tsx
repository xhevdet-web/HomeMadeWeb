import { money } from "../../data/mock";
import { APPAREL_SIZES, GARMENTS, GARMENT_COLORS } from "../../data/studioCatalog";
import { SectionLabel } from "../../components/Page";
import { useStudio } from "../../studio/StudioContext";
import { ContinueButton, StudioShell } from "../../studio/StudioShell";
import { GarmentShape } from "./silhouettes";
import { colorOf } from "./logic";

export function ApparelBase() {
  const { drafts, setDraft } = useStudio();
  const d = drafts.apparel;
  const color = colorOf(d.colorId);
  const ready = !!(d.garmentId && d.colorId && d.sizeId);

  return (
    <StudioShell
      slug="apparel"
      step={0}
      title={
        <>
          Start from a piece <em className="font-normal text-primary">you love.</em>
        </>
      }
      intro="Pick your piece, colour and size. Then add logos, graphics, text or your own artwork."
    >
      <section className="mt-10" aria-label="Piece">
        <SectionLabel as="h2">Piece</SectionLabel>
        <div className="grid gap-4 sm:grid-cols-3" role="radiogroup" aria-label="Piece">
          {GARMENTS.map((g) => (
            <button
              key={g.id}
              type="button"
              role="radio"
              aria-checked={d.garmentId === g.id}
              onClick={() => setDraft("apparel", { ...d, garmentId: g.id })}
              className={`rounded-[2rem] border p-5 text-left transition-colors ${
                d.garmentId === g.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-foreground/30"
              }`}
            >
              <svg viewBox="0 0 200 220" className="mx-auto h-40 w-auto" aria-hidden="true">
                <GarmentShape garment={g.id} color={color.color} dark={color.dark} side="front" />
              </svg>
              <span className="mt-4 block font-display text-2xl font-semibold">{g.name}</span>
              <span className="mt-1 block text-primary">{money(g.price)}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8" aria-label="Colour">
          <SectionLabel as="h2">Colour · {d.colorId ? color.name : "choose one"}</SectionLabel>
          <div className="flex flex-wrap gap-4" role="radiogroup" aria-label="Colour">
            {GARMENT_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={d.colorId === c.id}
                aria-label={c.name}
                title={c.name}
                onClick={() => setDraft("apparel", { ...d, colorId: c.id })}
                className={`h-12 w-12 rounded-full border border-border ${d.colorId === c.id ? "ring-2 ring-primary ring-offset-4 ring-offset-card" : ""}`}
                style={{ background: c.color }}
              />
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8" aria-label="Size">
          <SectionLabel as="h2">Size</SectionLabel>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
            {APPAREL_SIZES.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={d.sizeId === s.id}
                disabled={s.soldOut}
                onClick={() => setDraft("apparel", { ...d, sizeId: s.id })}
                className={`min-w-14 rounded-full border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:line-through disabled:opacity-40 ${
                  d.sizeId === s.id ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"
                }`}
              >
                {s.id}
                {s.soldOut && <span className="sr-only"> (sold out)</span>}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">XL is sold out right now.</p>
          <p className="mt-4 text-sm text-muted-foreground">Your size is only reserved when you place the order.</p>
        </section>
      </div>

      <div className="mt-8">
        <ContinueButton
          ready={ready}
          href="#/studios/apparel/design"
          label="Continue to Apparel Studio"
          blockedLabel="Choose a piece, colour and size"
        />
      </div>
    </StudioShell>
  );
}

import { Stepper } from "../../components/Controls";
import { money } from "../../data/mock";
import { MIN_STICKERS } from "../../data/studioCatalog";
import { useDesignActions, useStudio } from "../../studio/StudioContext";
import { DetailRows, NothingToPreview, PreviewActions, StudioShell } from "../../studio/StudioShell";
import { Sticker } from "./StickerCanvas";
import { allHaveImages, setLabel, sizeOf, stickerInfo, stickerPrice, totalStickers } from "./logic";

export function StickerPreview() {
  const { drafts, setDraft } = useStudio();
  const d = drafts.stickers;
  const actions = useDesignActions("stickers", stickerInfo(d));
  const size = sizeOf(d)!;
  const title = (
    <>
      Your sticker <em className="font-normal text-primary">set.</em>
    </>
  );

  if (!allHaveImages(d)) {
    return (
      <StudioShell slug="stickers" step={2} title={title}>
        <NothingToPreview slug="stickers" message="Add an image to every design before previewing your set." />
      </StudioShell>
    );
  }

  const total = totalStickers(d);
  const missing = MIN_STICKERS - total;
  const setQuantity = (index: number, quantity: number) =>
    setDraft("stickers", { ...d, designs: d.designs.map((s, i) => (i === index ? { ...s, quantity } : s)) });

  return (
    <StudioShell slug="stickers" step={2} title={title} intro={`${setLabel(d)}. All designs share the same shape and size.`}>
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section aria-label="Sticker sheet" className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 sm:p-10 lg:sticky lg:top-28">
          <div className="bg-glow pointer-events-none absolute inset-0" />
          <div className="relative grid grid-cols-2 gap-6 rounded-2xl bg-secondary/60 p-6 sm:grid-cols-3 sm:gap-8 sm:p-8">
            {d.designs.map((s, i) => (
              <figure key={s.id}>
                <Sticker draft={d} index={i} />
                <figcaption className="mt-3 text-center text-xs text-muted-foreground">
                  Design {i + 1} · ×{s.quantity}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-6 rounded-[2rem] border border-border bg-card p-6 sm:p-8">
          <section>
            <h2 className="font-display text-xl font-semibold">How many of each?</h2>
            <ul className="mt-4 divide-y divide-border rounded-2xl border border-border">
              {d.designs.map((s, i) => (
                <li key={s.id} className="flex items-center gap-3 px-3 py-3">
                  <span className="w-10 shrink-0">
                    <Sticker draft={d} index={i} />
                  </span>
                  <span className="flex-1 text-sm font-semibold">Design {i + 1}</span>
                  <Stepper value={s.quantity} min={1} max={1000} label={`Design ${i + 1} quantity`} onChange={(q) => setQuantity(i, q)} />
                </li>
              ))}
            </ul>
          </section>

          <DetailRows
            rows={[
              ["Unique designs", d.designs.length],
              ["Total stickers", total],
              ["Price per sticker", money(size.price)],
            ]}
          />
          <div className="flex items-baseline justify-between border-t border-border pt-4">
            <span className="font-semibold">Total</span>
            <span className="font-display text-3xl font-semibold text-primary">{money(stickerPrice(d))}</span>
          </div>

          <PreviewActions
            slug="stickers"
            onSave={actions.save}
            onOrder={actions.order}
            orderBlocked={missing > 0 ? `Orders start at ${MIN_STICKERS} stickers. Add ${missing} more to continue; you can still save your set.` : null}
          />
        </div>
      </div>
    </StudioShell>
  );
}

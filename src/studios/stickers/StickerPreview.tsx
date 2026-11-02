import { Stepper } from "../../components/Controls";
import i18n from "../../i18n";

// Re-renders with the app when the language changes.
const t = i18n.t.bind(i18n);
import { money } from "../../lib/format";
import { useSaveDesign, useStudio } from "../../studio/StudioContext";
import { DetailRows, NothingToPreview, PreviewActions, StudioShell } from "../../studio/StudioShell";
import { componentById, stockProblem, type StudioProps } from "../data";
import { Sticker } from "./StickerCanvas";
import { MAX_PER_DESIGN, MIN_STICKERS, allHaveImages, captureStickers, setLabel, sizeOf, stickerInput, stickerPrice, totalStickers } from "./logic";

export function StickerPreview({ category, data }: StudioProps) {
  const { getDraft, setDraft } = useStudio();
  const d = getDraft(category.id, "STICKER");
  const size = sizeOf(category, d);
  const saver = useSaveDesign(category, async () => {
    const { input, uploads } = await stickerInput(category, d, size!);
    return { input, files: { preview: await captureStickers(d, size!), customDesigns: uploads } };
  });
  const title = (
    <>
      {t("stickers.previewTitle")} <em className="font-normal text-primary">{t("stickers.previewTitleAccent")}</em>
    </>
  );

  if (!size || !allHaveImages(d)) {
    return (
      <StudioShell category={category} step={2} title={title}>
        <NothingToPreview category={category} message={t("stickers.imageEveryDesign")} />
      </StudioShell>
    );
  }

  const total = totalStickers(d);
  const missing = MIN_STICKERS - total;
  const setQuantity = (index: number, quantity: number) => setDraft(category.id, { ...d, designs: d.designs.map((s, i) => (i === index ? { ...s, quantity } : s)) });

  return (
    <StudioShell category={category} step={2} title={title} intro={t("stickers.previewIntro", { size: setLabel(size) })}>
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section aria-label={t("stickers.sheet")} className="relative overflow-hidden rounded-[2rem] border border-border bg-card p-6 sm:p-10 lg:sticky lg:top-28">
          <div className="bg-glow pointer-events-none absolute inset-0" />
          <div className="relative grid grid-cols-2 gap-6 rounded-2xl bg-secondary/60 p-6 sm:grid-cols-3 sm:gap-8 sm:p-8">
            {d.designs.map((s, i) => (
              <figure key={s.id}>
                <Sticker draft={d} size={size} index={i} />
                <figcaption className="mt-3 text-center text-xs text-muted-foreground">
                  {t("stickers.design", { number: i + 1 })} · ×{s.quantity}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <div className="flex flex-col gap-6 rounded-[2rem] border border-border bg-card p-6 sm:p-8">
          <section>
            <h2 className="font-display text-xl font-semibold">{t("stickers.howMany")}</h2>
            <ul className="mt-4 divide-y divide-border rounded-2xl border border-border">
              {d.designs.map((s, i) => (
                <li key={s.id} className="flex items-center gap-3 px-3 py-3">
                  <span className="w-10 shrink-0">
                    <Sticker draft={d} size={size} index={i} />
                  </span>
                  <span className="flex-1 text-sm font-semibold">{t("stickers.design", { number: i + 1 })}</span>
                  <Stepper value={s.quantity} min={1} max={MAX_PER_DESIGN} label={t("stickers.quantityOf", { number: i + 1 })} onChange={(q) => setQuantity(i, q)} />
                </li>
              ))}
            </ul>
          </section>
          <DetailRows
            rows={[
              [t("stickers.uniqueDesigns"), d.designs.length],
              [t("stickers.totalStickers"), total],
              [t("stickers.pricePerSticker"), money(size.price)],
            ]}
          />
          <div className="flex items-baseline justify-between border-t border-border pt-4">
            <span className="font-semibold">{t("common.total")}</span>
            <span className="font-display text-3xl font-semibold text-primary">{money(stickerPrice(d, size))}</span>
          </div>
          <PreviewActions
            category={category}
            onSave={saver.save}
            onOrder={saver.order}
            saving={saver.saving}
            orderBlocked={missing > 0 ? t("stickers.minimum", { min: MIN_STICKERS, missing }) : stockProblem(d.designs.map((x) => x.image?.ref), componentById(data))}
          />
        </div>
      </div>
    </StudioShell>
  );
}

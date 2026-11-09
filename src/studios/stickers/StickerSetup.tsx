import { useRef, useState } from "react";
import i18n from "../../i18n";

// Re-renders with the app when the language changes.
const t = i18n.t.bind(i18n);
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { SectionLabel } from "../../components/Page";
import { STICKER_SHAPES, stickerSizes, type StickerShape } from "../../api/models";
import { studioHref } from "../../data/homeCategories";
import { money } from "../../lib/format";
import { backOrNavigate } from "../../router";
import { useStudio } from "../../studio/StudioContext";
import { StudioShell } from "../../studio/StudioShell";
import { ReadyMade } from "../ReadyMade";
import type { StudioProps } from "../data";
import { dimensions, recenter, sizeOf } from "./logic";

const SHAPE_CLASS: Record<StickerShape, string> = {
  SQUARE: "h-12 w-12 rounded-lg",
  CIRCLE: "h-12 w-12 rounded-full",
  RECTANGLE: "h-9 w-14 rounded-lg",
  OVAL: "h-9 w-14 rounded-[50%]",
};

/** Step 1: shape and size, from the category's sizes. All designs in a set share them. */
export function StickerSetup({ category, data }: StudioProps) {
  const { getDraft, setDraft } = useStudio();
  const d = getDraft(category.id, "STICKER");
  const startSize = useRef(d.sizeId);
  const all = stickerSizes(category);
  const size = sizeOf(category, d);
  const [shape, setShape] = useState<StickerShape | null>(size?.shape ?? null);
  const shapes = STICKER_SHAPES.filter((s) => all.some((x) => x.shape === s));
  const sizes = all.filter((s) => s.shape === shape);
  const ready = !!size && size.shape === shape;

  const use = () => {
    if (!ready) return;
    if (d.sizeId !== startSize.current) setDraft(category.id, recenter(d, size!));
    backOrNavigate(studioHref(category, "design"));
  };

  return (
    <StudioShell
      category={category}
      step={0}
      others
      title={
        <>
          {t("stickers.setupTitle")} <em className="font-normal text-primary">{t("stickers.setupTitleAccent")}</em>
        </>
      }
      intro={t("stickers.setupIntro")}
    >
      {all.length === 0 ? (
        <p className="mt-10 rounded-[2rem] border border-border bg-card px-6 py-12 text-center text-muted-foreground">{t("stickers.noSizes")}</p>
      ) : (
        <>
          <section className="mt-10 rounded-[2rem] border border-border bg-card p-6 sm:p-8">
            <SectionLabel as="h2">{t("stickers.shape")}</SectionLabel>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label={t("stickers.shape")}>
              {shapes.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={shape === s}
                  onClick={() => setShape(s)}
                  className={`flex flex-col items-center gap-3 rounded-2xl border p-5 transition-colors ${shape === s ? "border-primary bg-primary/10" : "border-border hover:border-foreground/30"}`}
                >
                  <span className="flex h-14 items-center">
                    <span className={`block border-2 border-primary/80 bg-foreground/10 ${SHAPE_CLASS[s]}`} />
                  </span>
                  <span className="font-semibold">{t(`stickers.shapes.${s}`)}</span>
                </button>
              ))}
            </div>
          </section>

          {shape && (
            <section className="mt-6 rounded-[2rem] border border-border bg-card p-6 sm:p-8">
              <SectionLabel as="h2">{t("checkout.size")}</SectionLabel>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label={t("checkout.size")}>
                {sizes.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    role="radio"
                    aria-checked={d.sizeId === s.id}
                    onClick={() => setDraft(category.id, { ...d, sizeId: s.id })}
                    className={`rounded-2xl border p-5 text-left transition-colors ${d.sizeId === s.id ? "border-primary bg-primary/10" : "border-border hover:border-foreground/30"}`}
                  >
                    <span className="block font-display text-2xl font-semibold">{dimensions(s)}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{s.name}</span>
                    <span className="mt-1 block text-sm text-primary">{t("stickers.each", { price: money(s.price) })}</span>
                  </button>
                ))}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{t("stickers.biggest")}</p>
            </section>
          )}

          <div className="mt-8">
            <Button size="lg" glow={ready} disabled={!ready} onClick={use} className="w-full sm:w-auto">
              {ready ? (
                <>
                  {t("stickers.useSize")} <Icon name="arrowRight" size={18} />
                </>
              ) : (
                t("stickers.chooseShapeSize")
              )}
            </Button>
          </div>
        </>
      )}
      <ReadyMade products={data.products} category={category} />
    </StudioShell>
  );
}

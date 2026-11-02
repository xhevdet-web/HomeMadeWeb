import { SectionLabel } from "../../components/Page";
import { studioHref } from "../../data/homeCategories";
import { money } from "../../lib/format";
import { useStudio } from "../../studio/StudioContext";
import { ContinueButton, StudioShell } from "../../studio/StudioShell";
import type { StudioProps } from "../data";
import { baseOf, sizesOf } from "./logic";
import { corsImage } from "../../studio/capture";
import i18n from "../../i18n";

// Re-renders with the app when the language changes.
const t = i18n.t.bind(i18n);

/** Step 1: the piece (one product per colour) and its size, with stock per size. */
export function ApparelBase({ category, data }: StudioProps) {
  const { getDraft, setDraft } = useStudio();
  const d = getDraft(category.id, "APPAREL");
  const base = baseOf(d, data);
  const sizes = sizesOf(base);
  const sizeOk = sizes.length === 0 || sizes.some((s) => s.size === d.size && s.stock > 0);
  const ready = !!base && sizeOk;

  return (
    <StudioShell
      category={category}
      step={0}
      others
      title={
        <>
          {t("apparel.baseTitle")} <em className="font-normal text-primary">{t("apparel.baseTitleAccent")}</em>
        </>
      }
      intro={t("apparel.baseIntro")}
    >
      {data.products.length === 0 ? (
        <p className="mt-10 rounded-[2rem] border border-border bg-card px-6 py-12 text-center text-muted-foreground">{t("apparel.noPieces")}</p>
      ) : (
        <>
          <section className="mt-10" aria-label={t("apparel.piece")}>
            <SectionLabel as="h2">{t("apparel.piece")}</SectionLabel>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label={t("apparel.piece")}>
              {data.products.map((p) => {
                const soldOut = sizesOf(p).length ? sizesOf(p).every((s) => s.stock <= 0) : (p.stock ?? 0) <= 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={d.baseProductId === p.id}
                    disabled={soldOut}
                    onClick={() =>
                      setDraft(category.id, { ...d, baseProductId: p.id, size: sizesOf(p).some((s) => s.size === d.size && s.stock > 0) ? d.size : null })
                    }
                    className={`flex flex-col overflow-hidden rounded-[2rem] border text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                      d.baseProductId === p.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-foreground/30"
                    }`}
                  >
                    {p.imageUrl ? <img {...corsImage} src={p.imageUrl} alt="" loading="lazy" className="aspect-square w-full bg-secondary object-contain" /> : <span className="aspect-square w-full bg-secondary" />}
                    <span className="p-5">
                      <span className="flex items-center gap-2 font-display text-xl font-semibold">
                        {p.colorHex && <span className="h-4 w-4 rounded-full border border-border" style={{ background: p.colorHex }} />}
                        {p.name}
                      </span>
                      <span className="mt-1 block text-primary">{soldOut ? t("studio.soldOut") : money(p.price)}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {base && sizes.length > 0 && (
            <section className="mt-6 rounded-[2rem] border border-border bg-card p-6 sm:p-8" aria-label={t("checkout.size")}>
              <SectionLabel as="h2">{t("checkout.size")}</SectionLabel>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("checkout.size")}>
                {sizes.map((s) => (
                  <button
                    key={s.size}
                    type="button"
                    role="radio"
                    aria-checked={d.size === s.size}
                    disabled={s.stock <= 0}
                    onClick={() => setDraft(category.id, { ...d, size: s.size })}
                    className={`min-w-14 rounded-full border px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:line-through disabled:opacity-40 ${
                      d.size === s.size ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"
                    }`}
                  >
                    {s.size}
                    {s.stock <= 0 ? <span className="sr-only"> ({t("studio.soldOut")})</span> : s.stock <= 5 ? <span className="ml-1 text-[10px] font-normal">· {t("studio.stock.left", { count: s.stock })}</span> : null}
                  </button>
                ))}
              </div>
              <p className="mt-4 text-sm text-muted-foreground">{t("apparel.sizeReserved")}</p>
            </section>
          )}

          <div className="mt-8">
            <ContinueButton ready={ready} href={studioHref(category, "design")} label={t("apparel.continueTo", { name: category.name })} blockedLabel={base ? t("apparel.chooseSize") : t("apparel.choosePiece")} />
          </div>
        </>
      )}
    </StudioShell>
  );
}

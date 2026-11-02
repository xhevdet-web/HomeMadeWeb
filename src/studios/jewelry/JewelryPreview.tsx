import { useMemo, type ReactNode } from "react";
import { cm, money } from "../../lib/format";
import { useSaveDesign, useStudio } from "../../studio/StudioContext";
import { DetailRows, NothingToPreview, PreviewActions, PreviewLayout, StudioShell } from "../../studio/StudioShell";
import { componentById, stockProblem, type StudioProps } from "../data";
import { JewelryCanvas, captureJewelry } from "./JewelryCanvas";
import { cordOf, groupPieces, isComplete, jewelryInput, missingForMinimum, nounOf, orderProblem, piecesOf, priceOf, sizeLabel, usedMm } from "./logic";
import i18n from "../../i18n";

// Re-renders with the app when the language changes.
const t = i18n.t.bind(i18n);

export function JewelryPreview({ category, data }: StudioProps) {
  const { getDraft, lastSaved } = useStudio();
  const draft = getDraft(category.id, "JEWELRY");
  const byId = useMemo(() => componentById(data), [data]);
  const noun = nounOf(category);
  const pieces = piecesOf(draft.pieces, byId);
  const saver = useSaveDesign(category, async () => ({
    input: jewelryInput(category, draft),
    files: { preview: await captureJewelry(cordOf(category), pieces, draft.lengthMm) },
  }));
  const complete = isComplete(draft, byId);
  // Once this exact design is saved, its server price counts (like the app's saved?.price).
  const saved = lastSaved[category.id];
  const price = saved && saved.signature === JSON.stringify({ input: jewelryInput(category, draft), uploads: [] }) ? saved.product.price : priceOf(draft.pieces, byId);
  const title = (
    <>
      {t("cases.previewTitle")} <em className="font-normal text-primary">{t(`jewelry.nouns.${noun}.name`)}.</em>
    </>
  );

  if (!pieces.length) {
    return (
      <StudioShell category={category} step={2} title={title}>
        <NothingToPreview category={category} message={t("gifts.addItem")} />
      </StudioShell>
    );
  }

  return (
    <StudioShell category={category} step={2} title={title} intro={t("jewelry.previewIntro")}>
      <PreviewLayout
        visual={<JewelryCanvas kind={cordOf(category)} pieces={pieces} lengthMm={draft.lengthMm} label={t(`jewelry.nouns.${noun}.withComponents`, { count: pieces.length })} className="w-full max-w-[600px]" />}
      >
        <DetailRows
          rows={[
            [t("checkout.size"), sizeLabel(category, draft)],
            [t("jewelry.length"), cm(draft.lengthMm)],
            [t("jewelry.usedTitle"), <span className={complete ? "text-success" : ""}>{`${usedMm(draft.pieces, byId)} mm${complete ? ` · ${t("jewelry.completeWord")}` : ""}`}</span>],
            ...(complete ? [[t("jewelry.fit"), <span className="text-success">{t(`jewelry.nouns.${noun}.fits`)}</span>] as [string, ReactNode]] : []),
          ]}
        />
        <section>
          <h2 className="font-display text-xl font-semibold">{t("checkout.beadsDetails")}</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {groupPieces(draft.pieces, byId).map((g) => (
              <li key={g.component.id} className="flex items-center gap-3">
                <span className="flex-1 text-muted-foreground">
                  {g.component.name} × {g.count}
                  {g.component.trackStock && g.component.stock < g.count && (
                    <span className="ml-2 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">{g.component.stock <= 0 ? t("studio.soldOut") : t("jewelry.inStock", { count: g.component.stock })}</span>
                  )}
                </span>
                <span>{money(g.component.price * g.count)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
            <span className="font-semibold">{t("common.total")}</span>
            <span className="font-display text-3xl font-semibold text-primary">{money(price)}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{t("jewelry.priceNote")}</p>
        </section>
        <PreviewActions category={category} onSave={saver.save} onOrder={saver.order} saving={saver.saving} orderBlocked={stockProblem(draft.pieces, byId) ?? orderProblem(category, price)} orderHint={stockProblem(draft.pieces, byId) ? null : missingForMinimum(price)} />
      </PreviewLayout>
    </StudioShell>
  );
}

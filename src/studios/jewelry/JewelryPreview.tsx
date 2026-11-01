import { useMemo, type ReactNode } from "react";
import { cm, money } from "../../lib/format";
import { useSaveDesign, useStudio } from "../../studio/StudioContext";
import { DetailRows, NothingToPreview, PreviewActions, PreviewLayout, StudioShell } from "../../studio/StudioShell";
import { componentById, stockProblem, type StudioProps } from "../data";
import { JewelryCanvas, captureJewelry } from "./JewelryCanvas";
import { cordOf, groupPieces, isComplete, jewelryInput, missingForMinimum, nounOf, orderProblem, piecesOf, priceOf, sizeLabel, usedMm } from "./logic";

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
      Your <em className="font-normal text-primary">{noun}.</em>
    </>
  );

  if (!pieces.length) {
    return (
      <StudioShell category={category} step={2} title={title}>
        <NothingToPreview category={category} message="Add at least one item to your design." />
      </StudioShell>
    );
  }

  return (
    <StudioShell category={category} step={2} title={title} intro="Check every bead, then save it or continue to order.">
      <PreviewLayout
        visual={<JewelryCanvas kind={cordOf(category)} pieces={pieces} lengthMm={draft.lengthMm} label={`Your ${noun} with ${pieces.length} components`} className="w-full max-w-[600px]" />}
      >
        <DetailRows
          rows={[
            ["Size", sizeLabel(category, draft)],
            ["Length", cm(draft.lengthMm)],
            ["Used", <span className={complete ? "text-success" : ""}>{`${usedMm(draft.pieces, byId)} mm${complete ? " · Complete" : ""}`}</span>],
            ...(complete ? [["Fit", <span className="text-success">{`Your ${noun} fits perfectly`}</span>] as [string, ReactNode]] : []),
          ]}
        />
        <section>
          <h2 className="font-display text-xl font-semibold">Beads &amp; price details</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {groupPieces(draft.pieces, byId).map((g) => (
              <li key={g.component.id} className="flex items-center gap-3">
                <span className="flex-1 text-muted-foreground">
                  {g.component.name} × {g.count}
                  {g.component.trackStock && g.component.stock < g.count && (
                    <span className="ml-2 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">{g.component.stock <= 0 ? "Sold out" : `${g.component.stock} in stock`}</span>
                  )}
                </span>
                <span>{money(g.component.price * g.count)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
            <span className="font-semibold">Total</span>
            <span className="font-display text-3xl font-semibold text-primary">{money(price)}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">The final price is confirmed when you save.</p>
        </section>
        <PreviewActions category={category} onSave={saver.save} onOrder={saver.order} saving={saver.saving} orderBlocked={stockProblem(draft.pieces, byId) ?? orderProblem(category, price)} orderHint={stockProblem(draft.pieces, byId) ? null : missingForMinimum(price)} />
      </PreviewLayout>
    </StudioShell>
  );
}

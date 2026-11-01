import { money } from "../../data/mock";
import { JEWELRY } from "../../data/studioCatalog";
import { useDesignActions, useStudio } from "../../studio/StudioContext";
import { DetailRows, NothingToPreview, PreviewActions, PreviewLayout, StudioShell } from "../../studio/StudioShell";
import { JewelryCanvas } from "./JewelryCanvas";
import { TOLERANCE_MM, formatCm, groupPieces, isComplete, jewelryInfo, jewelryPrice, sizeLabel, usedMm, type JewelrySlug } from "./logic";

export function JewelryPreview({ slug }: { slug: JewelrySlug }) {
  const config = JEWELRY[slug];
  const draft = useStudio().drafts[slug];
  const actions = useDesignActions(slug, jewelryInfo(draft));
  const groups = groupPieces(draft.pieces);
  const price = jewelryPrice(draft.pieces);
  const complete = isComplete(draft);
  const title = (
    <>
      Your <em className="font-normal text-primary">{config.noun}.</em>
    </>
  );

  if (draft.pieces.length === 0) {
    return (
      <StudioShell slug={slug} step={2} title={title}>
        <NothingToPreview slug={slug} message="Add at least one bead to your design." />
      </StudioShell>
    );
  }

  const orderBlocked = !complete
    ? `Your ${config.noun} needs to reach ${formatCm(draft.lengthMm)} (±${TOLERANCE_MM} mm) before you can order. You can still save it.`
    : price < config.minPrice
      ? `Orders start at ${money(config.minPrice)}.`
      : null;

  return (
    <StudioShell slug={slug} step={2} title={title} intro="Check every bead, then save it or continue to order.">
      <PreviewLayout
        visual={
          <JewelryCanvas
            kind={config.cord}
            pieces={draft.pieces}
            lengthMm={draft.lengthMm}
            label={`Your ${config.noun} with ${draft.pieces.length} components`}
            className="w-full max-w-[600px]"
          />
        }
      >
        <DetailRows
          rows={[
            ["Size", sizeLabel(slug, draft)],
            ["Length", formatCm(draft.lengthMm)],
            ["Used", <span className={complete ? "text-success" : ""}>{`${usedMm(draft.pieces)} mm${complete ? " · Complete" : ""}`}</span>],
          ]}
        />
        <section>
          <h2 className="font-display text-xl font-semibold">Beads &amp; price details</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {groups.map((g) => (
              <li key={g.piece.id} className="flex items-center gap-3">
                <span className="h-3.5 w-3.5 rounded-full border border-border" style={{ background: g.piece.color }} />
                <span className="flex-1 text-muted-foreground">
                  {g.piece.name} × {g.count}
                </span>
                <span>{money(g.piece.price * g.count)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
            <span className="font-semibold">Total</span>
            <span className="font-display text-3xl font-semibold text-primary">{money(price)}</span>
          </div>
        </section>
        <PreviewActions slug={slug} onSave={actions.save} onOrder={actions.order} orderBlocked={orderBlocked} />
      </PreviewLayout>
    </StudioShell>
  );
}

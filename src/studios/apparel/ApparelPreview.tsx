import { APPAREL_UPLOAD_FEE, type Side } from "../../data/studioCatalog";
import { useDesignActions, useStudio } from "../../studio/StudioContext";
import { DetailRows, NothingToPreview, PreviewActions, PreviewLayout, PriceLines, StudioShell } from "../../studio/StudioShell";
import { allElements, apparelInfo, apparelPrice, colorOf, designLabel, elementPrice, garmentOf, hasUpload } from "./logic";
import { ApparelThumb } from "./silhouettes";

const SIDES: Side[] = ["front", "back"];

export function ApparelPreview() {
  const d = useStudio().drafts.apparel;
  const actions = useDesignActions("apparel", apparelInfo(d));
  const garment = garmentOf(d);
  const title = (
    <>
      Your <em className="font-normal text-primary">{garment?.name.toLowerCase() ?? "piece"}.</em>
    </>
  );

  if (allElements(d).length === 0) {
    return (
      <StudioShell slug="apparel" step={2} title={title}>
        <NothingToPreview slug="apparel" message="Add a logo, graphic, text or your own artwork." />
      </StudioShell>
    );
  }

  return (
    <StudioShell slug="apparel" step={2} title={title} intro="Front and back, exactly as we'll print them.">
      <PreviewLayout
        visual={
          <div className="grid w-full grid-cols-2 gap-4">
            {SIDES.map((s) => (
              <figure key={s}>
                <ApparelThumb draft={d} side={s} />
                <figcaption className="mt-2 text-center text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">{s}</figcaption>
              </figure>
            ))}
          </div>
        }
      >
        <DetailRows
          rows={[
            ["Piece", garment?.name ?? ""],
            ["Colour", colorOf(d.colorId).name],
            ["Size", d.sizeId ?? ""],
          ]}
        />
        {SIDES.map((s) => (
          <section key={s}>
            <h2 className="font-display text-xl font-semibold capitalize">{s}</h2>
            {d[s].length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nothing on the {s}.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {d[s].map((e) => (
                  <li key={e.id}>{designLabel(e)}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
        <PriceLines
          lines={[
            [garment?.name ?? "Piece", garment?.price ?? 0],
            ...allElements(d)
              .filter((e) => elementPrice(e) > 0)
              .map((e) => [designLabel(e), elementPrice(e)] as [string, number]),
            ...(hasUpload(d) ? [["Upload fee (once)", APPAREL_UPLOAD_FEE] as [string, number]] : []),
          ]}
          total={apparelPrice(d)}
        />
        <PreviewActions slug="apparel" onSave={actions.save} onOrder={actions.order} />
      </PreviewLayout>
    </StudioShell>
  );
}

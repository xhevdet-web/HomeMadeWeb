import { useMemo } from "react";
import { describeElement } from "../../studio/elements";
import { useSaveDesign, useStudio } from "../../studio/StudioContext";
import { DetailRows, NothingToPreview, PreviewActions, PreviewLayout, PriceLines, StudioShell } from "../../studio/StudioShell";
import { componentById, customUpload, stockProblem, type StudioProps } from "../data";
import { allElements, apparelInput, apparelPrice, baseOf, apparelPreviews, hasUpload, type Side } from "./logic";
import { ApparelThumb } from "./silhouettes";

const SIDES: Side[] = ["front", "back"];

export function ApparelPreview({ category, data }: StudioProps) {
  const d = useStudio().getDraft(category.id, "APPAREL");
  const byId = useMemo(() => componentById(data), [data]);
  const base = baseOf(d, data);
  const upload = customUpload(data);
  const saver = useSaveDesign(category, async () => {
    const { input, uploads } = await apparelInput(category, d, data);
    return { input, files: { ...(await apparelPreviews(d, data)), customDesigns: uploads } };
  });
  const title = (
    <>
      Your <em className="font-normal text-primary">{base?.name.toLowerCase() ?? "piece"}.</em>
    </>
  );

  if (allElements(d).length === 0) {
    return (
      <StudioShell category={category} step={2} title={title}>
        <NothingToPreview category={category} message="Add a logo, graphic, text or your own artwork." />
      </StudioShell>
    );
  }

  const priced = allElements(d).filter((e) => e.kind === "image" && !e.uploaded && (byId.get(e.ref ?? "")?.price ?? 0) > 0);
  const missing = allElements(d).some((e) => e.missing) ? "Re-upload your artwork to continue." : null;

  return (
    <StudioShell category={category} step={2} title={title} intro="Front and back, exactly as we'll print them.">
      <PreviewLayout
        visual={
          <div className="grid w-full grid-cols-2 gap-4">
            {SIDES.map((s) => (
              <figure key={s}>
                <ApparelThumb draft={d} data={data} category={category} side={s} />
                <figcaption className="mt-2 text-center text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">{s}</figcaption>
              </figure>
            ))}
          </div>
        }
      >
        <DetailRows
          rows={[
            ["Piece", base?.name ?? "Not chosen"],
            ...(base?.color ? [["Colour", base.color] as [string, string]] : []),
            ...(d.size ? [["Size", d.size] as [string, string]] : []),
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
                  <li key={e.id}>{describeElement(e)}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
        <PriceLines
          lines={[
            [base?.name ?? "Piece", base?.price ?? 0],
            ...priced.map((e) => [describeElement(e), byId.get(e.ref!)!.price] as [string, number]),
            ...(hasUpload(d) && upload?.price ? [["Own artwork (once)", upload.price] as [string, number]] : []),
          ]}
          total={apparelPrice(d, data, byId)}
        />
        <PreviewActions category={category} onSave={saver.save} onOrder={saver.order} saving={saver.saving} orderBlocked={missing ?? stockProblem(allElements(d).map((e) => e.ref), byId)} saveBlocked={missing} />
      </PreviewLayout>
    </StudioShell>
  );
}

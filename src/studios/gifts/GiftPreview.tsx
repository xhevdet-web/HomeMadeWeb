import { useMemo } from "react";
import { useSaveDesign, useStudio } from "../../studio/StudioContext";
import { DetailRows, NothingToPreview, PreviewActions, PreviewLayout, PriceLines, StudioShell } from "../../studio/StudioShell";
import { componentById, stockProblem, type StudioProps } from "../data";
import { GiftThumb } from "./GiftBox";
import { colorOf, giftGroups, captureGift, giftInput, giftPrice, imageEls, packagingOf } from "./logic";

export function GiftPreview({ category, data }: StudioProps) {
  const d = useStudio().getDraft(category.id, "GIFT");
  const byId = useMemo(() => componentById(data), [data]);
  const saver = useSaveDesign(category, async () => ({ input: giftInput(category, d, byId), files: { preview: await captureGift(d, data) } }));
  const packaging = packagingOf(d, data);
  const color = colorOf(d, packaging);
  const items = imageEls(d);
  const textEls = d.elements.filter((e) => e.kind === "text");
  const title = (
    <>
      Your <em className="font-normal text-primary">gift.</em>
    </>
  );

  if (!items.length) {
    return (
      <StudioShell category={category} step={2} title={title}>
        <NothingToPreview category={category} message="Add at least one item to your design." />
      </StudioShell>
    );
  }

  return (
    <StudioShell category={category} step={2} title={title} intro="This is how your box will look when it's packed by hand.">
      <PreviewLayout
        visual={
          <div className={`w-full ${packaging?.shape === "RECTANGULAR" ? "max-w-[620px]" : "max-w-[460px]"}`}>
            <GiftThumb draft={d} data={data} />
          </div>
        }
      >
        <DetailRows
          rows={[
            ["Packaging", packaging?.name ?? "Not chosen"],
            ["Shape", packaging?.shape === "RECTANGULAR" ? "Rectangular" : "Square"],
            ...(color ? [["Box colour", color.name] as [string, string]] : []),
          ]}
        />
        {textEls.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-semibold">Your message</h2>
            <ul className="mt-3 space-y-1 text-muted-foreground">
              {textEls.map((t) => (
                <li key={t.id}>“{t.text}”</li>
              ))}
            </ul>
          </section>
        )}
        <section>
          <h2 className="mb-4 font-display text-xl font-semibold">Price details</h2>
          <PriceLines
            lines={[
              [packaging?.name ?? "Packaging", packaging?.price ?? 0],
              ...(color?.priceAdjustment ? [[`${color.name} colour`, color.priceAdjustment] as [string, number]] : []),
              ...giftGroups(items, byId).map((g) => [`${g.label} × ${g.count}`, g.price * g.count] as [string, number]),
            ]}
            total={giftPrice(d, data, byId)}
          />
          <p className="mt-2 text-xs text-muted-foreground">Personal text is free. The final price is confirmed when you save.</p>
        </section>
        <PreviewActions category={category} onSave={saver.save} onOrder={saver.order} saving={saver.saving} orderBlocked={!packaging ? "Choose how your gift should arrive first." : stockProblem(items.map((e) => e.ref), byId)} />
      </PreviewLayout>
    </StudioShell>
  );
}

import { useDesignActions, useStudio } from "../../studio/StudioContext";
import { DetailRows, NothingToPreview, PreviewActions, PreviewLayout, PriceLines, StudioShell } from "../../studio/StudioShell";
import { GiftThumb } from "./GiftBox";
import { boxColor, giftGroups, giftInfo, giftPrice, itemElements, packagingOf, packagingPrice, shapeOf, textElements } from "./logic";

export function GiftPreview() {
  const d = useStudio().drafts.gifts;
  const actions = useDesignActions("gifts", giftInfo(d));
  const items = itemElements(d);
  const title = (
    <>
      Your <em className="font-normal text-primary">gift.</em>
    </>
  );

  if (items.length === 0) {
    return (
      <StudioShell slug="gifts" step={2} title={title}>
        <NothingToPreview slug="gifts" message="Add at least one item to your design." />
      </StudioShell>
    );
  }

  const color = boxColor(d.colorId);
  const texts = textElements(d);

  return (
    <StudioShell slug="gifts" step={2} title={title} intro="This is how your box will look when it's packed by hand.">
      <PreviewLayout
        visual={
          <div className={`w-full ${d.shape === "rect" ? "max-w-[620px]" : "max-w-[460px]"}`}>
            <GiftThumb draft={d} />
          </div>
        }
      >
        <DetailRows
          rows={[
            ["Packaging", packagingOf(d)?.title ?? ""],
            ["Shape", shapeOf(d)?.name ?? ""],
            ["Box colour", color.name],
          ]}
        />
        {texts.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-semibold">Your message</h2>
            <ul className="mt-3 space-y-1 text-muted-foreground">
              {texts.map((t) => (
                <li key={t.id}>“{t.text}”</li>
              ))}
            </ul>
          </section>
        )}
        <section>
          <h2 className="mb-4 font-display text-xl font-semibold">Price details</h2>
          <PriceLines
            lines={[
              [`${packagingOf(d)?.title} ${shapeOf(d)?.name.toLowerCase()} box`, packagingPrice(d)],
              ...(color.price ? [[`${color.name} colour`, color.price] as [string, number]] : []),
              ...giftGroups(items).map((g) => [`${g.label} × ${g.count}`, g.price * g.count] as [string, number]),
              ...(texts.length ? [["Personal text", 0] as [string, number]] : []),
            ]}
            total={giftPrice(d)}
          />
        </section>
        <PreviewActions slug="gifts" onSave={actions.save} onOrder={actions.order} />
      </PreviewLayout>
    </StudioShell>
  );
}

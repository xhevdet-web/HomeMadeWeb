import { useMemo } from "react";
import { useSaveDesign, useStudio } from "../../studio/StudioContext";
import { DetailRows, NothingToPreview, PreviewActions, PreviewLayout, PriceLines, StudioShell } from "../../studio/StudioShell";
import { componentById, stockProblem, type StudioProps } from "../data";
import { GiftThumb } from "./GiftBox";
import { colorOf, giftGroups, captureGift, giftInput, giftPrice, imageEls, packagingOf } from "./logic";
import i18n from "../../i18n";

// Re-renders with the app when the language changes.
const t = i18n.t.bind(i18n);

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
      {t("gifts.previewTitle")} <em className="font-normal text-primary">{t("gifts.previewTitleAccent")}</em>
    </>
  );

  if (!items.length) {
    return (
      <StudioShell category={category} step={2} title={title}>
        <NothingToPreview category={category} message={t("gifts.addItem")} />
      </StudioShell>
    );
  }

  return (
    <StudioShell category={category} step={2} title={title} intro={t("gifts.previewIntro")}>
      <PreviewLayout
        visual={
          <div className={`w-full ${packaging?.shape === "RECTANGULAR" ? "max-w-[620px]" : "max-w-[460px]"}`}>
            <GiftThumb draft={d} data={data} />
          </div>
        }
      >
        <DetailRows
          rows={[
            [t("gifts.packaging"), packaging?.name ?? t("gifts.notChosen")],
            [t("stickers.shape"), packaging?.shape === "RECTANGULAR" ? t("gifts.rectangular") : t("gifts.square")],
            ...(color ? [[t("gifts.boxColour"), color.name] as [string, string]] : []),
          ]}
        />
        {textEls.length > 0 && (
          <section>
            <h2 className="font-display text-xl font-semibold">{t("gifts.yourMessage")}</h2>
            <ul className="mt-3 space-y-1 text-muted-foreground">
              {textEls.map((el) => (
                <li key={el.id}>“{el.text}”</li>
              ))}
            </ul>
          </section>
        )}
        <section>
          <h2 className="mb-4 font-display text-xl font-semibold">{t("order.priceDetails")}</h2>
          <PriceLines
            lines={[
              [packaging?.name ?? t("gifts.packaging"), packaging?.price ?? 0],
              ...(color?.priceAdjustment ? [[t("gifts.colourLine", { name: color.name }), color.priceAdjustment] as [string, number]] : []),
              ...giftGroups(items, byId).map((g) => [`${g.label} × ${g.count}`, g.price * g.count] as [string, number]),
            ]}
            total={giftPrice(d, data, byId)}
          />
          <p className="mt-2 text-xs text-muted-foreground">{t("gifts.priceNote")}</p>
        </section>
        <PreviewActions category={category} onSave={saver.save} onOrder={saver.order} saving={saver.saving} orderBlocked={!packaging ? t("gifts.chooseArrivalFirst") : stockProblem(items.map((e) => e.ref), byId)} />
      </PreviewLayout>
    </StudioShell>
  );
}

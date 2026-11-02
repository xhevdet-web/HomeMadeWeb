import { useRef, useState } from "react";
import i18n from "../../i18n";

// Re-renders with the app when the language changes.
const t = i18n.t.bind(i18n);
import { Stepper } from "../../components/Controls";
import { useSaveDesign, useStudio } from "../../studio/StudioContext";
import { NothingToPreview, PreviewActions, PreviewLayout, PriceLines, StudioShell, Tabs } from "../../studio/StudioShell";
import { componentById, stockProblem, type StudioProps } from "../data";
import { PlacementLayer } from "../../studio/PlacementLayer";
import { MugEditor, type MugView } from "./MugMockup";
import { MAX_MUGS, blankMug, captureMug, mugArea, mugImage, mugInput, mugSummary } from "./logic";

export function MugPreview({ category, data }: StudioProps) {
  const { getDraft, setDraft } = useStudio();
  const d = getDraft(category.id, "MUG");
  const [view, setView] = useState<MugView>("front");
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const views: MugView[] = ["left", "front", "right"];
  // Swipe the mug left or right to turn it, like the app.
  const turn = (dx: number) => setView((v) => views[Math.max(0, Math.min(2, views.indexOf(v) + (dx < 0 ? 1 : -1)))]);
  const blank = blankMug(data);
  const area = mugArea(blank);
  const saver = useSaveDesign(
    category,
    async () => {
      const { input, uploads } = await mugInput(category, d, blank!, area!);
      return { input, files: { preview: await captureMug(d, area!), customDesigns: uploads } };
    },
    { quantity: d.quantity },
  );
  const title = (
    <>
      {t("mugs.previewTitle")} <em className="font-normal text-primary">{t("mugs.previewTitleAccent")}</em>
    </>
  );

  if (!blank || !area || d.elements.length === 0) {
    return (
      <StudioShell category={category} step={2} title={title}>
        <NothingToPreview category={category} message={t("mugs.addFirst")} />
      </StudioShell>
    );
  }

  return (
    <StudioShell category={category} step={2} title={title} intro={t("mugs.previewIntro")}>
      <PreviewLayout
        visual={
          <div className="w-full">
            <div
              className="touch-pan-y select-none"
              onPointerDown={(e) => (swipe.current = { x: e.clientX, y: e.clientY })}
              onPointerUp={(e) => {
                const s = swipe.current;
                swipe.current = null;
                if (s && Math.abs(e.clientX - s.x) > 40 && Math.abs(e.clientY - s.y) < 60) turn(e.clientX - s.x);
              }}
              onPointerCancel={() => (swipe.current = null)}
            >
              {/* The studio's mug, turned to the chosen side. */}
              <div className="mx-auto w-full max-w-[460px]">
                <MugEditor area={area} view={view} guides={false} label={t("mugs.previewLabel", { summary: mugSummary(d), side: t(`mugs.views.${view}`) })}>
                  <PlacementLayer elements={d.elements} label={t("preview.mugPrint")} readOnly />
                </MugEditor>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground md:hidden">{t("mugs.swipe")}</p>
            <div className="mx-auto mt-5 max-w-sm">
              <Tabs
                label={t("mugs.sideOfMug")}
                value={view}
                onChange={setView}
                tabs={[
                  { id: "left", label: t("mugs.sides.left") },
                  { id: "front", label: t("mugs.sides.front") },
                  { id: "right", label: t("mugs.sides.right") },
                ]}
              />
            </div>
          </div>
        }
      >
        <div>
          <p className="text-sm text-muted-foreground">{t("mugs.design")}</p>
          <p className="font-display text-xl font-semibold">{mugSummary(d)}</p>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold">{t("checkout.quantity")}</p>
            <p className="text-sm text-muted-foreground">{t("mugs.quantityHint")}</p>
          </div>
          <Stepper value={d.quantity} min={1} max={MAX_MUGS} label={t("mugs.stepperLabel")} onChange={(quantity) => setDraft(category.id, { ...d, quantity })} />
        </div>
        <PriceLines
          lines={[
            [t("mugs.pricePerMug"), blank.price],
            [t("mugs.lineQuantity", { count: d.quantity }), blank.price * d.quantity],
          ]}
          total={blank.price * d.quantity}
        />
        <PreviewActions
          category={category}
          onSave={saver.save}
          onOrder={saver.order}
          saving={saver.saving}
          orderBlocked={mugImage(d)?.missing ? t("mugs.reuploadToContinue") : stockProblem(d.elements.map((e) => e.ref), componentById(data))}
          saveBlocked={mugImage(d)?.missing ? t("mugs.reuploadToContinue") : null}
        />
      </PreviewLayout>
    </StudioShell>
  );
}

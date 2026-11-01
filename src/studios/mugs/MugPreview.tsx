import { useRef, useState } from "react";
import { Stepper } from "../../components/Controls";
import { useSaveDesign, useStudio } from "../../studio/StudioContext";
import { NothingToPreview, PreviewActions, PreviewLayout, PriceLines, StudioShell, Tabs } from "../../studio/StudioShell";
import { componentById, stockProblem, type StudioProps } from "../data";
import { MugMockup, type MugView } from "./MugMockup";
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
      Your custom <em className="font-normal text-primary">mug.</em>
    </>
  );

  if (!blank || !area || d.elements.length === 0) {
    return (
      <StudioShell category={category} step={2} title={title}>
        <NothingToPreview category={category} message="Add an image or text to your mug first." />
      </StudioShell>
    );
  }

  return (
    <StudioShell category={category} step={2} title={title} intro="Turn the mug to check every side of your print.">
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
              <MugMockup draft={d} area={area} view={view} />
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground md:hidden">Swipe the mug to turn it</p>
            <div className="mx-auto mt-5 max-w-sm">
              <Tabs
                label="Mug side"
                value={view}
                onChange={setView}
                tabs={[
                  { id: "left", label: "Left side" },
                  { id: "front", label: "Front" },
                  { id: "right", label: "Right side" },
                ]}
              />
            </div>
          </div>
        }
      >
        <div>
          <p className="text-sm text-muted-foreground">Design</p>
          <p className="font-display text-xl font-semibold">{mugSummary(d)}</p>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold">Quantity</p>
            <p className="text-sm text-muted-foreground">Identical mugs with this design</p>
          </div>
          <Stepper value={d.quantity} min={1} max={MAX_MUGS} label="mugs" onChange={(quantity) => setDraft(category.id, { ...d, quantity })} />
        </div>
        <PriceLines
          lines={[
            ["Price per mug", blank.price],
            [`${d.quantity} × mug`, blank.price * d.quantity],
          ]}
          total={blank.price * d.quantity}
        />
        <PreviewActions
          category={category}
          onSave={saver.save}
          onOrder={saver.order}
          saving={saver.saving}
          orderBlocked={mugImage(d)?.missing ? "Re-upload your image to continue." : stockProblem(d.elements.map((e) => e.ref), componentById(data))}
          saveBlocked={mugImage(d)?.missing ? "Re-upload your image to continue." : null}
        />
      </PreviewLayout>
    </StudioShell>
  );
}

import { useState } from "react";
import { Stepper } from "../../components/Controls";
import { MUG_PRICE } from "../../data/studioCatalog";
import { useDesignActions, useStudio } from "../../studio/StudioContext";
import { NothingToPreview, PreviewActions, PreviewLayout, PriceLines, StudioShell, Tabs } from "../../studio/StudioShell";
import { MugMockup, type MugView } from "./MugMockup";
import { mugInfo, mugSummary } from "./logic";

export function MugPreview() {
  const { drafts, setDraft } = useStudio();
  const d = drafts.mugs;
  const [view, setView] = useState<MugView>("front");
  const actions = useDesignActions("mugs", mugInfo(d));
  const title = (
    <>
      Your custom <em className="font-normal text-primary">mug.</em>
    </>
  );

  if (d.elements.length === 0) {
    return (
      <StudioShell slug="mugs" step={2} title={title}>
        <NothingToPreview slug="mugs" message="Add an image or text to your mug." />
      </StudioShell>
    );
  }

  return (
    <StudioShell slug="mugs" step={2} title={title} intro="Turn the mug to check every side of your print.">
      <PreviewLayout
        visual={
          <div className="w-full">
            <MugMockup draft={d} view={view} />
            <div className="mx-auto mt-8 max-w-sm">
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
          <Stepper value={d.quantity} min={1} max={100} label="mugs" onChange={(quantity) => setDraft("mugs", { ...d, quantity })} />
        </div>
        <PriceLines
          lines={[
            ["Price per mug", MUG_PRICE],
            [`${d.quantity} × mug`, MUG_PRICE * d.quantity],
          ]}
          total={MUG_PRICE * d.quantity}
        />
        <PreviewActions slug="mugs" onSave={actions.save} onOrder={actions.order} />
      </PreviewLayout>
    </StudioShell>
  );
}

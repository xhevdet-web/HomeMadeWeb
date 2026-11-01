import { useState } from "react";
import { money } from "../../data/mock";
import { APPAREL_CANVAS_CM, APPAREL_DESIGNS, APPAREL_UPLOAD_FEE, type ApparelTab, type Side } from "../../data/studioCatalog";
import { navigate } from "../../router";
import { Artwork } from "../../studio/artworks";
import { elementsReducer, isLowQuality, type ElementsAction } from "../../studio/elements";
import { PlacementLayer, type LayerCommand } from "../../studio/PlacementLayer";
import { useDesignActions, useStudioHistory } from "../../studio/StudioContext";
import { BaseChip, CanvasToolbar, PickerCard, Stage, StudioLayout, StudioShell, Tabs, ToolSection } from "../../studio/StudioShell";
import { StudioSummaryBar } from "../../studio/StudioSummaryBar";
import { TextTool } from "../../studio/TextTool";
import { useToast } from "../../studio/Toasts";
import { QualityWarning, UploadButton, type UploadedImage } from "../../studio/UploadButton";
import { allElements, apparelInfo, apparelPrice, apparelSummary, colorOf, garmentOf, hasUpload, pieceLabel, placeInPrint } from "./logic";
import { GarmentCanvas } from "./silhouettes";

type Tab = ApparelTab | "Text";
const TABS: Tab[] = ["Icons", "Logos", "Lettering", "Illustrations", "Text"];

export function ApparelStudio() {
  const history = useStudioHistory("apparel");
  const { state: d, dispatch: update } = history;
  const toast = useToast();
  const [side, setSide] = useState<Side>("front");
  const [tab, setTab] = useState<Tab>("Icons");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const actions = useDesignActions("apparel", apparelInfo(d));

  const garment = garmentOf(d)!;
  const color = colorOf(d.colorId);
  const elements = d[side];
  const selected = elements.find((e) => e.id === selectedId) ?? null;
  const apply = (a: ElementsAction, merge?: string) => update((x) => ({ ...x, [side]: elementsReducer(x[side], a) }), merge);

  const switchSide = (s: Side) => {
    setSide(s);
    setSelectedId(null);
  };

  const addDesign = (designId: string) => {
    const design = APPAREL_DESIGNS.find((x) => x.id === designId)!;
    const el = placeInPrint(d, side, { art: design.art, ref: design.id, aspect: 1 });
    apply({ type: "add", el });
    setSelectedId(el.id);
    toast(`${design.name} added to the ${side}.`);
  };

  const upload = (img: UploadedImage) => {
    const first = !hasUpload(d);
    const el = placeInPrint(d, side, { src: img.url, aspect: img.height / img.width, pxWidth: img.width, uploaded: true });
    apply({ type: "add", el });
    setSelectedId(el.id);
    toast(first ? `Your artwork is on the ${side}. Upload fee ${money(APPAREL_UPLOAD_FEE)} added once.` : `Your artwork is on the ${side}.`);
  };

  const command = (cmd: LayerCommand, id: string) => {
    if (cmd === "reset") return;
    apply({ type: cmd, id });
    if (cmd === "delete") setSelectedId(null);
  };

  const clear = () => {
    update((x) => ({ ...x, front: [], back: [] }));
    setSelectedId(null);
    toast("Canvas cleared. Undo to bring it back.");
  };

  const total = allElements(d).length;
  const empty = total === 0;
  const lowQuality = elements.some((e) => isLowQuality(e, APPAREL_CANVAS_CM));

  const stage = (
    <Stage
      label={`${garment.name}, ${side}, with ${elements.length} designs`}
      toolbar={<CanvasToolbar {...history} onClear={clear} canClear={!empty} />}
      above={
        <Tabs
          label="Side"
          value={side}
          onChange={switchSide}
          tabs={[
            { id: "front", label: `Front${d.front.length ? ` · ${d.front.length}` : ""}` },
            { id: "back", label: `Back${d.back.length ? ` · ${d.back.length}` : ""}` },
          ]}
        />
      }
      below={<QualityWarning show={lowQuality} />}
    >
      <div className="w-full max-w-[520px]">
        <GarmentCanvas draft={d} side={side}>
          <PlacementLayer
            key={side}
            elements={elements}
            label={`Designs on the ${side}`}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={(el, merge) => apply({ type: "update", el }, merge)}
            onCommand={command}
            bounds={garment.print[side]}
          />
        </GarmentCanvas>
      </div>
    </Stage>
  );

  const tools = (
    <>
      <BaseChip label="Your piece" value={pieceLabel(d)} href="#/studios/apparel" />

      <ToolSection title="Designs" aside={`Adding to the ${side}`}>
        <p className="mb-3 text-sm text-muted-foreground">Tap a design to add it to the {side}. It stays inside the print area.</p>
        <Tabs label="Design type" value={tab} onChange={setTab} tabs={TABS.map((t) => ({ id: t, label: t }))} />
        <div className="mt-4">
          {tab === "Text" ? (
            <TextTool
              texts={allElements(d).filter((e) => e.kind === "text")}
              selected={selected}
              defaultColor={color.dark ? "white" : "navy"}
              onAdd={(el) => {
                const area = garment.print[side];
                apply({ type: "add", el: { ...el, x: (area.x0 + area.x1) / 2, y: (area.y0 + area.y1) / 2, scale: 0.08 } });
                setSelectedId(el.id);
              }}
              onUpdate={(el, merge) => apply({ type: "update", el }, merge)}
              onDone={() => setSelectedId(null)}
            />
          ) : (
            <ul className="grid grid-cols-3 gap-2">
              {APPAREL_DESIGNS.filter((x) => x.tab === tab).map((x) => (
                <li key={x.id}>
                  <PickerCard title={x.name} price={money(x.price)} onClick={() => addDesign(x.id)}>
                    <Artwork id={x.art} className="h-full w-full" />
                  </PickerCard>
                </li>
              ))}
            </ul>
          )}
        </div>
      </ToolSection>

      <ToolSection title="Upload your own design" aside={hasUpload(d) ? "Fee paid once" : `+${money(APPAREL_UPLOAD_FEE)} once`}>
        <UploadButton
          onImage={upload}
          accept={["image/png"]}
          typeError="Only PNG images can be uploaded. Save your design as a .png file and try again."
          hint={`PNG only, up to 5 MB · ${money(APPAREL_UPLOAD_FEE)} once, however many times you place it`}
        />
      </ToolSection>

      <ToolSection title="On this piece">
        {empty ? (
          <p className="text-sm text-muted-foreground">Nothing yet. Add a logo, graphic, text or your own artwork.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {(["front", "back"] as Side[]).map((s) => (
              <li key={s} className="flex justify-between gap-3">
                <button type="button" onClick={() => switchSide(s)} className="capitalize text-muted-foreground hover:text-foreground">
                  {s}
                </button>
                <span>
                  {d[s].length} design{d[s].length === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </ToolSection>
    </>
  );

  return (
    <StudioShell slug="apparel" step={1}>
      <StudioLayout
        stage={stage}
        tools={tools}
        bar={
          <StudioSummaryBar
            summary={apparelSummary(d)}
            price={apparelPrice(d)}
            onSave={actions.save}
            saveBlocked={empty ? "Add a logo, graphic, text or your own artwork." : null}
            onPrimary={() => navigate("#/studios/apparel/preview")}
            primaryBlocked={empty ? "Add a logo, graphic, text or your own artwork." : null}
          />
        }
      />
    </StudioShell>
  );
}

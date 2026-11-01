import { useState } from "react";
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { MAX_MUG_ELEMENTS, MUG_AREA_CM, MUG_DESIGNS, MUG_PRICE } from "../../data/studioCatalog";
import { navigate } from "../../router";
import { ART, Artwork, type ArtId } from "../../studio/artworks";
import { describeElement, elementsReducer, isLowQuality, type ElementsAction } from "../../studio/elements";
import { PlacementLayer, type LayerCommand } from "../../studio/PlacementLayer";
import { useDesignActions, useStudioHistory } from "../../studio/StudioContext";
import { CanvasToolbar, ImageControls, Stage, StudioLayout, StudioShell, ToolSection } from "../../studio/StudioShell";
import { StudioSummaryBar } from "../../studio/StudioSummaryBar";
import { TextTool } from "../../studio/TextTool";
import { useToast } from "../../studio/Toasts";
import { QualityWarning, UploadButton, type UploadedImage } from "../../studio/UploadButton";
import { MugWrap } from "./MugMockup";
import { fittedImage, mugImage, mugInfo, mugSummary, mugTexts } from "./logic";

export function MugStudio() {
  const history = useStudioHistory("mugs");
  const { state: d, dispatch: update } = history;
  const toast = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const actions = useDesignActions("mugs", mugInfo(d));

  const image = mugImage(d);
  const texts = mugTexts(d);
  const selected = d.elements.find((e) => e.id === selectedId) ?? null;
  const apply = (a: ElementsAction, merge?: string) => update((x) => ({ ...x, elements: elementsReducer(x.elements, a) }), merge);

  /** One image at a time: a new image replaces the current one, texts stay. */
  const placeImage = (props: Parameters<typeof fittedImage>[0], message: string) => {
    const el = fittedImage(props);
    update((x) => {
      const images = x.elements.filter((e) => e.kind === "image");
      const kept = x.elements.filter((e) => e.kind !== "image" || images.indexOf(e) < MAX_MUG_ELEMENTS - 1);
      return { ...x, elements: elementsReducer(kept, { type: "add", el }) };
    });
    setSelectedId(el.id);
    toast(message);
  };

  const upload = (img: UploadedImage) =>
    placeImage({ src: img.url, aspect: img.height / img.width, pxWidth: img.width, uploaded: true }, image ? "Image replaced." : "Image added to your mug.");

  const pickDesign = (art: ArtId) => placeImage({ art, aspect: 1 }, `${ART[art].name} is on your mug.`);

  const command = (cmd: LayerCommand, id: string) => {
    if (cmd === "duplicate") return;
    if (cmd === "reset") {
      const el = d.elements.find((e) => e.id === id);
      if (el) apply({ type: "update", el: { ...el, x: 0.5, y: 0.5, rotation: 0, scale: fittedImage({ aspect: el.aspect }).scale } });
      return;
    }
    apply({ type: cmd, id });
    if (cmd === "delete") setSelectedId(null);
  };

  const clear = () => {
    apply({ type: "clear" });
    setSelectedId(null);
    toast("Canvas cleared. Undo to bring it back.");
  };

  const empty = d.elements.length === 0;
  const layers = [...d.elements].sort((a, b) => b.z - a.z);

  const stage = (
    <Stage
      label={`Mug wrap with ${mugSummary(d)}`}
      toolbar={<CanvasToolbar {...history} onClear={clear} canClear={!empty} />}
      below={
        <>
          <QualityWarning show={!!image && isLowQuality(image, MUG_AREA_CM.w)} />
          <p className="flex items-center gap-2 px-2 text-sm text-muted-foreground">
            <Icon name="square" size={14} className="text-primary" />
            Keep important parts of your design inside the dashed area.
          </p>
        </>
      }
    >
      <div className="w-full max-w-[680px]">
        <p className="mb-3 text-center text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
          Printable area: {MUG_AREA_CM.w} × {MUG_AREA_CM.h} cm
        </p>
        <MugWrap>
          <PlacementLayer
            elements={d.elements}
            label="Mug print"
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={(el, merge) => apply({ type: "update", el }, merge)}
            onCommand={command}
            actions={["smaller", "larger", "rotateLeft", "rotateRight", "forward", "backward", "reset", "delete"]}
          />
        </MugWrap>
      </div>
    </Stage>
  );

  const tools = (
    <>
      <ToolSection title="Your image" aside="One image at a time">
        <UploadButton onImage={upload} label="Upload image" hint="JPEG, PNG or WebP, up to 5 MB" />
      </ToolSection>

      <ToolSection title="Our designs">
        <p className="mb-3 text-sm text-muted-foreground">Tap a design to put it on your mug. It replaces the current image.</p>
        <ul className="grid grid-cols-4 gap-2">
          {MUG_DESIGNS.map((art) => (
            <li key={art}>
              <button
                type="button"
                aria-label={ART[art].name}
                aria-pressed={image?.art === art}
                title={ART[art].name}
                onClick={() => pickDesign(art)}
                className={`block aspect-square w-full overflow-hidden rounded-xl border-2 bg-secondary p-1.5 transition-colors ${
                  image?.art === art ? "border-primary" : "border-transparent hover:border-border"
                }`}
              >
                <Artwork id={art} />
              </button>
            </li>
          ))}
        </ul>
      </ToolSection>

      {image && (
        <ToolSection title="Image">
          <ImageControls
            onZoom={(k) => apply({ type: "update", el: { ...image, scale: image.scale * k } })}
            onRotate={(deg) => apply({ type: "update", el: { ...image, rotation: image.rotation + deg } })}
            onReset={() => command("reset", image.id)}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <UploadButton onImage={upload} variant="button" label="Replace image" />
            <Button variant="secondary" size="sm" onClick={() => command("delete", image.id)}>
              <Icon name="trash" size={15} /> Delete
            </Button>
          </div>
        </ToolSection>
      )}

      <ToolSection title="Text">
        <TextTool
          texts={texts}
          selected={selected}
          defaultColor="navy"
          onAdd={(el) => {
            apply({ type: "add", el });
            setSelectedId(el.id);
          }}
          onUpdate={(el, merge) => apply({ type: "update", el }, merge)}
          onDone={() => setSelectedId(null)}
        />
      </ToolSection>

      <ToolSection title="Your images (front first)">
        {layers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing on your mug yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {layers.map((el) => (
              <li key={el.id} className={`flex items-center gap-3 px-3 py-2 ${el.id === selectedId ? "bg-secondary/60" : ""}`}>
                <button type="button" onClick={() => setSelectedId(el.id)} className="flex min-w-0 flex-1 items-center gap-3 py-1 text-left text-sm">
                  <Icon name={el.kind === "text" ? "type" : "image"} size={16} className="text-primary" />
                  <span className="truncate">{describeElement(el)}</span>
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${describeElement(el)}`}
                  onClick={() => command("delete", el.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Icon name="trash" size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </ToolSection>
    </>
  );

  return (
    <StudioShell slug="mugs" step={1}>
      <StudioLayout
        stage={stage}
        tools={tools}
        bar={
          <StudioSummaryBar
            summary={mugSummary(d)}
            price={MUG_PRICE}
            priceLabel="Price per mug"
            onSave={actions.save}
            saveBlocked={empty ? "Add an image or text to your mug." : null}
            primaryLabel="Preview on mug"
            onPrimary={() => navigate("#/studios/mugs/preview")}
            primaryBlocked={empty ? "Add an image or text to your mug." : null}
          />
        }
      />
    </StudioShell>
  );
}

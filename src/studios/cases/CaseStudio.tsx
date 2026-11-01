import { useState } from "react";
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { money } from "../../data/mock";
import { CASE_DESIGNS, CASE_UPLOAD_FEE, CASE_WIDTH_CM, getModel } from "../../data/studioCatalog";
import { navigate } from "../../router";
import { ART, Artwork } from "../../studio/artworks";
import { isLowQuality, type PlacedElement } from "../../studio/elements";
import { PlacementLayer, type LayerCommand } from "../../studio/PlacementLayer";
import { useDesignActions, useStudioHistory } from "../../studio/StudioContext";
import { BaseChip, CanvasToolbar, ImageControls, Notice, Stage, StudioLayout, StudioShell, ToolSection } from "../../studio/StudioShell";
import { StudioSummaryBar } from "../../studio/StudioSummaryBar";
import { useToast } from "../../studio/Toasts";
import { QualityWarning, UploadButton, type UploadedImage } from "../../studio/UploadButton";
import { CaseCanvas } from "./CaseCanvas";
import { caseImage, caseInfo, casePrice, coverImage, designLabel } from "./logic";

export function CaseStudio() {
  const history = useStudioHistory("cases");
  const { state: d, dispatch: update } = history;
  const toast = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const actions = useDesignActions("cases", caseInfo(d));
  const model = getModel(d.modelId)!;
  const image = caseImage(d);

  const setImage = (el: PlacedElement | null, merge?: string) => update((x) => ({ ...x, elements: el ? [el] : [] }), merge);

  const upload = (img: UploadedImage) => {
    const el = coverImage(model, { src: img.url, aspect: img.height / img.width, pxWidth: img.width, uploaded: true });
    setImage(el);
    setSelectedId(el.id);
    toast(image ? "Image replaced." : "Your photo is on the case.");
  };

  const pick = (id: string) => {
    const design = CASE_DESIGNS.find((x) => x.id === id)!;
    const el = coverImage(model, { art: design.art, ref: design.id, aspect: 1 });
    setImage(el);
    setSelectedId(el.id);
    toast(`${ART[design.art].name} is on your case.`);
  };

  const reset = () => image && setImage({ ...image, x: 0.5, y: 0.5, rotation: 0, scale: coverImage(model, { aspect: image.aspect }).scale });

  const command = (cmd: LayerCommand) => {
    if (cmd === "reset") reset();
    if (cmd === "delete") remove();
  };

  const remove = () => {
    setImage(null);
    setSelectedId(null);
    toast("Image removed.");
  };

  const clear = () => {
    setImage(null);
    setSelectedId(null);
    toast("Canvas cleared. Undo to bring it back.");
  };

  const blocked = model.soldOut
    ? "This phone model is no longer available. Choose another one; your image stays."
    : !image
      ? "Add a photo or one of our designs."
      : null;

  const stage = (
    <Stage
      label={`${model.name} case with ${designLabel(image).toLowerCase()}`}
      toolbar={<CanvasToolbar {...history} onClear={clear} canClear={!!image} />}
      below={
        <>
          <QualityWarning show={!!image && isLowQuality(image, CASE_WIDTH_CM)} />
          <p className="px-2 text-sm text-muted-foreground">
            Your design is printed inside the dashed line, around the camera. Keep important parts away from the edges.
          </p>
        </>
      }
    >
      <div className="w-full max-w-[260px]">
        <CaseCanvas model={model}>
          <PlacementLayer
            elements={d.elements}
            label="Case design"
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={(el, merge) => setImage(el, merge)}
            onCommand={command}
            mode="cover"
            wheelZoom
            actions={["smaller", "larger", "rotateLeft", "rotateRight", "reset", "delete"]}
          />
        </CaseCanvas>
        {!image && <p className="mt-4 text-center text-sm text-muted-foreground">Upload a photo or pick a design.</p>}
      </div>
    </Stage>
  );

  const tools = (
    <>
      <BaseChip label="Phone" value={`${model.name} · ${money(model.price)}`} href="#/studios/cases" action="Change model" />
      {model.soldOut && <Notice>This phone model is no longer available. Choose another one; your image stays.</Notice>}

      <ToolSection title="Add your design" aside="One design at a time">
        <UploadButton onImage={upload} label="Upload your photo" hint={`+${money(CASE_UPLOAD_FEE)} · JPEG, PNG or WebP, up to 5 MB`} />
        <div className="my-5 flex items-center gap-4 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>
        <p className="mb-3 text-sm font-semibold">Choose one of our designs</p>
        <ul className="grid grid-cols-4 gap-2">
          {CASE_DESIGNS.map((x) => (
            <li key={x.id}>
              <button
                type="button"
                onClick={() => pick(x.id)}
                aria-pressed={image?.ref === x.id}
                aria-label={`${ART[x.art].name}, ${x.price ? `+${money(x.price)} extra` : "free"}`}
                className={`block w-full overflow-hidden rounded-xl border-2 transition-colors ${
                  image?.ref === x.id ? "border-primary" : "border-transparent hover:border-border"
                }`}
              >
                <span className="block aspect-[1/1.4] w-full overflow-hidden">
                  <Artwork id={x.art} className="h-full w-full scale-150" />
                </span>
                <span className={`block py-1 text-center text-[10px] font-semibold ${x.price ? "text-primary" : "text-muted-foreground"}`}>
                  {x.price ? `+${money(x.price)} extra` : "Free"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </ToolSection>

      {image && (
        <ToolSection title="Image" aside={designLabel(image)}>
          <ImageControls
            onZoom={(k) => setImage({ ...image, scale: image.scale * k })}
            onRotate={(deg) => setImage({ ...image, rotation: image.rotation + deg })}
            onReset={reset}
          />
          <p className="mt-2 text-xs text-muted-foreground">Drag to move, scroll to zoom. The image always covers the case.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <UploadButton onImage={upload} variant="button" label="Change image" />
            <Button variant="secondary" size="sm" onClick={remove}>
              <Icon name="trash" size={15} /> Remove image
            </Button>
          </div>
        </ToolSection>
      )}
    </>
  );

  return (
    <StudioShell slug="cases" step={1}>
      <StudioLayout
        stage={stage}
        tools={tools}
        bar={
          <StudioSummaryBar
            summary={`${model.name} · ${designLabel(image)}`}
            price={casePrice(d)}
            onSave={actions.save}
            saveBlocked={!image ? "Add a photo or one of our designs." : null}
            onPrimary={() => navigate("#/studios/cases/preview")}
            primaryBlocked={blocked}
          />
        }
      />
    </StudioShell>
  );
}

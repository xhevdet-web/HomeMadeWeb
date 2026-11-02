import { useRef, useState } from "react";
import { Icon } from "../../components/Icon";
import { studioHref } from "../../data/homeCategories";
import { money } from "../../lib/format";
import { navigate } from "../../router";
import { BottomSheet } from "../../studio/BottomSheet";
import { DragTile, TileItem, TileRow, elementActions, useCanvasDrop } from "../../studio/canvasKit";
import { imageSize } from "../../studio/capture";
import { describeElement, elementsReducer, type ElementsAction, type PlacedElement } from "../../studio/elements";
import { PlacementLayer, type LayerCommand } from "../../studio/PlacementLayer";
import { useSaveDesign, useStudioHistory } from "../../studio/StudioContext";
import { StageFrame, StudioFrame, StudioToolbar } from "../../studio/StudioFrame";
import { Notice as InfoNotice, ToolSection } from "../../studio/StudioShell";
import { TextTool } from "../../studio/TextTool";
import { QualityWarning, UploadButton, type UploadedImage } from "../../studio/UploadButton";
import { useUndoShortcuts } from "../../studio/useHistory";
import { useIsPhone, useNotice } from "../../studio/ui";
import { ReadyMade } from "../ReadyMade";
import { customUpload, libraryDesigns, type StudioProps } from "../data";
import { StudioShell } from "../../studio/StudioShell";
import { MugEditor, MugViewTabs, mugGeometry, mugSafeBounds, type MugView } from "./MugMockup";
import { MAX_MUG_IMAGES, blankMug, captureMug, fittedImage, mugArea, mugImage, mugInput, mugSummary, mugTexts, readyMugs, type MugArea } from "./logic";

/** About 150 dpi: warn when an upload has fewer pixels than that for its printed size. */
const lowQuality = (el: PlacedElement | undefined, area: MugArea) => !!el?.uploaded && !!el.pxWidth && el.pxWidth / (el.scale * area.widthMm) < 6;

export function MugStudio({ category, data }: StudioProps) {
  const blank = blankMug(data);
  const area = mugArea(blank);
  if (!blank || !area)
    return (
      <StudioShell category={category} step={1}>
        <div className="mt-8">
          <InfoNotice>The mug studio is not set up yet. Please check back soon.</InfoNotice>
        </div>
        <ReadyMade products={readyMugs(data)} />
      </StudioShell>
    );
  return <MugDesigner category={category} data={data} area={area} blankPrice={blank.price} />;
}

function MugDesigner({ category, data, area, blankPrice }: StudioProps & { area: MugArea; blankPrice: number }) {
  const history = useStudioHistory(category.id, "MUG");
  const { state: d, dispatch: update } = history;
  useUndoShortcuts(history.undo, history.redo);
  const [notice, notify] = useNotice();
  const phone = useIsPhone();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [textOpen, setTextOpen] = useState(false);
  // The side of the mug facing the customer; positions are always on the whole print.
  const [view, setView] = useState<MugView>("front");
  const geometry = mugGeometry(area, view);
  const facing = { x: geometry.centre, y: 0.5 };
  const stageRef = useRef<HTMLElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const upload = customUpload(data);
  const designs = libraryDesigns(data);
  const saver = useSaveDesign(
    category,
    async () => {
      const { input, uploads } = await mugInput(category, d, blankMug(data)!, area);
      return { input, files: { preview: await captureMug(d, area), customDesigns: uploads } };
    },
    { quantity: d.quantity },
  );

  const image = mugImage(d);
  const texts = mugTexts(d);
  const selected = d.elements.find((e) => e.id === selectedId) ?? null;
  const apply = (a: ElementsAction, merge?: string) => update((x) => ({ ...x, elements: elementsReducer(x.elements, a) }), merge);

  /** One image per mug: a new image replaces the current one; texts stay. It lands where it was
   * dropped, or in the middle of the side being viewed. */
  const placeImage = (props: Partial<PlacedElement> & { aspect: number }, message: string, at?: { x: number; y: number }) => {
    const el = { ...fittedImage(area, props), ...(at ?? facing) };
    update((x) => {
      const images = x.elements.filter((e) => e.kind === "image");
      const kept = x.elements.filter((e) => e.kind !== "image" || images.indexOf(e) < MAX_MUG_IMAGES - 1);
      return { ...x, elements: elementsReducer(kept, { type: "add", el }) };
    });
    setSelectedId(el.id);
    notify(message);
  };

  const onUpload = (img: UploadedImage) =>
    upload && placeImage({ src: img.url, ref: upload.id, name: "Your image", aspect: img.height / img.width, pxWidth: img.width, uploaded: true }, image ? "Image replaced." : "Image added to your mug.");

  const pickDesign = async (id: string, at?: { x: number; y: number }) => {
    const c = designs.find((x) => x.id === id);
    if (!c?.imageUrl) return;
    const size = await imageSize(c.imageUrl);
    placeImage({ src: c.imageUrl, ref: c.id, name: c.name, aspect: size.height / size.width }, `${c.name} is on your mug.`, at);
  };

  // Fractions of the whole print; a drop on the mug but off the print isn't placed.
  const chip = useCanvasDrop(stageRef, areaRef, image ? "Release to replace the image" : "Release to add", (fx, fy, payload) => {
    if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return false;
    void pickDesign(payload.id, { x: fx, y: fy });
    return true;
  });

  const command = (cmd: LayerCommand, id: string) => {
    if (cmd === "duplicate") return notify("Each image is placed once; order more mugs at checkout", "warn");
    if (cmd === "reset") {
      const el = d.elements.find((e) => e.id === id);
      if (el) apply({ type: "update", el: { ...el, x: 0.5, y: 0.5, rotation: 0, scale: fittedImage(area, { aspect: el.aspect }).scale } });
      return;
    }
    apply({ type: cmd, id });
    if (cmd === "delete") setSelectedId(null);
  };

  const clear = () => {
    apply({ type: "clear" });
    setSelectedId(null);
    notify("Canvas cleared. Tap Undo to bring it back.");
  };

  const empty = d.elements.length === 0;
  const blocked = empty ? "Add an image or text to your mug first." : image?.missing ? "Re-upload your image to continue." : null;
  const textTool = (
    <TextTool
      texts={texts}
      selected={selected}
      defaultColor="navy"
      onAdd={(el) => {
        apply({ type: "add", el: { ...el, x: facing.x } });
        setSelectedId(el.id);
      }}
      onUpdate={(el, merge) => apply({ type: "update", el }, merge)}
      onDone={() => {
        setSelectedId(null);
        setTextOpen(false);
      }}
    />
  );

  const stage = (
    <StageFrame
      ref={stageRef}
      label={`Your mug design with ${mugSummary(d)}`}
      chip={chip}
      overlay={
        <span className="pointer-events-none absolute top-3 left-4 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">
          Printable area: {area.widthMm / 10} × {area.heightMm / 10} cm
        </span>
      }
    >
      <div style={{ width: `min(var(--stage-w), calc(var(--stage-h) * ${geometry.width / geometry.height}))` }}>
        <MugEditor area={area} view={view} printRef={areaRef} onBackground={() => setSelectedId(null)}>
          <PlacementLayer
            elements={d.elements}
            label="Mug print"
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={(el, merge) => apply({ type: "update", el }, merge)}
            onCommand={command}
            bounds={mugSafeBounds(area)}
          />
        </MugEditor>
      </div>
    </StageFrame>
  );

  const toolbar = (
    <StudioToolbar
      {...history}
      onClear={clear}
      canClear={!empty}
      selection={
        selected
          ? {
              title: describeElement(selected),
              image: selected.kind === "text" ? null : (selected.src ?? null),
              onDone: () => setSelectedId(null),
              actions: [
                ...(selected.kind === "text" ? [{ icon: "pencil" as const, label: "Edit text", onClick: () => setTextOpen(true) }] : []),
                ...elementActions(selected, (el) => apply({ type: "update", el }), (cmd) => command(cmd, selected.id), { reset: selected.kind === "image" }),
              ],
            }
          : null
      }
    />
  );

  const picker = (
    <div className="flex flex-col gap-5">
      <QualityWarning show={lowQuality(image, area)} />
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon name="square" size={13} className="text-primary" />
        Keep important parts of your design inside the dashed area.
      </p>
      {upload && (
        <ToolSection title="Your image" aside={upload.price ? `+${money(upload.price)}` : "One image per mug"}>
          <UploadButton onImage={onUpload} label={image?.missing ? "Re-upload your image" : image ? "Replace image" : "Upload image"} hint="JPEG, PNG or WebP, up to 5 MB" />
        </ToolSection>
      )}
      {designs.length > 0 && (
        <ToolSection title="Our designs">
          <p className="mb-3 text-xs text-muted-foreground">Tap a design, or drag it onto the mug. It replaces the current image.</p>
          <TileRow cols="grid-cols-3">
            {designs.map((c) => (
              <TileItem key={c.id}>
                <DragTile id={c.id} name={c.name} image={c.imageUrl} price={c.price ? `+${money(c.price)}` : undefined} selected={image?.ref === c.id} onTap={() => void pickDesign(c.id)} />
              </TileItem>
            ))}
          </TileRow>
        </ToolSection>
      )}
      <ToolSection title="Text">{phone ? <AddTextButton count={texts.length} onClick={() => setTextOpen(true)} /> : textTool}</ToolSection>
      <BottomSheet title={selected?.kind === "text" ? "Edit text" : "Add text"} open={phone && textOpen} onClose={() => setTextOpen(false)}>
        {textTool}
      </BottomSheet>
    </div>
  );

  return (
    <>
      <StudioFrame
        category={category}
        subtitle={`Price per mug ${money(blankPrice)}`}
        onSave={saver.save}
        saving={saver.saving}
        saveBlocked={blocked}
        top={geometry.turns ? <MugViewTabs view={view} onChange={setView} /> : undefined}
        stage={stage}
        notice={notice}
        toolbar={toolbar}
        picker={picker}
        footer={{
          summary: mugSummary(d),
          price: blankPrice,
          priceLabel: "Per mug",
          primaryLabel: "Preview on mug",
          onPrimary: () => navigate(studioHref(category, "preview")),
          primaryBlocked: empty ? "Add an image or text to your mug first." : null,
        }}
      />
      {!phone && <ReadyMadeBelow products={readyMugs(data)} />}
    </>
  );
}

function ReadyMadeBelow({ products }: { products: Parameters<typeof ReadyMade>[0]["products"] }) {
  if (!products.length) return null;
  return (
    <div className="mx-auto max-w-7xl px-6 pb-24">
      <ReadyMade products={products} />
    </div>
  );
}

export function AddTextButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border font-semibold transition-colors hover:border-primary hover:text-primary">
      <Icon name="type" size={18} /> Add text {count > 0 && <span className="text-xs text-muted-foreground">({count} of 6)</span>}
    </button>
  );
}

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Button, ButtonLink } from "../../components/Button";
import { Icon } from "../../components/Icon";
import type { StickerSize } from "../../api/models";
import { studioHref } from "../../data/homeCategories";
import { money } from "../../lib/format";
import { navigate } from "../../router";
import { BottomSheet } from "../../studio/BottomSheet";
import { DragTile, TileItem, TileRow, elementActions, useCanvasDrop } from "../../studio/canvasKit";
import { imageSize } from "../../studio/capture";
import { isDragging } from "../../studio/dnd/controller";
import type { PlacedElement } from "../../studio/elements";
import { PlacementLayer, type LayerCommand } from "../../studio/PlacementLayer";
import { useSaveDesign, useStudio, useStudioHistory } from "../../studio/StudioContext";
import { SelectionToolbar, StageControls, StageFrame, StudioFrame } from "../../studio/StudioFrame";
import { ToolSection } from "../../studio/StudioShell";
import { QualityWarning, UploadButton, type UploadedImage } from "../../studio/UploadButton";
import { useUndoShortcuts } from "../../studio/useHistory";
import { useNotice } from "../../studio/ui";
import { customUpload, libraryDesigns, type StudioProps } from "../data";
import { StickerCanvas } from "./StickerCanvas";
import { LIBRARY_SCALE, MAX_DESIGNS, allHaveImages, captureStickers, fitMode, newDesign, placeOnSticker, setLabel, sizeOf, stickerInput, stickerPrice, unitScale } from "./logic";

/** About 150 dpi (6 px per mm) at the current zoom. */
const lowQuality = (el: PlacedElement | null, s: StickerSize) => !!el?.uploaded && !!el.pxWidth && el.pxWidth / (s.widthMm * el.scale) < 6;

export function StickerStudio({ category, data }: StudioProps) {
  const size = sizeOf(category, useStudio().getDraft(category.id, "STICKER"));
  if (!size) return null;
  return <StickerDesigner category={category} data={data} size={size} />;
}

function StickerDesigner({ category, data, size }: StudioProps & { size: StickerSize }) {
  const history = useStudioHistory(category.id, "STICKER");
  const { state: d, dispatch: update } = history;
  useUndoShortcuts(history.undo, history.redo);
  const [notice, notify] = useNotice();
  const [rawActive, setActive] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shapeOpen, setShapeOpen] = useState(false);
  const stageRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number; id: number } | null>(null);
  const upload = customUpload(data);
  const designs = libraryDesigns(data);
  const saver = useSaveDesign(category, async () => {
    const { input, uploads } = await stickerInput(category, d, size);
    return { input, files: { preview: await captureStickers(d, size), customDesigns: uploads } };
  });

  const active = Math.min(rawActive, d.designs.length - 1);
  const design = d.designs[active];
  const image = design.image;

  const show = (i: number) => {
    setActive(i);
    setSelectedId(null);
  };

  const setImage = (img: PlacedElement | null, merge?: string) =>
    update((x) => ({ ...x, designs: x.designs.map((s, i) => (i === active ? { ...s, image: img } : s)) }), merge);

  const place = (props: Partial<PlacedElement> & { aspect: number }, message: string) => {
    const el = placeOnSticker(size, props);
    setImage(el);
    setSelectedId(el.id);
    notify(message);
  };

  const onUpload = (img: UploadedImage) =>
    upload &&
    place({ src: img.url, ref: upload.id, name: "Your image", aspect: img.height / img.width, pxWidth: img.width, uploaded: true }, `Image added to design ${active + 1}.`);

  const pick = async (id: string) => {
    const c = designs.find((x) => x.id === id);
    if (!c?.imageUrl) return;
    const dims = await imageSize(c.imageUrl);
    place({ src: c.imageUrl, ref: c.id, name: c.name, aspect: dims.height / dims.width }, `${c.name} added to design ${active + 1}.`);
  };

  // One image per design: dropping a design onto the sticker replaces its image.
  const chip = useCanvasDrop(stageRef, canvasRef, image ? "Release to replace the image" : "Release to add", (_fx, _fy, payload) => {
    void pick(payload.id);
    return true;
  });

  const reset = () => image && setImage({ ...image, x: 0.5, y: 0.5, rotation: 0, scale: unitScale(image, size) * (image.uploaded ? 1 : LIBRARY_SCALE) });

  const addDesign = () => {
    if (d.designs.length >= MAX_DESIGNS) return;
    update((x) => ({ ...x, designs: [...x.designs, newDesign()] }));
    show(d.designs.length);
    notify(`Design ${d.designs.length + 1} added. Give it an image.`);
  };

  const deleteDesign = () => {
    if (d.designs.length === 1) setImage(null);
    else {
      update((x) => ({ ...x, designs: x.designs.filter((_, i) => i !== active) }));
      setActive(Math.max(0, active - 1));
    }
    setSelectedId(null);
    notify(`Design ${active + 1} deleted. Tap Undo to bring it back.`);
  };

  const command = (cmd: LayerCommand) => {
    if (cmd === "reset") reset();
    if (cmd === "delete") {
      setImage(null);
      setSelectedId(null);
    }
  };

  const clear = () => {
    update((x) => ({ ...x, designs: [newDesign()] }));
    show(0);
    notify("Canvas cleared. Tap Undo to bring it back.");
  };

  /** Swiping across the stage (outside the sticker itself) moves between designs, like the app's pager. */
  const swipeStart = (e: ReactPointerEvent) => {
    const t = e.target as Node;
    if (e.pointerType === "mouse" || canvasRef.current?.contains(t) || (t as Element).closest?.("button")) return;
    swipe.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const swipeEnd = (e: ReactPointerEvent) => {
    const s = swipe.current;
    swipe.current = null;
    if (!s || s.id !== e.pointerId || isDragging()) return;
    const dx = e.clientX - s.x;
    if (Math.abs(dx) < 50 || Math.abs(e.clientY - s.y) > 40) return;
    const next = active + (dx < 0 ? 1 : -1);
    if (next >= 0 && next < d.designs.length) show(next);
  };

  const withImages = d.designs.filter((s) => s.image && !s.image.missing).length;
  const blocked = allHaveImages(d) ? null : "Add an image to every design before previewing your set.";

  const stage = (
    // The stage never scrolls, so it takes horizontal swipes itself instead of the browser cancelling them as a pan.
    <div className="h-full touch-none" onPointerDown={swipeStart} onPointerUp={swipeEnd} onPointerCancel={() => (swipe.current = null)}>
      <StageFrame
        ref={stageRef}
        label={`Sticker design ${active + 1} of ${d.designs.length}, ${setLabel(size)}${image ? "" : ", empty"}`}
        chip={chip}
        overlay={
          <>
            {d.designs.length > 1 && (
              <div className="pointer-events-none absolute top-1 left-1/2 z-20 flex -translate-x-1/2 gap-1.5" aria-hidden="true">
                {d.designs.map((s, i) => (
                  <span key={s.id} className={`h-1.5 rounded-full transition-all ${i === active ? "w-5 bg-primary" : "w-1.5 bg-muted-foreground/40"}`} />
                ))}
              </div>
            )}
            <StageControls {...history} onClear={clear} canClear={withImages > 0 || d.designs.length > 1} className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2" />
          </>
        }
      >
        <div
          key={design.id}
          ref={canvasRef}
          className="flip-in"
          style={{ width: `min(var(--stage-w), calc(var(--stage-h) * ${size.widthMm / size.heightMm}), ${size.heightMm < size.widthMm ? 440 : 340}px)` }}
        >
          <StickerCanvas size={size}>
            <PlacementLayer
              elements={image ? [image] : []}
              label={`Sticker design ${active + 1}`}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onChange={(el, merge) => setImage(el, merge)}
              onCommand={command}
              mode={image ? fitMode(image) : "contain"}
              wheelZoom
            />
          </StickerCanvas>
          {!image && <p className="mt-3 text-center text-sm text-muted-foreground">Upload an image or pick one of our designs.</p>}
        </div>
      </StageFrame>
    </div>
  );

  const toolbar =
    image && selectedId === image.id ? (
      <SelectionToolbar
        title={image.name ?? `Design ${active + 1}`}
        image={image.src ?? null}
        onDone={() => setSelectedId(null)}
        actions={elementActions(image, (el) => setImage(el), command, { layers: false, reset: true })}
      />
    ) : null;

  const tabs = (
    <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label={`Designs, ${d.designs.length} of ${MAX_DESIGNS}`}>
      {d.designs.map((s, i) => (
        <button
          key={s.id}
          type="button"
          role="tab"
          aria-selected={i === active}
          onClick={() => show(i)}
          className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors ${
            i === active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary"
          }`}
        >
          Design {i + 1}
          {s.image && !s.image.missing && <Icon name="check" size={14} className="text-success" />}
        </button>
      ))}
      {d.designs.length < MAX_DESIGNS && (
        <button
          type="button"
          onClick={addDesign}
          className="min-h-11 shrink-0 rounded-full border border-dashed border-border px-4 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
        >
          + Add
        </button>
      )}
    </div>
  );

  const picker = (
    <div className="flex flex-col gap-5">
      <QualityWarning show={lowQuality(image, size)} />
      {upload && (
        <ToolSection title={`Image for design ${active + 1}`} aside="One image per design">
          <UploadButton onImage={onUpload} label={image?.missing ? "Re-upload your image" : image ? "Replace image" : "Upload image"} hint="JPEG, PNG or WebP, up to 5 MB" />
        </ToolSection>
      )}
      {designs.length > 0 && (
        <ToolSection title="Our designs">
          <p className="mb-3 text-xs text-muted-foreground">Tap a design, or drag it onto the sticker.</p>
          <TileRow cols="grid-cols-4">
            {designs.map((c) => (
              <TileItem key={c.id}>
                <DragTile id={c.id} name={c.name} image={c.imageUrl} selected={image?.ref === c.id} onTap={() => void pick(c.id)} />
              </TileItem>
            ))}
          </TileRow>
        </ToolSection>
      )}
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" onClick={deleteDesign}>
          <Icon name="trash" size={15} /> Delete design {active + 1}
        </Button>
      </div>
      <BottomSheet title="Change shape or size" open={shapeOpen} onClose={() => setShapeOpen(false)}>
        <p className="text-sm">Your designs stay, but each image is re-centred to fit the new shape and size.</p>
        <div className="mt-4 flex gap-2">
          <ButtonLink href={studioHref(category)}>Change shape or size</ButtonLink>
          <Button variant="secondary" onClick={() => setShapeOpen(false)}>
            Cancel
          </Button>
        </div>
      </BottomSheet>
    </div>
  );

  return (
    <StudioFrame
      category={category}
      subtitle={`${setLabel(size)} · ${money(size.price)} each`}
      onSave={saver.save}
      saving={saver.saving}
      saveBlocked={blocked}
      top={
        <button
          type="button"
          onClick={() => setShapeOpen(true)}
          className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-secondary"
        >
          <Icon name="square" size={16} className="text-primary" />
          <span className="min-w-0 flex-1 truncate font-semibold">{setLabel(size)}</span>
          <span className="font-semibold text-primary">Change shape</span>
        </button>
      }
      stage={stage}
      notice={notice}
      toolbar={toolbar}
      picker={picker}
      pickerFooter={tabs}
      footer={{
        summary: `${d.designs.length} design${d.designs.length > 1 ? "s" : ""} · ${setLabel(size)}`,
        price: stickerPrice(d, size),
        onPrimary: () => navigate(studioHref(category, "preview")),
        primaryBlocked: blocked,
      }}
    />
  );
}

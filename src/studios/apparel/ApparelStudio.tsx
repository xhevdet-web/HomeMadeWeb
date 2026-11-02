import { useMemo, useRef, useState } from "react";
import type { Component } from "../../api/models";
import { studioHref } from "../../data/homeCategories";
import { money } from "../../lib/format";
import { navigate } from "../../router";
import { BottomSheet } from "../../studio/BottomSheet";
import { DragTile, TileItem, TileRow, elementActions, useCanvasDrop } from "../../studio/canvasKit";
import { imageSize } from "../../studio/capture";
import { useActiveDrag } from "../../studio/dnd/hooks";
import { describeElement, elementsReducer, imageElement, type ElementsAction, type PlacedElement } from "../../studio/elements";
import { PlacementLayer, type LayerCommand } from "../../studio/PlacementLayer";
import { useSaveDesign, useStudioHistory } from "../../studio/StudioContext";
import { StageFrame, StudioFrame, StudioToolbar } from "../../studio/StudioFrame";
import { Tabs, ToolSection } from "../../studio/StudioShell";
import { TextTool } from "../../studio/TextTool";
import { QualityWarning, UploadButton, type UploadedImage } from "../../studio/UploadButton";
import { useUndoShortcuts } from "../../studio/useHistory";
import { useIsPhone, useNotice } from "../../studio/ui";
import { AddTextButton } from "../mugs/MugStudio";
import { componentById, customUpload, libraryDesigns, typeLabel, type StudioProps } from "../data";
import { allElements, apparelInput, apparelPrice, apparelSummary, baseOf, boundsOf, apparelPreviews, hasUpload, printArea, useImageRatio, garmentImage, type Side } from "./logic";
import { GarmentCanvas } from "./silhouettes";

/** About 150 dpi across the print width. */
const lowQuality = (els: PlacedElement[], printWidthCm: number) => els.some((e) => e.uploaded && e.pxWidth && e.pxWidth / (e.scale * printWidthCm) < 60);

export function ApparelStudio({ category, data }: StudioProps) {
  const history = useStudioHistory(category.id, "APPAREL");
  const { state: d, dispatch: update } = history;
  useUndoShortcuts(history.undo, history.redo);
  const [notice, notify] = useNotice();
  const phone = useIsPhone();
  const dragging = useActiveDrag();
  const [side, setSide] = useState<Side>("front");
  const [tab, setTab] = useState("ALL");
  const [textOpen, setTextOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const stageRef = useRef<HTMLElement>(null);
  const garmentRef = useRef<HTMLDivElement>(null);
  const byId = useMemo(() => componentById(data), [data]);
  const upload = customUpload(data);
  const designs = libraryDesigns(data);
  const types = [...new Set(designs.map((c) => c.type?.trim()).filter((t): t is string => !!t))];
  const base = baseOf(d, data);
  const area = printArea(base, side, category);
  const ratio = useImageRatio(garmentImage(base, side));

  const saver = useSaveDesign(category, async () => {
    const { input, uploads } = await apparelInput(category, d, data);
    return { input, files: { ...(await apparelPreviews(d, data)), customDesigns: uploads } };
  });

  const elements = d[side];
  const selected = elements.find((e) => e.id === selectedId) ?? null;
  const apply = (a: ElementsAction, merge?: string) => update((x) => ({ ...x, [side]: elementsReducer(x[side], a) }), merge);
  const centre = { x: area.x + area.width / 2, y: area.y + area.height / 2 };

  const switchSide = (s: Side) => {
    setSide(s);
    setSelectedId(null);
  };

  const place = (props: Partial<PlacedElement> & { aspect: number }, at?: { x: number; y: number }) => {
    const el = imageElement({ scale: area.width * 0.6, ...centre, ...(at ?? {}), ...props });
    apply({ type: "add", el });
    setSelectedId(el.id);
  };

  const addDesign = async (c: Component, at?: { x: number; y: number }) => {
    if (!c.imageUrl) return;
    const size = await imageSize(c.imageUrl);
    place({ src: c.imageUrl, ref: c.id, name: c.name, aspect: size.height / size.width }, at);
    notify(`${c.name} added to the ${side}.`);
  };

  const chip = useCanvasDrop(stageRef, garmentRef, "Release to add", (fx, fy, payload) => {
    const c = byId.get(payload.id);
    if (!c) return false;
    void addDesign(c, { x: fx, y: fy });
    return true;
  });

  const onUpload = (img: UploadedImage) => {
    if (!upload) return;
    const first = !hasUpload(d);
    place({ src: img.url, ref: upload.id, name: "Your artwork", aspect: img.height / img.width, pxWidth: img.width, uploaded: true });
    notify(first && upload.price ? `Your artwork is on the ${side}. ${money(upload.price)} once.` : `Your artwork is on the ${side}.`);
  };

  const command = (cmd: LayerCommand, id: string) => {
    if (cmd === "reset") return;
    if (cmd === "duplicate" && elements.find((e) => e.id === id)?.uploaded) return notify("Each uploaded design can be placed only once", "warn");
    apply({ type: cmd, id });
    if (cmd === "delete") setSelectedId(null);
  };

  const clear = () => {
    update((x) => ({ ...x, front: [], back: [] }));
    setSelectedId(null);
    notify("Canvas cleared. Tap Undo to bring it back.");
  };

  const empty = allElements(d).length === 0;
  const missing = allElements(d).some((e) => e.missing);
  const shown = designs.filter((c) => tab === "ALL" || c.type?.trim() === tab);
  const printCm = Number((base?.printAreas as { front?: { widthCm?: number } } | null)?.front?.widthCm) || 30;
  const textTool = (
    <TextTool
      texts={allElements(d).filter((e) => e.kind === "text")}
      selected={selected}
      defaultColor={base?.colorHex && parseInt(base.colorHex.slice(1, 3), 16) < 128 ? "white" : "navy"}
      onAdd={(el) => {
        apply({ type: "add", el: { ...el, ...centre, scale: 0.06 } });
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
      label={`${side === "front" ? "Front" : "Back"} with ${elements.length} design${elements.length === 1 ? "" : "s"}`}
      chip={chip}
    >
      {/* Switching sides flips the garment (no motion with reduced motion). */}
      <div key={side} ref={garmentRef} className="flip-in" style={{ width: `min(var(--stage-w), calc(var(--stage-h) * ${ratio}))` }}>
        <GarmentCanvas base={base} side={side} category={category} showArea={!!selected || !!dragging || elements.length === 0}>
          <PlacementLayer
            elements={elements}
            label={`Designs on the ${side}`}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={(el, merge) => apply({ type: "update", el }, merge)}
            onCommand={command}
            bounds={boundsOf(area)}
          />
        </GarmentCanvas>
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
                ...(selected.kind === "text" ? [{ icon: "pencil" as const, label: "Edit text", onClick: () => (phone ? setTextOpen(true) : setTab("TEXT")) }] : []),
                ...elementActions(selected, (el) => apply({ type: "update", el }), (cmd) => command(cmd, selected.id), { centre, duplicate: !selected.uploaded }),
              ],
            }
          : null
      }
    />
  );

  const picker = (
    <div className="flex flex-col gap-5">
      <QualityWarning show={lowQuality(elements, printCm)} />
      <ToolSection title="Designs" aside={`Adding to the ${side}`}>
        <p className="mb-3 text-xs text-muted-foreground">Tap a design to add it to the {side}. It stays inside the print area.</p>
        <Tabs
          label="Design type"
          value={tab}
          onChange={(t) => (t === "TEXT" && phone ? setTextOpen(true) : setTab(t))}
          tabs={[{ id: "ALL", label: "All" }, ...types.map((t) => ({ id: t, label: typeLabel(t) })), { id: "TEXT", label: "Text" }]}
        />
        <div className="mt-3">
          {tab === "TEXT" && !phone ? (
            textTool
          ) : shown.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nothing in this group yet.</p>
          ) : (
            <TileRow>
              {shown.map((c) => (
                <TileItem key={c.id}>
                  <DragTile
                    id={c.id}
                    name={c.name}
                    image={c.imageUrl}
                    price={c.price ? money(c.price) : "Free"}
                    badge={elements.some((e) => e.ref === c.id) ? "Added" : null}
                    onTap={() => void addDesign(c)}
                  />
                </TileItem>
              ))}
            </TileRow>
          )}
        </div>
      </ToolSection>
      {phone && <AddTextButton count={allElements(d).filter((e) => e.kind === "text").length} onClick={() => setTextOpen(true)} />}
      {upload && (
        <ToolSection title="Upload your own design" aside={hasUpload(d) ? "Charged once" : upload.price ? `${money(upload.price)} once` : "Free"}>
          <UploadButton
            onImage={onUpload}
            accept={["image/png"]}
            typeError="Only PNG images can be uploaded. Save your design as a .png file and try again."
            label={missing ? "Re-upload your artwork" : "Upload your own design"}
            hint={`PNG only, up to 5 MB${upload.price ? ` · ${money(upload.price)} once, however many times you place it` : ""}`}
          />
        </ToolSection>
      )}
      <BottomSheet title={selected?.kind === "text" ? "Edit text" : "Add text"} open={phone && textOpen} onClose={() => setTextOpen(false)}>
        {textTool}
      </BottomSheet>
    </div>
  );

  return (
    <StudioFrame
      category={category}
      subtitle={[base?.name, d.size].filter(Boolean).join(" · ") || "Choose your piece"}
      onSave={saver.save}
      saving={saver.saving}
      saveBlocked={empty ? "Add a logo, graphic, text or your own artwork." : missing ? "Re-upload your artwork to continue." : null}
      top={
        <div role="radiogroup" aria-label="Side" className="grid grid-cols-2 gap-1 rounded-full border border-border bg-card p-1">
          {(["front", "back"] as Side[]).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={side === s}
              onClick={() => switchSide(s)}
              className={`min-h-10 rounded-full text-sm font-semibold capitalize transition-colors ${side === s ? "bg-secondary text-foreground" : "text-muted-foreground"}`}
            >
              {s}
              {d[s].length ? ` · ${d[s].length}` : ""}
            </button>
          ))}
        </div>
      }
      stage={stage}
      notice={notice}
      toolbar={toolbar}
      picker={picker}
      footer={{
        summary: apparelSummary(d, data),
        price: apparelPrice(d, data, byId),
        onPrimary: () => navigate(studioHref(category, "preview")),
        primaryBlocked: empty ? "Add a logo, graphic, text or your own artwork." : null,
      }}
    />
  );
}

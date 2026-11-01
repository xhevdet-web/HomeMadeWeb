import { useState } from "react";
import { Button, ButtonLink } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { money } from "../../data/mock";
import { MAX_STICKER_DESIGNS, STICKER_DESIGNS } from "../../data/studioCatalog";
import { navigate } from "../../router";
import { ART, Artwork, type ArtId } from "../../studio/artworks";
import { isLowQuality, type PlacedElement } from "../../studio/elements";
import { PlacementLayer, type LayerCommand } from "../../studio/PlacementLayer";
import { useDesignActions, useStudioHistory } from "../../studio/StudioContext";
import { CanvasToolbar, ImageControls, Stage, StudioLayout, StudioShell, ToolSection } from "../../studio/StudioShell";
import { StudioSummaryBar } from "../../studio/StudioSummaryBar";
import { useToast } from "../../studio/Toasts";
import { QualityWarning, UploadButton, type UploadedImage } from "../../studio/UploadButton";
import { StickerCanvas } from "./StickerCanvas";
import { allHaveImages, coverSticker, newDesign, setLabel, sizeOf, stickerInfo, stickerPrice } from "./logic";

export function StickerStudio() {
  const history = useStudioHistory("stickers");
  const { state: d, dispatch: update } = history;
  const toast = useToast();
  const [rawActive, setActive] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const actions = useDesignActions("stickers", stickerInfo(d));

  const size = sizeOf(d)!;
  const active = Math.min(rawActive, d.designs.length - 1);
  const design = d.designs[active];
  const image = design.image;

  const setImage = (img: PlacedElement | null, merge?: string) =>
    update((x) => ({ ...x, designs: x.designs.map((s, i) => (i === active ? { ...s, image: img } : s)) }), merge);

  const place = (props: Parameters<typeof coverSticker>[1], message: string) => {
    const el = coverSticker(size, props);
    setImage(el);
    setSelectedId(el.id);
    toast(message);
  };

  const upload = (img: UploadedImage) =>
    place({ src: img.url, aspect: img.height / img.width, pxWidth: img.width, uploaded: true }, `Image added to design ${active + 1}.`);
  const pick = (art: ArtId) => place({ art, aspect: 1 }, `${ART[art].name} added to design ${active + 1}.`);

  const reset = () => image && setImage({ ...image, x: 0.5, y: 0.5, rotation: 0, scale: coverSticker(size, { aspect: image.aspect }).scale });

  const addDesign = () => {
    if (d.designs.length >= MAX_STICKER_DESIGNS) return;
    update((x) => ({ ...x, designs: [...x.designs, newDesign()] }));
    setActive(d.designs.length);
    setSelectedId(null);
  };

  const deleteDesign = () => {
    if (d.designs.length === 1) {
      setImage(null);
    } else {
      update((x) => ({ ...x, designs: x.designs.filter((_, i) => i !== active) }));
      setActive(Math.max(0, active - 1));
    }
    setSelectedId(null);
    toast(`Design ${active + 1} deleted.`);
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
    setActive(0);
    setSelectedId(null);
    toast("Canvas cleared. Undo to bring it back.");
  };

  const withImages = d.designs.filter((s) => s.image).length;
  const aspect = size.hCm / size.wCm;

  const stage = (
    <Stage
      label={`Sticker design ${active + 1} of ${d.designs.length}, ${setLabel(d)}${image ? "" : ", empty"}`}
      toolbar={<CanvasToolbar {...history} onClear={clear} canClear={withImages > 0 || d.designs.length > 1} />}
      below={<QualityWarning show={!!image && isLowQuality(image, size.wCm)} />}
    >
      <div className="w-full" style={{ maxWidth: aspect < 1 ? 440 : 340 }}>
        <StickerCanvas shape={d.shape!} size={size}>
          <PlacementLayer
            key={design.id}
            elements={image ? [image] : []}
            label={`Sticker design ${active + 1}`}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={(el, merge) => setImage(el, merge)}
            onCommand={command}
            mode="cover"
            wheelZoom
            actions={["smaller", "larger", "rotateLeft", "rotateRight", "reset", "delete"]}
          />
        </StickerCanvas>
        {!image && <p className="mt-5 text-center text-sm text-muted-foreground">Upload an image or pick one of our designs.</p>}
      </div>
    </Stage>
  );

  const tools = (
    <>
      <section className="rounded-2xl border border-border bg-secondary/40 p-4" aria-label="Your set">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Your set</p>
            <p className="font-semibold">
              {setLabel(d)} · {money(size.price)} each
            </p>
            <p className="text-sm text-muted-foreground">
              {d.designs.length} design{d.designs.length > 1 ? "s" : ""}
            </p>
          </div>
          {!confirming && (
            <button type="button" onClick={() => setConfirming(true)} className="text-sm font-semibold whitespace-nowrap text-primary hover:underline">
              Change shape or size
            </button>
          )}
        </div>
        {confirming && (
          <div className="mt-4 border-t border-border pt-4" role="alertdialog" aria-label="Change shape or size">
            <p className="text-sm">Your designs stay, but each image is re-centred to fit the new shape and size.</p>
            <div className="mt-3 flex gap-2">
              <ButtonLink href="#/studios/stickers" size="sm">
                Change shape or size
              </ButtonLink>
              <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </section>

      <ToolSection title="Designs" aside={`${d.designs.length} of ${MAX_STICKER_DESIGNS}`}>
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="tablist" aria-label="Designs">
          {d.designs.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => {
                setActive(i);
                setSelectedId(null);
              }}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                i === active ? "border-primary text-primary" : "border-border text-muted-foreground hover:bg-secondary"
              }`}
            >
              Design {i + 1}
              {s.image && <Icon name="check" size={14} className="text-success" />}
            </button>
          ))}
          {d.designs.length < MAX_STICKER_DESIGNS && (
            <button
              type="button"
              onClick={addDesign}
              className="shrink-0 rounded-full border border-dashed border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              + Add
            </button>
          )}
        </div>
      </ToolSection>

      <ToolSection title={`Image for design ${active + 1}`} aside="One image per design">
        <UploadButton onImage={upload} />
        <p className="mt-5 mb-3 text-sm font-semibold">Our designs</p>
        <ul className="grid grid-cols-4 gap-2">
          {STICKER_DESIGNS.map((art) => (
            <li key={art}>
              <button
                type="button"
                aria-label={ART[art].name}
                title={ART[art].name}
                aria-pressed={image?.art === art}
                onClick={() => pick(art)}
                className={`block aspect-square w-full rounded-xl border-2 bg-secondary p-1.5 transition-colors ${
                  image?.art === art ? "border-primary" : "border-transparent hover:border-border"
                }`}
              >
                <Artwork id={art} />
              </button>
            </li>
          ))}
        </ul>
      </ToolSection>

      <ToolSection title="Adjust">
        {image ? (
          <ImageControls
            onZoom={(k) => setImage({ ...image, scale: image.scale * k })}
            onRotate={(deg) => setImage({ ...image, rotation: image.rotation + deg })}
            onReset={reset}
          />
        ) : (
          <p className="text-sm text-muted-foreground">Add an image to move, zoom and rotate it.</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {image && <UploadButton onImage={upload} variant="button" label="Replace image" />}
          <Button variant="secondary" size="sm" onClick={deleteDesign}>
            <Icon name="trash" size={15} /> Delete design
          </Button>
        </div>
      </ToolSection>
    </>
  );

  return (
    <StudioShell slug="stickers" step={1}>
      <StudioLayout
        stage={stage}
        tools={tools}
        bar={
          <StudioSummaryBar
            summary={`${d.designs.length} design${d.designs.length > 1 ? "s" : ""} · ${setLabel(d)}`}
            price={stickerPrice(d)}
            onSave={actions.save}
            saveBlocked={withImages === 0 ? "Add an image to at least one design." : null}
            onPrimary={() => navigate("#/studios/stickers/preview")}
            primaryBlocked={allHaveImages(d) ? null : "Add an image to every design before previewing your set."}
          />
        }
      />
    </StudioShell>
  );
}

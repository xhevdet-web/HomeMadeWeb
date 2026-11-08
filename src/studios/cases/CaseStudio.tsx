import { useMemo, useRef, useState } from "react";
import i18n from "../../i18n";

// Re-renders with the app when the language changes.
const t = i18n.t.bind(i18n);
import { Icon } from "../../components/Icon";
import { studioHref } from "../../data/homeCategories";
import { money } from "../../lib/format";
import { backIfPrevious, backOrNavigate } from "../../router";
import { DragTile, TileItem, TileRow, elementActions, useCanvasDrop } from "../../studio/canvasKit";
import { imageSize } from "../../studio/capture";
import type { PlacedElement } from "../../studio/elements";
import { PlacementLayer, type LayerCommand } from "../../studio/PlacementLayer";
import { useSaveDesign, useStudioHistory } from "../../studio/StudioContext";
import { StageFrame, StudioFrame, StudioToolbar } from "../../studio/StudioFrame";
import { Notice as InfoNotice, ToolSection } from "../../studio/StudioShell";
import { QualityWarning, UploadButton, type UploadedImage } from "../../studio/UploadButton";
import { useUndoShortcuts } from "../../studio/useHistory";
import { useNotice } from "../../studio/ui";
import { useImageRatio } from "../apparel/logic";
import { componentById, customUpload, libraryDesigns, type StudioProps } from "../data";
import { CaseCanvas } from "./CaseCanvas";
import { areaAspect, captureCase, caseAreas, caseImage, caseInput, casePrice, coverImage, isSoldOut, modelOf } from "./logic";

/** The app's check: about 450 pixels across the case back at the current zoom. */
const lowQuality = (el: PlacedElement | undefined, ofArea: number) =>
  !!el?.uploaded && !!el.pxWidth && el.pxWidth / (el.scale / Math.max(1, ofArea / el.aspect)) < 450;

export function CaseStudio({ category, data }: StudioProps) {
  const history = useStudioHistory(category.id, "CASE");
  const { state: d, dispatch: update } = history;
  useUndoShortcuts(history.undo, history.redo);
  const [notice, notify] = useNotice();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const stageRef = useRef<HTMLElement>(null);
  const caseRef = useRef<HTMLDivElement>(null);
  const byId = useMemo(() => componentById(data), [data]);
  const model = modelOf(d, data);
  const upload = customUpload(data);
  const designs = libraryDesigns(data);
  const ratio = useImageRatio(model?.imageUrl ?? null);
  const shownRatio = model?.imageUrl ? ratio : 0.49;
  const ofArea = areaAspect(caseAreas(model).area, shownRatio);
  const image = caseImage(d);

  const saver = useSaveDesign(category, async () => {
    const { input, uploads } = await caseInput(category, d, model!, ofArea);
    return { input, files: { preview: await captureCase(d, model!), customDesigns: uploads } };
  });

  const setImage = (el: PlacedElement | null, merge?: string) => update((x) => ({ ...x, elements: el ? [el] : [] }), merge);

  const onUpload = (img: UploadedImage) => {
    if (!upload) return;
    const el = coverImage(img.height / img.width, ofArea, { src: img.url, ref: upload.id, name: t("cases.yourPhoto"), pxWidth: img.width, uploaded: true });
    setImage(el);
    setSelectedId(el.id);
    notify(image ? t("mugs.imageReplaced") : t("cases.photoOnCase"));
  };

  const pick = async (id: string) => {
    const c = designs.find((x) => x.id === id);
    if (!c?.imageUrl) return;
    const size = await imageSize(c.imageUrl);
    const el = coverImage(size.height / size.width, ofArea, { src: c.imageUrl, ref: c.id, name: c.name });
    setImage(el);
    setSelectedId(el.id);
    notify(`${c.name} is on your case.`);
  };

  // One design at a time: dropping one onto the case replaces the current image.
  const chip = useCanvasDrop(stageRef, caseRef, image ? t("mugs.releaseToReplace") : t("mugs.releaseToAdd"), (_fx, _fy, payload) => {
    void pick(payload.id);
    return true;
  });

  const reset = () => image && setImage({ ...image, x: 0.5, y: 0.5, rotation: 0, scale: coverImage(image.aspect, ofArea, {}).scale });
  const remove = () => {
    setImage(null);
    setSelectedId(null);
    notify(t("cases.imageRemoved"));
  };
  const command = (cmd: LayerCommand) => {
    if (cmd === "reset") reset();
    if (cmd === "delete") remove();
  };
  const clear = () => {
    setImage(null);
    setSelectedId(null);
    notify(t("studio.cleared"));
  };

  const unavailable = !model ? t("cases.chooseModelFirst") : isSoldOut(model) ? t("cases.modelGone") : null;
  const blocked = unavailable ?? (!image ? t("cases.addFirst") : image.missing ? t("cases.reuploadToContinue") : null);

  const stage = (
    <StageFrame
      ref={stageRef}
      label={image ? t("cases.stageLabel") : t("cases.stageLabelEmpty")}
      chip={chip}
    >
      <div ref={caseRef} style={{ width: `min(var(--stage-w), calc(var(--stage-h) * ${shownRatio}))` }}>
        <CaseCanvas model={model}>
          <PlacementLayer
            elements={d.elements}
            label={t("cases.caseDesign")}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={(el, merge) => setImage(el, merge)}
            onCommand={command}
            mode="cover"
            wheelZoom
          />
        </CaseCanvas>
      </div>
    </StageFrame>
  );

  const toolbar = (
    <StudioToolbar
      {...history}
      onClear={clear}
      canClear={!!image}
      selection={
        image && selectedId === image.id
          ? {
              title: image.name ?? t("cases.yourPhoto"),
              image: image.src ?? null,
              onDone: () => setSelectedId(null),
              actions: elementActions(image, (el) => setImage(el), command, { layers: false, reset: true }),
            }
          : null
      }
    />
  );

  const picker = (
    <div className="flex flex-col gap-5">
      {model && isSoldOut(model) && <InfoNotice>{t("cases.modelGone")}</InfoNotice>}
      <QualityWarning show={lowQuality(image, ofArea)} />
      <p className="text-xs text-muted-foreground">{t("cases.safeArea")}</p>
      {upload && (
        <ToolSection title={t("cases.yourPhoto")} aside={upload.price ? `+${money(upload.price)}` : t("common.free")}>
          <UploadButton onImage={onUpload} label={image?.missing ? t("cases.reuploadPhoto") : image ? t("cases.changeImage") : t("cases.uploadPhoto")} hint={t("upload.hint")} />
        </ToolSection>
      )}
      {designs.length > 0 && (
        <ToolSection title={t("cases.ourDesigns")}>
          <p className="mb-3 text-xs text-muted-foreground">{t("cases.ourDesignsHint")}</p>
          <TileRow cols="grid-cols-3">
            {designs.map((c) => (
              <TileItem key={c.id}>
                <DragTile id={c.id} name={c.name} image={c.imageUrl} price={c.price ? t("cases.extra", { price: money(c.price) }) : t("common.free")} selected={image?.ref === c.id} onTap={() => void pick(c.id)} />
              </TileItem>
            ))}
          </TileRow>
        </ToolSection>
      )}
      {!upload && designs.length === 0 && <p className="text-sm text-muted-foreground">{t("cases.noDesigns")}</p>}
    </div>
  );

  return (
    <StudioFrame
      category={category}
      subtitle={model ? `${model.name} · ${money(model.price)}` : t("cases.choosePhone")}
      onSave={saver.save}
      saving={saver.saving}
      saveBlocked={blocked}
      top={
        <a href={studioHref(category)} onClick={backIfPrevious} className="flex min-h-11 items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-secondary">
          <Icon name="square" size={16} className="text-primary" />
          <span className="min-w-0 flex-1 truncate font-semibold">{model?.name ?? t("cases.noPhone")}</span>
          <span className="font-semibold text-primary">{t("cases.changeModel")}</span>
        </a>
      }
      stage={stage}
      notice={notice}
      toolbar={toolbar}
      picker={picker}
      footer={{
        summary: `${model?.name ?? t("cases.noPhoneShort")} · ${image ? (image.name ?? t("cases.yourPhoto")) : t("cases.addPhotoOrDesign")}`,
        price: casePrice(d, model, byId),
        onPrimary: () => backOrNavigate(studioHref(category, "preview")),
        primaryBlocked: unavailable ?? (!image ? t("cases.addFirst") : null),
      }}
    />
  );
}

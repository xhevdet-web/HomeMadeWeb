import { useMemo, useRef, useState } from "react";
import type { Component } from "../../api/models";
import { Icon } from "../../components/Icon";
import { studioHref } from "../../data/homeCategories";
import { money } from "../../lib/format";
import { backIfPrevious, backOrNavigate } from "../../router";
import { BottomSheet } from "../../studio/BottomSheet";
import { DragTile, TileItem, TileRow, elementActions, useCanvasDrop } from "../../studio/canvasKit";
import { imageSize, corsImage } from "../../studio/capture";
import { elementsReducer, imageElement, type ElementsAction, type PlacedElement } from "../../studio/elements";
import { PlacementLayer, type LayerCommand } from "../../studio/PlacementLayer";
import { useSaveDesign, useStudioHistory } from "../../studio/StudioContext";
import { StageFrame, StudioFrame, StudioToolbar } from "../../studio/StudioFrame";
import { Tabs } from "../../studio/StudioShell";
import { TextTool } from "../../studio/TextTool";
import { useUndoShortcuts } from "../../studio/useHistory";
import { useDndHint, useIsPhone, useNotice } from "../../studio/ui";
import { CoachMark } from "../jewelry/JewelryParts";
import { componentById, stockState, type StudioProps } from "../data";
import { DraftBox } from "./GiftBox";
import { GIFT_GROUPS, boxGeometry, colorOf, giftGroups, captureGift, giftInput, giftPrice, groupOf, imageEls, packagingOf } from "./logic";
import i18n from "../../i18n";

// Re-renders with the app when the language changes.
const t = i18n.t.bind(i18n);

export function GiftStudio({ category, data }: StudioProps) {
  const history = useStudioHistory(category.id, "GIFT");
  const { state: d, dispatch: update } = history;
  useUndoShortcuts(history.undo, history.redo);
  const [notice, notify] = useNotice();
  const [coach, dismissCoach] = useDndHint();
  const phone = useIsPhone();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<string>("ALL");
  const [textOpen, setTextOpen] = useState(false);
  const stageRef = useRef<HTMLElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const byId = useMemo(() => componentById(data), [data]);
  const saver = useSaveDesign(category, async () => ({ input: giftInput(category, d, byId), files: { preview: await captureGift(d, data) } }));

  const packaging = packagingOf(d, data);
  const color = colorOf(d, packaging);
  const g = boxGeometry(packaging?.shape);
  const items = imageEls(d);
  const textEls = d.elements.filter((e) => e.kind === "text");
  const selected = d.elements.find((e) => e.id === selectedId) ?? null;
  const used = (ref: string) => items.filter((e) => e.ref === ref).length;
  const groups = GIFT_GROUPS.filter((grp) => data.components.some((c) => groupOf(c.type).key === grp.key));
  const shown = data.components.filter((c) => tab === "ALL" || groupOf(c.type).key === tab);

  const apply = (a: ElementsAction, merge?: string) => update((x) => ({ ...x, elements: elementsReducer(x.elements, a) }), merge);

  /** Tapped items appear near the middle of the box, each slightly offset (the app's dropPosition). */
  const nextSpot = () => {
    const step = items.length % 9;
    const cx = (g.inner.x0 + g.inner.x1) / 2;
    const cy = (g.inner.y0 + g.inner.y1) / 2;
    return { x: cx + ((step % 3) - 1) * 0.12, y: cy + (Math.floor(step / 3) - 1) * 0.1 };
  };

  const add = async (c: Component, at?: { x: number; y: number }) => {
    const stock = stockState(c, used(c.id));
    if (stock.disabled) return notify(c.stock <= 0 ? t("gifts.soldOut", { name: c.name }) : t("gifts.allUsed", { name: c.name }), "warn");
    if (!c.imageUrl) return notify(t("gifts.noPicture", { name: c.name }), "warn");
    const size = await imageSize(c.imageUrl);
    const el = imageElement({
      src: c.imageUrl,
      ref: c.id,
      name: c.name,
      aspect: size.height / size.width,
      // New pieces start at their group's base size (items 0.2, decorations 0.14, filler 0.28, containers 0.6).
      scale: groupOf(c.type).base * (100 / g.w),
      ...(at ?? nextSpot()),
    });
    apply({ type: "add", el });
    setSelectedId(el.id);
    notify(`${c.name} added to your gift.`);
    if (coach) dismissCoach();
  };

  const chip = useCanvasDrop(stageRef, boxRef, t("mugs.releaseToAdd"), (fx, fy, payload) => {
    const c = byId.get(payload.id);
    if (!c) return false;
    // Dropped exactly where the finger is; the layer then keeps it inside the box.
    void add(c, { x: fx, y: fy });
    return true;
  });

  const command = (cmd: LayerCommand, id: string) => {
    if (cmd === "duplicate") {
      const c = byId.get(d.elements.find((e) => e.id === id)?.ref ?? "");
      if (c && stockState(c, used(c.id)).disabled) return notify(t("gifts.allUsed", { name: c.name }), "warn");
    }
    if (cmd === "reset") return;
    apply({ type: cmd, id });
    if (cmd === "delete") setSelectedId(null);
  };

  const clear = () => {
    apply({ type: "clear" });
    setSelectedId(null);
    notify(t("studio.cleared"));
  };

  const empty = items.length === 0;
  const unavailable = !packaging ? t("gifts.chooseArrivalFirst") : null;
  const textTool = (
    <TextTool
      texts={textEls}
      selected={selected}
      onAdd={(el) => {
        apply({ type: "add", el: { ...el, y: (g.inner.y0 + g.inner.y1) / 2 - 0.1 } });
        setSelectedId(el.id);
        notify(t("gifts.messageAdded"));
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
      label={t("gifts.stageLabel", { name: category.name, count: items.length, texts: textEls.length })}
      chip={chip}
    >
      <div ref={boxRef} className="relative" style={{ width: `min(var(--stage-w), calc(var(--stage-h) * ${g.w / g.h}))` }}>
        <DraftBox draft={d} data={data}>
          <PlacementLayer
            elements={d.elements}
            label={t("gifts.contents")}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={(el: PlacedElement, merge) => apply({ type: "update", el }, merge)}
            onCommand={command}
            bounds={g.inner}
          />
        </DraftBox>
      </div>
    </StageFrame>
  );

  const toolbar = (
    <StudioToolbar
      {...history}
      onClear={clear}
      canClear={d.elements.length > 0}
      selection={
        selected
          ? {
              title: selected.kind === "text" ? t("mugs.text") : (selected.name ?? t("order.item")),
              image: selected.kind === "text" ? null : selected.src,
              onDone: () => setSelectedId(null),
              actions: [
                ...(selected.kind === "text" ? [{ icon: "pencil" as const, label: t("textTool.editText"), onClick: () => (phone ? setTextOpen(true) : setTab("TEXT")) }] : []),
                ...elementActions(selected, (el) => apply({ type: "update", el }), (cmd) => command(cmd, selected.id), { duplicate: selected.kind === "image" }),
              ],
            }
          : null
      }
    />
  );

  const picker = (
    <div className="flex flex-col gap-4">
      {coach && <CoachMark onDismiss={dismissCoach} text={t("gifts.coach")} />}
      <Tabs
        label={t("gifts.itemGroups")}
        value={tab}
        onChange={(id) => (id === "TEXT" && phone ? setTextOpen(true) : setTab(id))}
        tabs={[{ id: "ALL", label: t("create.groups.all") }, ...groups.map((grp) => ({ id: grp.key as string, label: t(`gifts.groups.${grp.key}`) })), { id: "TEXT", label: t("mugs.text") }]}
      />
      {tab === "TEXT" && !phone ? (
        textTool
      ) : shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t("gifts.emptyGroup")}</p>
      ) : (
        <TileRow>
          {shown.map((c) => {
            const stock = stockState(c, used(c.id));
            return (
              <TileItem key={c.id}>
                <DragTile id={c.id} name={c.name} image={c.imageUrl} price={money(c.price)} badge={stock.label} disabled={stock.disabled} onTap={() => void add(c)} />
              </TileItem>
            );
          })}
        </TileRow>
      )}

      {d.elements.length > 0 && (
        <section aria-label={t("gifts.inYourGift")}>
          <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">{t("gifts.inYourGift")}</p>
          <ul className="flex flex-wrap gap-2">
            {giftGroups(d.elements, byId).map((grp) => {
              const el = d.elements.find((e) => e.id === grp.ids[0]);
              const active = grp.ids.includes(selectedId ?? "");
              return (
                <li key={grp.key}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(grp.ids[(grp.ids.indexOf(selectedId ?? "") + 1) % grp.ids.length])}
                    aria-pressed={active}
                    className={`flex min-h-11 items-center gap-2 rounded-full border py-1 pr-3 pl-1 text-sm transition-colors ${active ? "border-primary bg-primary/10" : "border-border hover:bg-secondary"}`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-secondary">
                      {el?.kind === "text" ? <Icon name="type" size={14} /> : el?.src && <img {...corsImage} src={el.src} alt="" className="h-7 w-7 object-contain" draggable={false} />}
                    </span>
                    <span className="max-w-32 truncate">{grp.label}</span>
                    <span className="font-display text-xs font-semibold text-muted-foreground">×{grp.count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <BottomSheet title={selected?.kind === "text" ? t("textTool.editText") : t("mugs.addText")} open={phone && textOpen} onClose={() => setTextOpen(false)}>
        {textTool}
      </BottomSheet>
    </div>
  );

  return (
    <StudioFrame
      category={category}
      subtitle={packaging ? t("gifts.arrivesIn", { name: `${packaging.name}${color ? `, ${color.name}` : ""}` }) : t("gifts.choosePackaging")}
      onSave={saver.save}
      saving={saver.saving}
      saveBlocked={unavailable ?? (empty ? t("gifts.addItem") : null)}
      top={
        <a href={studioHref(category)} onClick={backIfPrevious} className="flex min-h-11 items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2 text-sm transition-colors hover:bg-secondary">
          {packaging?.imageUrl ? <img {...corsImage} src={packaging.imageUrl} alt="" className="h-8 w-8 object-contain" /> : <Icon name="package" size={18} className="text-primary" />}
          <span className="min-w-0 flex-1 truncate">
            {t("gifts.arrivesInLabel")} <span className="font-semibold">{packaging?.name ?? "—"}</span>
            {color ? `, ${color.name}` : ""}
          </span>
          <span className="font-semibold text-primary">{t("studio.change")}</span>
        </a>
      }
      stage={stage}
      notice={notice}
      toolbar={toolbar}
      picker={picker}
      footer={{
        summary: [t("gifts.items", { count: items.length }), ...(textEls.length ? [t("gifts.messages", { count: textEls.length })] : []), t("gifts.packagingPrice", { price: money((packaging?.price ?? 0) + (color?.priceAdjustment ?? 0)) })].join(" · "),
        price: giftPrice(d, data, byId),
        onPrimary: () => backOrNavigate(studioHref(category, "preview")),
        primaryBlocked: unavailable ?? (empty ? t("gifts.addItem") : null),
      }}
    />
  );
}

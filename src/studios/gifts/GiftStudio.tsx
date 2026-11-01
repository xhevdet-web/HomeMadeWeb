import { useState } from "react";
import { money } from "../../data/mock";
import { GIFT_ITEMS, getGiftItem, stockState, type GiftGroup, type GiftItem } from "../../data/studioCatalog";
import { navigate } from "../../router";
import { Artwork } from "../../studio/artworks";
import { elementsReducer, imageElement, type ElementsAction, type PlacedElement } from "../../studio/elements";
import { PlacementLayer, type LayerCommand } from "../../studio/PlacementLayer";
import { useDesignActions, useStudioHistory } from "../../studio/StudioContext";
import { BaseChip, CanvasToolbar, PickerCard, Stage, StudioLayout, StudioShell, Tabs, ToolSection } from "../../studio/StudioShell";
import { StudioSummaryBar } from "../../studio/StudioSummaryBar";
import { TextTool } from "../../studio/TextTool";
import { useToast } from "../../studio/Toasts";
import { GiftBox } from "./GiftBox";
import { boxGeometry, giftGroups, giftInfo, giftPrice, itemElements, packagingLabel, textElements } from "./logic";

type Tab = GiftGroup | "Text";
const TABS: Tab[] = ["Items", "Decorations", "Filler", "Bags & boxes", "Text"];
const jitter = (n: number) => (Math.random() - 0.5) * n;

export function GiftStudio() {
  const history = useStudioHistory("gifts");
  const { state: d, dispatch: update } = history;
  const toast = useToast();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Items");
  const actions = useDesignActions("gifts", giftInfo(d));

  const g = boxGeometry(d.shape);
  const items = itemElements(d);
  const texts = textElements(d);
  const selected = d.elements.find((e) => e.id === selectedId) ?? null;
  const used = (ref: string) => items.filter((e) => e.ref === ref).length;

  const apply = (a: ElementsAction, merge?: string) => update((x) => ({ ...x, elements: elementsReducer(x.elements, a) }), merge);

  const add = (item: GiftItem) => {
    const stock = stockState(item.stock, used(item.id));
    if (stock.disabled) return toast(`${item.name}: ${stock.label}.`);
    const el = imageElement({
      art: item.art,
      ref: item.id,
      aspect: 1,
      scale: (item.size * 100) / g.w,
      x: 0.5 + jitter(0.3),
      y: 0.6 + jitter(0.2),
      rotation: Math.round(jitter(16)),
    });
    apply({ type: "add", el });
    setSelectedId(el.id);
    toast(`${item.name} added to your gift.`);
  };

  const command = (cmd: LayerCommand, id: string) => {
    if (cmd === "duplicate") {
      const item = getGiftItem(d.elements.find((e) => e.id === id)?.ref);
      if (item && stockState(item.stock, used(item.id)).disabled) return toast(`All ${item.stock} ${item.name.toLowerCase()} in use.`);
    }
    if (cmd === "reset") return;
    apply({ type: cmd, id });
    if (cmd === "delete") setSelectedId(null);
  };

  const clear = () => {
    apply({ type: "clear" });
    setSelectedId(null);
    toast("Canvas cleared. Undo to bring it back.");
  };

  const groups = giftGroups(d.elements);
  const empty = items.length === 0;

  const stage = (
    <Stage label={`Gift box with ${items.length} items and ${texts.length} messages`} toolbar={<CanvasToolbar {...history} onClear={clear} canClear={d.elements.length > 0} />}>
      <div className={`w-full ${d.shape === "rect" ? "max-w-[620px]" : "max-w-[460px]"}`}>
        <GiftBox draft={d}>
          <PlacementLayer
            elements={d.elements}
            label="Gift box contents"
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={(el: PlacedElement, merge) => apply({ type: "update", el }, merge)}
            onCommand={command}
            bounds={g.inner}
          />
        </GiftBox>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Drag to move · corner handle to resize and rotate · everything stays inside the box
        </p>
      </div>
    </Stage>
  );

  const tools = (
    <>
      <BaseChip label="Packaging" value={packagingLabel(d)} href="#/studios/gifts" />

      <ToolSection title="Fill your box">
        <Tabs label="Item groups" value={tab} onChange={setTab} tabs={TABS.map((t) => ({ id: t, label: t }))} />
        <div className="mt-4">
          {tab === "Text" ? (
            <TextTool
              texts={texts}
              selected={selected}
              onAdd={(el) => {
                apply({ type: "add", el });
                setSelectedId(el.id);
                toast("Message added to your gift.");
              }}
              onUpdate={(el, merge) => apply({ type: "update", el }, merge)}
              onDone={() => setSelectedId(null)}
            />
          ) : (
            <ul className="grid grid-cols-3 gap-2">
              {GIFT_ITEMS.filter((i) => i.group === tab).map((item) => {
                const stock = stockState(item.stock, used(item.id));
                return (
                  <li key={item.id}>
                    <PickerCard title={item.name} price={money(item.price)} badge={stock.label} disabled={stock.disabled} onClick={() => add(item)}>
                      <Artwork id={item.art} className="h-full w-full" />
                    </PickerCard>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </ToolSection>

      <ToolSection title="In your gift" aside={`${items.length} items`}>
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Your box is empty. Tap an item to put it inside.</p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {groups.map((grp) => (
              <li key={grp.key}>
                <button
                  type="button"
                  onClick={() => setSelectedId(grp.ids[0])}
                  aria-pressed={grp.ids.includes(selectedId ?? "")}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-secondary/50 ${
                    grp.ids.includes(selectedId ?? "") ? "bg-secondary/60" : ""
                  }`}
                >
                  <span className="flex-1 truncate">{grp.label}</span>
                  <span className="text-xs text-primary">{grp.price ? money(grp.price * grp.count) : "Free"}</span>
                  <span className="w-8 text-right font-display font-semibold text-muted-foreground">×{grp.count}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </ToolSection>
    </>
  );

  return (
    <StudioShell slug="gifts" step={1}>
      <StudioLayout
        stage={stage}
        tools={tools}
        bar={
          <StudioSummaryBar
            summary={`${items.length} items${texts.length ? ` · ${texts.length} message${texts.length > 1 ? "s" : ""}` : ""}`}
            price={giftPrice(d)}
            onSave={actions.save}
            saveBlocked={empty ? "Add at least one item to your design." : null}
            onPrimary={() => navigate("#/studios/gifts/preview")}
            primaryBlocked={empty ? "Add at least one item to your design." : null}
          />
        }
      />
    </StudioShell>
  );
}

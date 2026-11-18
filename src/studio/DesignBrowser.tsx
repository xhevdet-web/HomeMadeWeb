import { useMemo, useState } from "react";
import i18n from "../i18n";
import type { Component } from "../api/models";
import { Icon } from "../components/Icon";
import { money } from "../lib/format";
import { typeLabel } from "../studios/data";
import { DragTile, TileItem, TileRow } from "./canvasKit";

// Re-renders with the app when the language changes.
const t = i18n.t.bind(i18n);

/** A search box appears once there are more designs than fit on one screen of the panel. */
const SEARCH_FROM = 9;

/**
 * The studio's design library: a row of type filters (only when the designs have two or more
 * types), a search box for long lists, and compact tiles that are tapped or dragged onto the
 * product. Paid designs show their extra price; free ones show nothing.
 */
export function DesignBrowser({
  designs,
  selectedRef,
  onPick,
  cols = "grid-cols-3",
  badge,
  price = (c) => (c.price ? `+${money(c.price)}` : undefined),
}: {
  designs: Component[];
  /** The library design currently on the product, highlighted. */
  selectedRef?: string | null;
  onPick: (id: string) => void;
  cols?: string;
  /** A note on a tile, e.g. "Added"; it takes the price's place on the picture. */
  badge?: (c: Component) => string | null;
  /** The tile's price; by default only paid designs show one, as "+€1.00". */
  price?: (c: Component) => string | undefined;
}) {
  const types = useMemo(() => [...new Set(designs.map((c) => c.type?.trim().toUpperCase()).filter((v): v is string => !!v))], [designs]);
  const [type, setType] = useState("");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = designs.filter((c) => (!type || c.type?.trim().toUpperCase() === type) && (!q || c.name.toLowerCase().includes(q)));
  const counts = (v: string) => (v ? designs.filter((c) => c.type?.trim().toUpperCase() === v).length : designs.length);

  return (
    <div className="flex flex-col gap-3">
      {designs.length >= SEARCH_FROM && (
        <label className="relative block">
          <span className="sr-only">{t("studio.searchDesigns")}</span>
          <Icon name="search" size={15} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("studio.searchDesigns")}
            className="h-10 w-full rounded-xl border border-border bg-background pr-3 pl-9 text-sm text-foreground transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/40 focus:outline-none"
          />
        </label>
      )}
      {types.length > 1 && (
        <div role="group" aria-label={t("studio.designType")} className="-mx-1 flex gap-1.5 overflow-x-auto overscroll-x-contain px-1 pb-0.5 [scrollbar-width:none]">
          {["", ...types].map((v) => (
            <button
              key={v || "all"}
              type="button"
              aria-pressed={type === v}
              onClick={() => setType(v)}
              className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold whitespace-nowrap transition-colors ${
                type === v ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
              }`}
            >
              {v ? typeLabel(v) : t("create.groups.all")}
              <span className={`text-[10px] ${type === v ? "opacity-80" : "opacity-60"}`}>{counts(v)}</span>
            </button>
          ))}
        </div>
      )}
      {shown.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border py-6 text-center text-sm text-muted-foreground">{t("studio.noDesignMatch")}</p>
      ) : (
        <TileRow cols={cols}>
          {shown.map((c) => (
            <TileItem key={c.id}>
              <DragTile id={c.id} name={c.name} image={c.imageUrl} price={price(c)} badge={badge?.(c)} selected={!!selectedRef && selectedRef === c.id} onTap={() => onPick(c.id)} size="sm" />
            </TileItem>
          ))}
        </TileRow>
      )}
    </div>
  );
}

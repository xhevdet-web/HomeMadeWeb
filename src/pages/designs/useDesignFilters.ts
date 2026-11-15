import { useEffect, useMemo, useReducer, useState } from "react";
import type { SavedDesign } from "../../api/designs";
import { updateQuery } from "../../router";
import { categoryKeyOf, categoryLabel, hasPreview, searchText } from "./designUtils";

export const SORTS = ["new", "old", "pasc", "pdesc", "name"] as const;
export type Sort = (typeof SORTS)[number];
export type View = "grid" | "list";

export const PAGE_SIZE = 15;
const VIEW_KEY = "hc.designs.view";
const SEARCH_DELAY_MS = 200;

export interface Filters {
  cat: string;
  q: string;
  sort: Sort;
  view: View;
  /** Only designs without a preview picture (from the banner's "Show them"). */
  missing: boolean;
}

function storedView(): View {
  try {
    return localStorage.getItem(VIEW_KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}

/** Filters live in the URL (`#/designs?cat=…&q=…&sort=…&view=…&missing=1`) so refresh, Back and shared links keep them. */
export function readFilters(query: URLSearchParams): Filters {
  const sort = query.get("sort") as Sort | null;
  const view = query.get("view");
  return {
    cat: query.get("cat") ?? "all",
    q: query.get("q") ?? "",
    sort: sort && SORTS.includes(sort) ? sort : "new",
    // No view in the URL: the remembered choice.
    view: view === "list" ? "list" : view === "grid" ? "grid" : storedView(),
    missing: query.get("missing") === "1",
  };
}

function toHash(f: Filters) {
  const params = new URLSearchParams();
  if (f.cat !== "all") params.set("cat", f.cat);
  if (f.q.trim()) params.set("q", f.q.trim());
  if (f.sort !== "new") params.set("sort", f.sort);
  // Grid is the default; list is written so links and refresh keep it (it's also remembered).
  if (f.view === "list") params.set("view", "list");
  if (f.missing) params.set("missing", "1");
  const qs = params.toString();
  return `#/designs${qs ? `?${qs}` : ""}`;
}

const sorters: Record<Sort, (a: SavedDesign, b: SavedDesign) => number> = {
  new: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  old: (a, b) => a.updatedAt.localeCompare(b.updatedAt),
  pasc: (a, b) => a.product.price - b.product.price,
  pdesc: (a, b) => b.product.price - a.product.price,
  name: (a, b) => a.name.localeCompare(b.name, "sq"),
};

export interface Chip {
  key: string;
  label: string;
  count: number;
}

/** Filtering, sorting and paging for My designs, kept in sync with the URL. */
export function useDesignFilters(designs: SavedDesign[], query: URLSearchParams) {
  const filters = readFilters(query);
  const [search, setSearchInput] = useState(filters.q);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  // The URL follows the search box after a short pause, so typing doesn't flood the history.
  useEffect(() => {
    if (search === filters.q) return;
    const timer = window.setTimeout(() => updateQuery(toHash({ ...filters, q: search }), { replace: true }), SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Back / Forward or "Clear filters" change the URL: the box follows it.
  useEffect(() => setSearchInput(filters.q), [filters.q]);

  // Any filter change starts the list from the top again.
  useEffect(() => setLimit(PAGE_SIZE), [filters.cat, filters.q, filters.sort, filters.missing]);

  const set = (changes: Partial<Filters>) => {
    const next = { ...filters, ...changes };
    if (changes.view) {
      try {
        localStorage.setItem(VIEW_KEY, changes.view);
      } catch {
        // Storage blocked: the URL still holds the view.
      }
      // Grid ↔ list may leave the URL as it was (grid isn't written), so redraw either way.
      rerender();
    }
    updateQuery(toHash(next));
  };

  const result = useMemo(() => {
    const q = filters.q.trim().toLocaleLowerCase("sq");
    const base = filters.missing ? designs.filter((d) => !hasPreview(d.product)) : designs;
    const searched = q ? base.filter((d) => searchText(d).includes(q)) : base;

    // Chips count what the current search shows, and hide categories with nothing in them.
    const counts = new Map<string, Chip>();
    for (const d of searched) {
      const key = categoryKeyOf(d.product);
      const chip = counts.get(key) ?? { key, label: categoryLabel(d.product), count: 0 };
      chip.count++;
      counts.set(key, chip);
    }
    const chips = [...counts.values()].sort((a, b) => a.label.localeCompare(b.label, "sq"));

    const filtered = (filters.cat === "all" ? searched : searched.filter((d) => categoryKeyOf(d.product) === filters.cat)).slice().sort(sorters[filters.sort]);
    return { chips, allCount: searched.length, filtered, missingCount: designs.filter((d) => !hasPreview(d.product)).length };
  }, [designs, filters.q, filters.cat, filters.sort, filters.missing]);

  return {
    filters,
    search,
    setSearch: setSearchInput,
    set,
    ...result,
    shown: result.filtered.slice(0, limit),
    remaining: Math.max(0, result.filtered.length - limit),
    showMore: () => setLimit((n) => n + PAGE_SIZE),
    active: filters.cat !== "all" || !!filters.q.trim() || filters.missing,
    clear: () => {
      setSearchInput("");
      updateQuery(toHash({ ...filters, cat: "all", q: "", missing: false }));
    },
  };
}

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { categories as fetchCategories, type ProductPageQuery } from "../api/catalog";
import type { Category, Product } from "../api/models";
import { Button } from "../components/Button";
import { inputClass } from "../components/Controls";
import { Icon } from "../components/Icon";
import { Page, PageHeader, SectionLabel } from "../components/Page";
import { ProductCard } from "../components/ProductCard";
import { ProductViewer } from "../components/ProductViewer";
import { studioSlug } from "../data/homeCategories";
import { CATALOG_TTL, useApi } from "../hooks/useApi";
import { categoryIcon, loadProductPage } from "../lib/products";
import { updateQuery } from "../router";

/** Products per page. */
export const PAGE_SIZE = 12;
const SEARCH_DELAY = 250;

// The filters live in the URL (shareable, and Back works): ?kategoria=byzylyk&lloji=gatshme&faqja=2
const P = { category: "kategoria", type: "lloji", search: "kerko", sort: "rendit", hideSoldOut: "fshih-shiturat", page: "faqja" } as const;
const TYPES = { ready: "gatshme", custom: "porosi" } as const;
const SORTS = { newest: "te-rejat", priceAsc: "cmimi-rritje", priceDesc: "cmimi-zbritje" } as const;
type TypeKey = "all" | keyof typeof TYPES;
type SortKey = keyof typeof SORTS;

const keyOf = <T extends Record<string, string>>(map: T, value: string | null) => (Object.keys(map) as (keyof T)[]).find((k) => map[k] === value);

/** Page numbers with gaps: 1 … 4 5 6 … 12. */
function pageList(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current - 1, current, current + 1].filter((p) => p >= 1 && p <= total));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? ["gap" as const, p] : [p]));
}

function Breadcrumb() {
  const { t } = useTranslation();
  return (
    <nav aria-label={t("products.breadcrumb")} className="animate-rise mb-6 text-sm">
      <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground">
        <li>
          <a href="#/" className="rounded transition-colors hover:text-foreground">
            {t("products.home")}
          </a>
        </li>
        <li aria-hidden="true">/</li>
        <li aria-current="page" className="font-semibold text-foreground">
          {t("products.crumb")}
        </li>
      </ol>
    </nav>
  );
}

function Promo({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 ${className}`}>
      <p className="font-display text-xl font-semibold">{t("products.promoTitle")}</p>
      <p className="mt-2 text-sm text-muted-foreground">{t("products.promoText")}</p>
      <a href="#/studios" className="mt-4 flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
        {t("products.promoAction")}
      </a>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={title}>
      <SectionLabel as="p">{title}</SectionLabel>
      {children}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card" aria-hidden="true">
      <div className="aspect-square animate-pulse bg-[var(--product-stage)] opacity-20" />
      <div className="space-y-3 px-5 py-[18px]">
        <div className="h-3 w-1/3 animate-pulse rounded bg-secondary" />
        <div className="h-5 w-2/3 animate-pulse rounded bg-secondary" />
        <div className="h-11 animate-pulse rounded-xl bg-secondary" />
      </div>
    </div>
  );
}

export default function ProductsPage({ query }: { query: URLSearchParams }) {
  const { t } = useTranslation();
  // Same key as the studios list, so the two share one cached request.
  const categoriesApi = useApi("categories", fetchCategories, { ttl: CATALOG_TTL });
  const [open, setOpen] = useState<number | null>(null);
  const resultsTop = useRef<HTMLDivElement>(null);

  /* ---- Filters from the URL ---- */
  const categories = useMemo(() => [...(categoriesApi.data ?? [])].sort((a, b) => a.sortOrder - b.sortOrder), [categoriesApi.data]);
  const bySlug = useMemo(() => new Map(categories.map((c) => [studioSlug(c), c])), [categories]);
  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const category = bySlug.get(query.get(P.category) ?? "") ?? null;
  const type: TypeKey = keyOf(TYPES, query.get(P.type)) ?? "all";
  const sort: SortKey = keyOf(SORTS, query.get(P.sort)) ?? "newest";
  const hideSoldOut = query.get(P.hideSoldOut) === "1";
  const search = (query.get(P.search) ?? "").trim();
  const filtering = !!category || type !== "all" || hideSoldOut || !!search;

  /** Changes some filters; any filter change goes back to page 1. */
  const setFilters = (changes: Partial<Record<keyof typeof P, string | null>>, { replace = false } = {}) => {
    const next = new URLSearchParams(query);
    for (const [key, value] of Object.entries(changes)) {
      const name = P[key as keyof typeof P];
      if (value) next.set(name, value);
      else next.delete(name);
    }
    if (!("page" in changes)) next.delete(P.page);
    const qs = next.toString();
    updateQuery(`#/products${qs ? `?${qs}` : ""}`, { replace });
  };
  const clearFilters = () => {
    setTerm("");
    updateQuery(sort === "newest" ? "#/products" : `#/products?${P.sort}=${SORTS[sort]}`);
  };

  // The search box follows the URL (Back, links) and writes to it after a short pause.
  const [term, setTerm] = useState(search);
  useEffect(() => setTerm(search), [search]);
  useEffect(() => {
    if (term.trim() === search) return;
    const timer = window.setTimeout(() => setFilters({ search: term.trim() || null }, { replace: true }), SEARCH_DELAY);
    return () => window.clearTimeout(timer);
    // Re-checked when the URL's search changes too, so a pending write never undoes "Clear filters".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, search]);

  /* ---- The list: one page, filtered, counted and paged by the API ---- */
  const categoryOf = (p: Product): Category | null => byId.get(p.categoryId) ?? null;
  const page = Math.max(1, Math.floor(Number(query.get(P.page))) || 1);
  const apiQuery: ProductPageQuery = {
    page,
    limit: PAGE_SIZE,
    sort: sort === "priceAsc" ? "price_asc" : sort === "priceDesc" ? "price_desc" : undefined,
    type: type === "all" ? undefined : type,
    inStock: hideSoldOut || undefined,
    search: search || undefined,
    categoryId: category?.id,
  };
  // Waits for the categories: the URL names a category by its slug, and they are needed if the
  // page has to be made in the browser (an API from before server-side paging).
  const productsApi = useApi(
    categoriesApi.data ? `products:page:${JSON.stringify(apiQuery)}` : null,
    (signal) => loadProductPage(apiQuery, categoriesApi.data ?? [], signal),
    { ttl: CATALOG_TTL },
  );

  const meta = productsApi.data?.meta;
  const shown = productsApi.data?.data ?? [];
  const total = meta?.total ?? 0;
  const counts = meta?.counts ?? { all: 0, ready: 0, custom: 0 };
  const pages = Math.max(1, meta?.totalPages ?? 1);
  const from = shown.length ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = shown.length ? from + shown.length - 1 : 0;

  // An old link to a page that no longer exists: go to the last page instead.
  useEffect(() => {
    if (meta && meta.total > 0 && page > meta.totalPages) setFilters({ page: meta.totalPages > 1 ? String(meta.totalPages) : null }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta, page]);

  const goToPage = (n: number) => {
    setFilters({ page: n > 1 ? String(n) : null });
    resultsTop.current?.scrollIntoView({ block: "start" });
  };

  // The first load shows placeholders; later changes keep the current cards (dimmed) until the new page arrives.
  const loading = !productsApi.data && (productsApi.loading || categoriesApi.loading || !categoriesApi.data) && !categoriesApi.error;
  const refreshing = !!productsApi.data && productsApi.loading;
  const failed = !productsApi.loading && !categoriesApi.loading && (productsApi.error || categoriesApi.error);
  const retry = () => {
    if (productsApi.error) productsApi.retry();
    if (categoriesApi.error) categoriesApi.retry();
  };

  const typeButton = (key: TypeKey) => {
    const active = type === key;
    return (
      <button
        key={key}
        type="button"
        aria-pressed={active}
        onClick={() => setFilters({ type: key === "all" ? null : TYPES[key] })}
        className={`flex min-h-11 items-center justify-between gap-4 rounded-xl border px-4 text-left text-sm font-semibold transition-colors ${
          active ? "border-primary bg-primary/10 text-foreground" : "border-transparent text-foreground/85 hover:bg-secondary"
        }`}
      >
        {t(`products.types.${key}`)}
        <span className={`text-xs ${active ? "text-primary" : "text-muted-foreground"}`}>{counts[key]}</span>
      </button>
    );
  };

  const tile = (c: Category | null) => {
    const active = (category?.id ?? null) === (c?.id ?? null);
    return (
      <li key={c?.id ?? "all"}>
        <button
          type="button"
          aria-pressed={active}
          onClick={() => setFilters({ category: c ? studioSlug(c) : null })}
          className={`flex h-full min-h-28 w-full flex-col items-center justify-center gap-3 rounded-2xl border px-3 py-4 text-center text-sm font-semibold transition-colors ${
            active ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"
          }`}
        >
          <span className={`flex h-12 w-12 items-center justify-center rounded-full ${active ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}>
            <Icon name={c ? categoryIcon(c) : "grid"} size={20} />
          </span>
          <span className="leading-tight">{c ? c.name : t("products.all")}</span>
        </button>
      </li>
    );
  };

  return (
    <Page>
      <Breadcrumb />
      <PageHeader
        eyebrow={t("products.eyebrow")}
        title={
          <>
            {t("products.title")} <em className="font-normal text-primary">{t("products.titleAccent")}</em>
          </>
        }
        intro={t("products.intro")}
      />

      {/* Category tiles */}
      <ul aria-label={t("products.categories")} className="mt-10 grid grid-cols-[repeat(auto-fill,minmax(min(100%,128px),1fr))] gap-3">
        {tile(null)}
        {categories.map((c) => tile(c))}
      </ul>

      <div className="mt-10 flex flex-wrap gap-x-8 gap-y-10 lg:flex-nowrap">
        {/* Filters: above the products on phones, beside them from lg. */}
        <aside className="flex w-full flex-col gap-7 lg:w-[220px] lg:shrink-0" aria-label={t("products.filters")}>
          <div>
            <label htmlFor="products-search" className="mb-3 block text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
              {t("products.search")}
            </label>
            <div className="relative">
              <Icon name="search" size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                id="products-search"
                type="search"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder={t("products.searchPlaceholder")}
                className={`${inputClass} min-h-11 pl-10`}
              />
            </div>
          </div>

          <FilterGroup title={t("products.type")}>
            <div className="flex flex-wrap gap-1 lg:flex-col">{(["all", "ready", "custom"] as const).map(typeButton)}</div>
          </FilterGroup>

          <FilterGroup title={t("products.availability")}>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={hideSoldOut}
                onChange={(e) => setFilters({ hideSoldOut: e.target.checked ? "1" : null })}
                className="h-5 w-5 shrink-0 cursor-pointer accent-[var(--primary)]"
              />
              {t("products.hideSoldOut")}
            </label>
          </FilterGroup>

          {filtering && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:bg-secondary"
            >
              <Icon name="close" size={14} /> {t("products.clearFilters")}
            </button>
          )}

          <Promo className="hidden lg:block" />
        </aside>

        {/* Products */}
        <div ref={resultsTop} className="min-w-0 flex-1 scroll-mt-28">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {loading ? t("common.loading") : total ? t("products.showing", { from, to, count: total }) : t("products.showingNone")}
            </p>
            <div className="flex items-center gap-3">
              <label htmlFor="products-sort" className="text-sm text-muted-foreground">
                {t("products.sort")}
              </label>
              <select
                id="products-sort"
                value={sort}
                onChange={(e) => setFilters({ sort: e.target.value === "newest" ? null : SORTS[e.target.value as SortKey] })}
                className="min-h-11 cursor-pointer rounded-xl border border-border bg-card px-3 pr-8 text-sm font-semibold text-foreground focus:border-primary focus:ring-2 focus:ring-primary/40 focus:outline-none"
              >
                {(Object.keys(SORTS) as SortKey[]).map((key) => (
                  <option key={key} value={key}>
                    {t(`products.sorts.${key}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <ul className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-6" aria-busy="true">
              {Array.from({ length: 6 }, (_, i) => (
                <li key={i}>
                  <SkeletonCard />
                </li>
              ))}
            </ul>
          ) : failed ? (
            <div role="alert" className="mt-6 rounded-2xl border border-border bg-card p-10 text-center">
              <p className="font-display text-2xl font-semibold">{t("products.loadError")}</p>
              <p className="mt-2 text-sm text-muted-foreground">{productsApi.error ?? categoriesApi.error}</p>
              <Button className="mt-6" onClick={retry}>
                {t("common.retry")}
              </Button>
            </div>
          ) : shown.length ? (
            <ul
              aria-busy={refreshing}
              className={`mt-6 grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-6 transition-opacity ${refreshing ? "opacity-60" : ""}`}
            >
              {shown.map((p, i) => (
                <li key={p.id}>
                  <ProductCard product={p} category={categoryOf(p)} onOpen={() => setOpen(i)} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-6 rounded-2xl border border-border bg-card px-6 py-14 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-primary">
                <Icon name="search" size={22} />
              </span>
              <p className="mt-5 font-display text-2xl font-semibold">{t("products.emptyTitle")}</p>
              <p className="mt-2 text-sm text-muted-foreground">{t("products.emptyText")}</p>
              {filtering && (
                <Button className="mt-6" onClick={clearFilters}>
                  {t("products.clearFilters")}
                </Button>
              )}
            </div>
          )}

          {!loading && pages > 1 && (
            <nav aria-label={t("products.pagination")} className="mt-10 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page === 1}
                aria-label={t("products.previous")}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-border transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <Icon name="chevronLeft" size={16} />
              </button>
              {pageList(page, pages).map((n, i) =>
                n === "gap" ? (
                  <span key={`gap-${i}`} className="px-1 text-muted-foreground" aria-hidden="true">
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    type="button"
                    onClick={() => goToPage(n)}
                    aria-current={n === page ? "page" : undefined}
                    aria-label={t("products.page", { page: n })}
                    className={`flex h-11 w-11 items-center justify-center rounded-xl border text-sm font-semibold transition-colors ${
                      n === page ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"
                    }`}
                  >
                    {n}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page === pages}
                aria-label={t("products.next")}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-border transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <Icon name="chevronRight" size={16} />
              </button>
            </nav>
          )}

          <Promo className="mt-10 lg:hidden" />
        </div>
      </div>

      {open !== null && shown[open] && <ProductViewer products={shown} index={open} categoryOf={categoryOf} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </Page>
  );
}

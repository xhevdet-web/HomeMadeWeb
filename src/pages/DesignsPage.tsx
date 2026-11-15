import { useState } from "react";
import { useTranslation } from "react-i18next";
import { savedDesigns, type SavedDesign } from "../api/designs";
import { Button, ButtonLink } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Icon } from "../components/Icon";
import { Page, PageHeader } from "../components/Page";
import { studioBuilder, studioHref, useStudioCategories } from "../data/homeCategories";
import { useApi } from "../hooks/useApi";
import { LoadError } from "../studio/StudioShell";
import { DesignActionsMenu, usePhone, type MenuTarget } from "./designs/DesignActionsMenu";
import { DesignCard, DesignCardSkeleton, DesignRow } from "./designs/DesignCard";
import { DeleteDesignDialog, RenameDesignDialog } from "./designs/DesignDialogs";
import { bannerClosed, DesignsToolbar, MissingPreviewBanner } from "./designs/DesignsToolbar";
import { useDesignActions } from "./designs/useDesignActions";
import { useDesignFilters } from "./designs/useDesignFilters";

/**
 * "My designs": only the designs the customer explicitly saved with "Save design" in a studio
 * (never orders or catalog products). Search, sort, category filters and grid/list live in the
 * URL; rename, duplicate and delete (with undo) are in each design's ⋯ menu.
 */

// grid-cols-1 (minmax(0, 1fr)) so a long name never widens a phone row past the screen.
const GRID = "grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:gap-5";

function NewDesignButton({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <ButtonLink href="#/studios" glow className={className}>
      <Icon name="plus" size={18} />
      {t("designs.new")}
    </ButtonLink>
  );
}

function NoResults({ onClear }: { onClear: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-white/14 px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#18223A] text-muted-foreground">
        <Icon name="search" size={24} />
      </span>
      <h2 className="mt-5 font-display text-2xl font-semibold">{t("designs.noResultsTitle")}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{t("designs.noResultsText")}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button variant="secondary" size="sm" onClick={onClear}>
          {t("designs.clearFilters")}
        </Button>
        <ButtonLink href="#/studios" size="sm">
          {t("designs.openStudio")}
        </ButtonLink>
      </div>
    </div>
  );
}

export default function DesignsPage({ query }: { query: URLSearchParams }) {
  const { t } = useTranslation();
  const phone = usePhone();
  const categories = useStudioCategories();
  const { data, loading, error, retry, setData } = useApi("saved-designs", savedDesigns);
  const designs = data ?? [];
  const f = useDesignFilters(designs, query);
  const actions = useDesignActions(setData);

  const [menu, setMenu] = useState<MenuTarget | null>(null);
  const [renaming, setRenaming] = useState<SavedDesign | null>(null);
  const [deleting, setDeleting] = useState<SavedDesign | null>(null);
  const [bannerHidden, setBannerHidden] = useState(bannerClosed);

  const editHref = (saved: SavedDesign) => {
    const category = categories.data?.find((c) => c.id === saved.product.categoryId);
    return category && studioBuilder(category) ? `${studioHref(category, "design")}?saved=${saved.id}` : null;
  };
  const cardProps = (saved: SavedDesign) => ({
    saved,
    editHref: editHref(saved),
    orderHref: `#/checkout?design=${saved.productId}`,
    menuOpen: menu?.saved.id === saved.id,
    onMenu: (anchor: HTMLElement) => setMenu((m) => (m?.saved.id === saved.id ? null : { saved, anchor })),
  });

  const list = f.filters.view === "list" && !phone;

  return (
    <Page>
      <div className="pb-24 sm:pb-0">
        <PageHeader
          eyebrow={t("designs.eyebrow")}
          title={
            <>
              <span className="sm:hidden">
                {t("designs.titleShort")} <em>{t("designs.titleShortAccent")}</em>
              </span>
              <span className="hidden sm:inline">
                {t("designs.title")} <em>{t("designs.titleAccent")}</em>
              </span>
            </>
          }
          intro={t("designs.intro")}
          aside={
            // Phones use the sticky button at the bottom instead.
            <span className="hidden sm:block">
              <NewDesignButton className="h-[46px]" />
            </span>
          }
        />

        <div className="mt-10 flex flex-col gap-6">
          {loading && !data && (
            <ul className={GRID} role="status" aria-label={t("designs.loading")}>
              {Array.from({ length: 8 }, (_, i) => (
                <DesignCardSkeleton key={i} />
              ))}
            </ul>
          )}
          {error && <LoadError message={error} onRetry={retry} />}

          {data && designs.length === 0 && (
            <EmptyState icon="bookmark" title={t("designs.emptyTitle")} text={t("designs.emptyText")} action={{ href: "#/studios", label: t("designs.emptyAction") }} />
          )}

          {data && designs.length > 0 && (
            <>
              <DesignsToolbar filters={f.filters} search={f.search} onSearch={f.setSearch} onChange={f.set} chips={f.chips} allCount={f.allCount} />

              {f.missingCount > 0 && !bannerHidden && !f.filters.missing && (
                <MissingPreviewBanner count={f.missingCount} onShow={() => f.set({ missing: true, cat: "all" })} onClose={() => setBannerHidden(true)} />
              )}

              <p className="text-[13px] text-[#7D879E]" aria-live="polite">
                {t("designs.summary", { shown: f.shown.length, total: f.filtered.length })}
              </p>

              {f.filtered.length === 0 ? (
                <NoResults onClear={f.clear} />
              ) : list ? (
                <ul className="flex flex-col gap-2.5">
                  {f.shown.map((saved) => (
                    <DesignRow key={saved.id} {...cardProps(saved)} />
                  ))}
                </ul>
              ) : (
                <ul className={GRID}>
                  {f.shown.map((saved) => (
                    <DesignCard key={saved.id} {...cardProps(saved)} />
                  ))}
                </ul>
              )}

              {f.remaining > 0 && (
                <div className="flex justify-center">
                  <Button variant="secondary" size="sm" onClick={f.showMore}>
                    {t("designs.more", { count: f.remaining })}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Phones: "New design" stays within reach at the bottom of the screen. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/8 bg-background/95 px-4 pt-3 backdrop-blur-md sm:hidden" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        <NewDesignButton className="h-[50px] w-full" />
      </div>

      <DesignActionsMenu
        target={menu}
        onClose={() => setMenu(null)}
        actions={{
          editHref,
          rename: setRenaming,
          duplicate: (saved) => void actions.duplicate(saved),
          remove: setDeleting,
        }}
      />
      <RenameDesignDialog saved={renaming} onCancel={() => setRenaming(null)} onSave={(name) => actions.rename(renaming!, name)} />
      <DeleteDesignDialog
        saved={deleting}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) actions.remove(deleting, designs.indexOf(deleting));
          setDeleting(null);
        }}
      />
    </Page>
  );
}

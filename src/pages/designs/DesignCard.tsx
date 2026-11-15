import { useTranslation } from "react-i18next";
import type { SavedDesign } from "../../api/designs";
import { ButtonLink } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { categoryIconOf, categoryLabel, componentsLine, formatPrice, formatSavedDate, hasPreview, variantOf } from "./designUtils";

export interface CardProps {
  saved: SavedDesign;
  /** Studio link to continue this design; null when its studio is no longer available. */
  editHref: string | null;
  orderHref: string;
  menuOpen: boolean;
  onMenu: (anchor: HTMLElement) => void;
}

/** The preview at ~70% on its stage, or a faded category placeholder when there is none. */
function Thumb({ saved, className = "" }: { saved: SavedDesign; className?: string }) {
  const p = saved.product;
  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-[#172036] ${className}`}>
      {hasPreview(p) ? (
        <img src={p.designPreviewUrl!} alt="" loading="lazy" decoding="async" className="h-[70%] w-[70%] object-contain" />
      ) : (
        <Icon name={categoryIconOf(p)} size={44} className="text-muted-foreground opacity-45" />
      )}
    </div>
  );
}

function MenuButton({ name, open, onMenu, className = "" }: { name: string; open: boolean; onMenu: (anchor: HTMLElement) => void; className?: string }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={t("designs.actions", { name })}
      onClick={(e) => onMenu(e.currentTarget)}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${open ? "bg-[#222D47]" : "bg-[rgba(11,16,32,0.6)] hover:bg-[#222D47]"} ${className}`}
    >
      <Icon name="more" size={20} />
    </button>
  );
}

function NoPreviewPill() {
  const { t } = useTranslation();
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[rgba(11,16,32,0.78)] px-2.5 py-1 text-[11.5px] font-semibold text-warning">
      <Icon name="alert" size={12} />
      {t("designs.noPreview")}
    </span>
  );
}

function EditLink({ href, name, iconOnly = false }: { href: string; name: string; iconOnly?: boolean }) {
  const { t } = useTranslation();
  return iconOnly ? (
    <ButtonLink href={href} variant="secondary" size="pill" aria-label={t("designs.editLabel", { name })} className="h-11! w-11 shrink-0 px-0!">
      <Icon name="pencil" size={16} />
    </ButtonLink>
  ) : (
    <ButtonLink href={href} variant="secondary" size="sm" aria-label={t("designs.editLabel", { name })} className="h-11 shrink-0 gap-1.5 px-3!">
      <Icon name="pencil" size={15} />
      {t("designs.edit")}
    </ButtonLink>
  );
}

/**
 * A saved design. From 640px up: a card in the grid (square preview, details, Order + Edit).
 * On phones: a horizontal row (96px preview), with Order, Edit and ⋯ as 44px buttons.
 */
export function DesignCard({ saved, editHref, orderHref, menuOpen, onMenu }: CardProps) {
  const { t } = useTranslation();
  const p = saved.product;
  const parts = componentsLine(p);
  const meta = [variantOf(p), t("designs.saved", { date: formatSavedDate(saved.updatedAt) })].filter(Boolean).join(" · ");
  const missing = !hasPreview(p);

  return (
    <li className="group flex h-full gap-3 rounded-2xl border border-white/7 bg-[#121A2E] p-3 transition-[border-color,translate] duration-150 hover:border-primary/45 sm:flex-col sm:gap-0 sm:overflow-hidden sm:p-0 sm:hover:-translate-y-0.5">
      {/* Preview */}
      <div className="relative shrink-0">
        <Thumb saved={saved} className="aspect-square w-24 rounded-xl sm:w-full sm:rounded-none" />
        <span className="absolute top-3 left-3 hidden max-w-[calc(100%-4.5rem)] truncate rounded-full bg-[rgba(11,16,32,0.78)] px-2.5 py-1 text-[11.5px] font-semibold text-[#C3CADB] sm:block">
          {categoryLabel(p)}
        </span>
        <MenuButton name={saved.name} open={menuOpen} onMenu={onMenu} className="absolute top-2 right-2 hidden sm:flex" />
        {missing && (
          <>
            <span className="absolute bottom-3 left-3 hidden sm:block">
              <NoPreviewPill />
            </span>
            <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#0B1020] text-warning ring-2 ring-[#121A2E] sm:hidden" title={t("designs.noPreview")}>
              <Icon name="alert" size={14} />
              <span className="sr-only">{t("designs.noPreview")}</span>
            </span>
          </>
        )}
      </div>

      {/* Details */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:px-4 sm:pt-3.5 sm:pb-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="min-w-0 truncate text-[15px] font-semibold text-white" title={saved.name}>
            {saved.name}
          </h2>
          <span className="shrink-0 text-[15px] font-bold text-primary">{formatPrice(p.price)}</span>
        </div>
        <p className="truncate text-[12.5px] text-muted-foreground">
          <span className="sm:hidden">{categoryLabel(p)} · </span>
          {meta}
        </p>
        {parts.short && (
          <p className="truncate text-[12.5px] text-[#C3CADB]" title={parts.full}>
            {parts.short}
          </p>
        )}

        <div className="mt-auto flex gap-2 pt-2.5">
          <ButtonLink href={orderHref} size="sm" className="h-11 min-w-0 flex-1 px-3!">
            {t("designs.order")}
          </ButtonLink>
          {editHref && (
            <>
              <span className="sm:hidden">
                <EditLink href={editHref} name={saved.name} iconOnly />
              </span>
              <span className="hidden sm:block">
                <EditLink href={editHref} name={saved.name} />
              </span>
            </>
          )}
          <MenuButton name={saved.name} open={menuOpen} onMenu={onMenu} className="h-11 w-11 border border-white/12 sm:hidden" />
        </div>
      </div>
    </li>
  );
}

/** List view (from 640px up): one compact row per design. */
export function DesignRow({ saved, editHref, orderHref, menuOpen, onMenu }: CardProps) {
  const { t } = useTranslation();
  const p = saved.product;
  const parts = componentsLine(p);
  const meta = [variantOf(p), t("designs.saved", { date: formatSavedDate(saved.updatedAt) })].filter(Boolean).join(" · ");

  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[14px] border border-white/7 bg-[#121A2E] px-3 py-2.5 transition-colors duration-150 hover:border-primary/45">
      <Thumb saved={saved} className="h-[72px] w-[72px] shrink-0 rounded-xl" />
      <div className="min-w-[12rem] flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 truncate text-[15px] font-semibold text-white" title={saved.name}>
            {saved.name}
          </h2>
          <span className="rounded-full bg-white/8 px-2.5 py-0.5 text-[11.5px] font-semibold text-[#C3CADB]">{categoryLabel(p)}</span>
          {!hasPreview(p) && <NoPreviewPill />}
        </div>
        <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{meta}</p>
        {parts.full && (
          <p className="truncate text-[12.5px] text-[#C3CADB]" title={parts.full}>
            {parts.full}
          </p>
        )}
      </div>
      <span className="ml-auto text-base font-bold text-primary">{formatPrice(p.price)}</span>
      <div className="flex items-center gap-2">
        {editHref && <EditLink href={editHref} name={saved.name} />}
        <ButtonLink href={orderHref} size="sm" className="h-11 px-4!">
          {t("designs.order")}
        </ButtonLink>
        <MenuButton name={saved.name} open={menuOpen} onMenu={onMenu} className="h-11 w-11 border border-white/12" />
      </div>
    </li>
  );
}

/** A placeholder with the same size as a real card while designs load. */
export function DesignCardSkeleton() {
  return (
    <li className="flex gap-3 rounded-2xl border border-white/7 bg-[#121A2E] p-3 sm:flex-col sm:gap-0 sm:overflow-hidden sm:p-0" aria-hidden="true">
      <div className="aspect-square w-24 shrink-0 animate-pulse rounded-xl bg-[#172036] sm:w-full sm:rounded-none" />
      <div className="flex flex-1 flex-col gap-2 sm:px-4 sm:pt-3.5 sm:pb-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-white/8" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-white/6" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-white/6" />
        <div className="mt-auto h-11 animate-pulse rounded-full bg-white/6" />
      </div>
    </li>
  );
}

import { useId, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Icon, type IconName } from "../../components/Icon";
import { BottomSheet } from "../../studio/BottomSheet";
import { SORTS, type Chip, type Filters, type Sort, type View } from "./useDesignFilters";

interface Props {
  filters: Filters;
  search: string;
  onSearch: (value: string) => void;
  onChange: (changes: Partial<Filters>) => void;
  chips: Chip[];
  allCount: number;
}

function ChipButton({ selected, onClick, children, label, tone = "default" }: { selected: boolean; onClick: () => void; children: ReactNode; label?: string; tone?: "default" | "warning" }) {
  const look =
    tone === "warning"
      ? "border-warning/40 bg-warning/10 text-warning hover:bg-warning/15"
      : selected
        ? "border-primary bg-primary text-primary-foreground"
        : "border-white/10 bg-[#121A2E] text-[#C3CADB] hover:border-white/20 hover:text-white";
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={onClick}
      className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors duration-150 ${look}`}
    >
      {children}
    </button>
  );
}

function Count({ n, selected }: { n: number; selected: boolean }) {
  return <span className={`rounded-full px-1.5 text-[11px] font-bold ${selected ? "bg-black/15" : "bg-white/8 text-muted-foreground"}`}>{n}</span>;
}

function ViewToggle({ view, onChange }: { view: View; onChange: (view: View) => void }) {
  const { t } = useTranslation();
  const options: { value: View; icon: IconName; label: string }[] = [
    { value: "grid", icon: "grid", label: t("designs.viewGrid") },
    { value: "list", icon: "menu", label: t("designs.viewList") },
  ];
  return (
    <div className="hidden h-[42px] items-center rounded-[10px] border border-white/12 p-1 sm:flex">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={view === o.value}
          aria-label={o.label}
          title={o.label}
          onClick={() => onChange(o.value)}
          className={`flex h-[34px] w-9 items-center justify-center rounded-md transition-colors ${view === o.value ? "bg-[#222D47] text-white" : "text-muted-foreground hover:text-white"}`}
        >
          <Icon name={o.icon} size={16} />
        </button>
      ))}
    </div>
  );
}

/** Search, sort, grid/list and the category chips of My designs. */
export function DesignsToolbar({ filters, search, onSearch, onChange, chips, allCount }: Props) {
  const { t } = useTranslation();
  const searchId = useId();
  const sortId = useId();
  const [sortSheet, setSortSheet] = useState(false);

  return (
    <section aria-label={t("designs.filter")} className="flex flex-col gap-3.5 sm:rounded-2xl sm:border sm:border-white/7 sm:bg-[#10172A] sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Search (with the sort button inside it on phones) */}
        <div className="relative w-full sm:w-[320px]">
          <label htmlFor={searchId} className="sr-only">
            {t("designs.searchLabel")}
          </label>
          <Icon name="search" size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            id={searchId}
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={t("designs.searchPlaceholder")}
            className="h-[46px] w-full rounded-[10px] border border-white/12 bg-background pr-12 pl-10 text-sm text-foreground placeholder:text-[#7D879E] focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none sm:h-[42px] sm:pr-3"
          />
          <button
            type="button"
            onClick={() => setSortSheet(true)}
            aria-label={t("designs.sortOpen")}
            className="absolute top-1/2 right-1 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:text-white sm:hidden"
          >
            <Icon name="swap" size={18} />
          </button>
        </div>

        {/* Sort and grid/list (wider screens) */}
        <div className="hidden items-center gap-3 sm:flex">
        <div>
          <label htmlFor={sortId} className="sr-only">
            {t("designs.sortLabel")}
          </label>
          <select
            id={sortId}
            value={filters.sort}
            onChange={(e) => onChange({ sort: e.target.value as Sort })}
            className="h-[42px] rounded-[10px] border border-white/12 bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none"
          >
            {SORTS.map((s) => (
              <option key={s} value={s}>
                {t(`designs.sort.${s}`)}
              </option>
            ))}
          </select>
        </div>

        <ViewToggle view={filters.view} onChange={(view) => onChange({ view })} />
        </div>
      </div>

      {/* Category chips: wrap on wider screens, one swipeable row on phones. */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="group" aria-label={t("designs.filter")}>
        <ChipButton selected={filters.cat === "all"} onClick={() => onChange({ cat: "all" })}>
          {t("designs.all")} <Count n={allCount} selected={filters.cat === "all"} />
        </ChipButton>
        {chips.map((c) => (
          <ChipButton key={c.key} selected={filters.cat === c.key} onClick={() => onChange({ cat: c.key })}>
            {c.label} <Count n={c.count} selected={filters.cat === c.key} />
          </ChipButton>
        ))}
        {filters.missing && (
          <ChipButton selected tone="warning" label={t("designs.removeOnlyMissing")} onClick={() => onChange({ missing: false })}>
            {t("designs.onlyMissing")} <Icon name="close" size={13} />
          </ChipButton>
        )}
      </div>

      <BottomSheet title={t("designs.sortLabel")} open={sortSheet} onClose={() => setSortSheet(false)}>
        <ul className="-mx-2 flex flex-col" role="radiogroup" aria-label={t("designs.sortLabel")}>
          {SORTS.map((s) => (
            <li key={s}>
              <button
                type="button"
                role="radio"
                aria-checked={filters.sort === s}
                onClick={() => {
                  onChange({ sort: s });
                  setSortSheet(false);
                }}
                className="flex h-[52px] w-full items-center justify-between rounded-lg px-3 text-left text-base font-medium hover:bg-white/7"
              >
                {t(`designs.sort.${s}`)}
                {filters.sort === s && <Icon name="check" size={18} className="text-primary" />}
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>
    </section>
  );
}

const BANNER_KEY = "hc.designs.previewBannerClosed";

export function bannerClosed() {
  try {
    return localStorage.getItem(BANNER_KEY) === "1";
  } catch {
    return false;
  }
}

/** One notice for every design without a preview picture, instead of a warning on each card. */
export function MissingPreviewBanner({ count, onShow, onClose }: { count: number; onShow: () => void; onClose: () => void }) {
  const { t } = useTranslation();
  const close = () => {
    try {
      localStorage.setItem(BANNER_KEY, "1");
    } catch {
      // Blocked storage: it stays closed for this visit.
    }
    onClose();
  };
  return (
    <div role="status" className="flex items-center gap-3 rounded-xl border border-warning/22 bg-warning/7 px-3 py-2.5 text-sm sm:px-4 sm:py-3">
      <Icon name="alert" size={18} className="shrink-0 text-warning" />
      <p className="min-w-0 flex-1 text-[#E8ECF5]">
        <span className="sm:hidden">{t("designs.bannerShort", { count })}</span>
        <span className="hidden sm:inline">
          <strong className="font-semibold text-warning">{t("designs.bannerCount", { count })}</strong> {t("designs.bannerText", { count })}
        </span>
      </p>
      <button type="button" onClick={onShow} className="shrink-0 rounded-lg px-2 py-1.5 font-semibold text-warning underline-offset-4 hover:underline sm:border sm:border-warning/30 sm:px-3 sm:no-underline sm:hover:bg-warning/10">
        {t("designs.bannerShow")}
      </button>
      <button type="button" onClick={close} aria-label={t("designs.bannerClose")} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-white/7 hover:text-white">
        <Icon name="close" size={16} />
      </button>
    </div>
  );
}

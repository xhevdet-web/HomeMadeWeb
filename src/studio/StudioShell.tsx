import type { ReactNode } from "react";
import { creationsFromOthers } from "../api/designs";
import { productImage, type Category } from "../api/models";
import { useAuth } from "../auth/AuthContext";
import { Button, ButtonLink } from "../components/Button";
import { Icon, type IconName } from "../components/Icon";
import { Page, PageHeader, SectionLabel } from "../components/Page";
import { StepIndicator } from "../components/StepIndicator";
import { lookFor, studioHref } from "../data/homeCategories";
import { useApi } from "../hooks/useApi";
import { money } from "../lib/format";
import { backIfPrevious } from "../router";
import { useUndoShortcuts } from "./useHistory";
import { corsImage } from "./capture";
import i18n from "../i18n";

// Components here re-render with the app when the language changes.
const t = i18n.t.bind(i18n);

export const studioSteps = () => [t("studio.steps.base"), t("studio.steps.design"), t("studio.steps.preview")];

/** Header + step indicator around every studio step. "Created by others" shows on the first step when signed in. */
export function StudioShell({ category, step, title, intro, children, others = false }: {
  category: Category;
  step: 0 | 1 | 2;
  title?: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
  others?: boolean;
}) {
  return (
    <Page>
      <PageHeader
        back={{ href: "#/studios", label: t("studio.allStudios") }}
        eyebrow={t("studio.eyebrow")}
        title={
          title ?? (
            <>
              {category.name} <em className="font-normal text-primary">{t("studio.titleAccent")}</em>
            </>
          )
        }
        intro={intro ?? lookFor(category).studio}
      />
      <StepIndicator steps={studioSteps()} active={step} className="mt-10" />
      {children}
      {others && <CreatedByOthers category={category} />}
    </Page>
  );
}

/** Finished pieces by other customers, for inspiration. Only for signed-in visitors. */
function CreatedByOthers({ category }: { category: Category }) {
  const { status } = useAuth();
  const { data } = useApi(status === "signedIn" ? `others:${category.id}` : null, (signal) => creationsFromOthers(category.id, signal));
  const creations = (data ?? []).filter((c) => productImage(c.product)).slice(0, 8);
  if (!creations.length) return null;
  return (
    <section className="mt-20" aria-labelledby="others-title">
      <p className="eyebrow">{t("studio.inspiration")}</p>
      <h2 id="others-title" className="mt-4 font-display text-4xl font-semibold tracking-tight">
        {t("studio.createdBy")} <em className="font-normal text-primary">{t("studio.others")}</em>
      </h2>
      <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {creations.map((c) => (
          <li key={c.completedOrderId} className="overflow-hidden rounded-2xl border border-border bg-card">
            <img {...corsImage} src={productImage(c.product)!} alt={c.product.name} loading="lazy" className="aspect-square w-full bg-secondary object-cover" />
            <p className="truncate px-3 py-2.5 text-sm font-semibold">{c.product.name}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Canvas on the left (sticky on desktop), tools on the right, summary bar below. */
export function StudioLayout({ stage, tools, bar }: { stage: ReactNode; tools: ReactNode; bar: ReactNode }) {
  return (
    <>
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        {stage}
        <aside aria-label={t("studio.tools")} className="flex min-w-0 flex-col gap-8 rounded-[2rem] border border-border bg-card p-5 sm:p-8">
          {tools}
        </aside>
      </div>
      {bar}
    </>
  );
}

export function Stage({ label, toolbar, above, below, children }: {
  label: string;
  toolbar?: ReactNode;
  above?: ReactNode;
  below?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-28">
      {above}
      <section
        aria-label={label}
        className="relative flex min-h-[340px] items-center justify-center overflow-hidden rounded-[2rem] border border-border bg-card px-5 pt-20 pb-8 sm:min-h-[480px] sm:px-10"
      >
        <div className="bg-glow pointer-events-none absolute inset-0" />
        {toolbar}
        <div className="relative flex w-full justify-center">{children}</div>
      </section>
      {below}
    </div>
  );
}

export function CanvasToolbar({ undo, redo, canUndo, canRedo, onClear, canClear }: {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onClear: () => void;
  canClear: boolean;
}) {
  useUndoShortcuts(undo, redo);
  const tools: [IconName, string, () => void, boolean][] = [
    ["undo", t("studio.toolbar.undo"), undo, canUndo],
    ["redo", t("studio.toolbar.redo"), redo, canRedo],
    ["trash", t("studio.toolbar.clear"), onClear, canClear],
  ];
  return (
    <div className="absolute top-4 left-1/2 z-20 flex -translate-x-1/2 gap-1 rounded-full border border-border bg-background/70 p-1 backdrop-blur-md">
      {tools.map(([icon, label, run, enabled]) => (
        <button
          key={label}
          type="button"
          aria-label={label}
          title={label}
          onClick={run}
          disabled={!enabled}
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-35 disabled:hover:bg-transparent"
        >
          <Icon name={icon} size={18} />
        </button>
      ))}
    </div>
  );
}

export function ToolSection({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <SectionLabel as="h3">{title}</SectionLabel>
        {aside && <span className="mb-3 text-right text-xs text-muted-foreground">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

/** Horizontally scrolling tab row. */
export function Tabs<T extends string>({ tabs, value, onChange, label }: {
  tabs: { id: T; label: ReactNode }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto rounded-full border border-border p-1 [scrollbar-width:none]">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          role="tab"
          aria-selected={t.id === value}
          onClick={() => onChange(t.id)}
          className={`flex-1 shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
            t.id === value ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/** A tile in a picker grid: visual, name, price and an optional stock badge. */
export function PickerCard({ title, price, sub, badge, disabled, dim, selected, onClick, children }: {
  title: string;
  price?: string;
  sub?: string;
  badge?: string | null;
  disabled?: boolean;
  dim?: boolean;
  selected?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`group flex flex-col overflow-hidden rounded-2xl border text-left transition-colors disabled:cursor-not-allowed ${
        selected ? "border-primary" : "border-border hover:border-foreground/30"
      } ${disabled || dim ? "opacity-45" : ""}`}
    >
      <span className="relative flex aspect-square w-full items-center justify-center bg-secondary p-3">
        {children}
        {badge && (
          <span className="absolute top-1.5 right-1.5 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-semibold text-foreground">
            {badge}
          </span>
        )}
      </span>
      <span className="px-2.5 pt-2 text-xs leading-tight font-semibold">{title}</span>
      <span className="flex justify-between gap-1 px-2.5 pt-0.5 pb-2.5 text-[11px]">
        <span className="text-primary">{price}</span>
        <span className="text-muted-foreground">{sub}</span>
      </span>
    </button>
  );
}

/** A selected base (piece, packaging, phone…) with a Change link back to step 1. */
export function BaseChip({ label, value, href, action = t("studio.change") }: { label: string; value: string; href: string; action?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-secondary/40 px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-semibold">{value}</p>
      </div>
      <a href={href} onClick={backIfPrevious} className="text-sm font-semibold whitespace-nowrap text-primary hover:underline">
        {action}
      </a>
    </div>
  );
}

/** Zoom / rotate / reset buttons for a single selected image. */
export function ImageControls({ onZoom, onRotate, onReset, children }: {
  onZoom: (factor: number) => void;
  onRotate: (deg: number) => void;
  onReset: () => void;
  children?: ReactNode;
}) {
  const btn = "flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors hover:bg-secondary";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={btn} aria-label={t("studio.zoomOut")} title={t("studio.zoomOut")} onClick={() => onZoom(1 / 1.15)}>
        <Icon name="zoomOut" size={17} />
      </button>
      <button type="button" className={btn} aria-label={t("studio.zoomIn")} title={t("studio.zoomIn")} onClick={() => onZoom(1.15)}>
        <Icon name="zoomIn" size={17} />
      </button>
      <button type="button" className={btn} aria-label={t("studio.actions.rotateLeft")} title={t("studio.actions.rotateLeft")} onClick={() => onRotate(-15)}>
        <Icon name="rotateLeft" size={17} />
      </button>
      <button type="button" className={btn} aria-label={t("studio.actions.rotateRight")} title={t("studio.actions.rotateRight")} onClick={() => onRotate(15)}>
        <Icon name="rotateRight" size={17} />
      </button>
      <button type="button" className={btn} aria-label={t("studio.resetPosition")} title={t("studio.actions.reset")} onClick={onReset}>
        <Icon name="reset" size={17} />
      </button>
      {children}
    </div>
  );
}

export function Notice({ children, tone = "primary" }: { children: ReactNode; tone?: "primary" | "muted" }) {
  return (
    <p
      className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-sm ${
        tone === "primary" ? "border border-primary/40 bg-primary/10" : "border border-dashed border-border text-muted-foreground"
      }`}
    >
      <Icon name="alert" size={16} className="mt-0.5 text-primary" />
      <span>{children}</span>
    </p>
  );
}

/** Large preview on the left, details and actions on the right. */
export function PreviewLayout({ visual, children }: { visual: ReactNode; children: ReactNode }) {
  return (
    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-[2rem] border border-border bg-card p-6 sm:p-12 lg:sticky lg:top-28">
        <div className="bg-glow pointer-events-none absolute inset-0" />
        <div className="relative flex w-full justify-center">{visual}</div>
      </div>
      <div className="flex flex-col gap-6 rounded-[2rem] border border-border bg-card p-6 sm:p-8">{children}</div>
    </div>
  );
}

export function DetailRows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="divide-y divide-border rounded-2xl border border-border">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
          <dt className="text-muted-foreground">{k}</dt>
          <dd className="text-right font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function PriceLines({ lines, total, totalLabel = t("common.total") }: { lines: [string, number][]; total: number; totalLabel?: string }) {
  return (
    <dl className="space-y-2.5 text-sm">
      {lines.map(([k, v], i) => (
        <div key={`${k}-${i}`} className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{k}</dt>
          <dd>{money(v)}</dd>
        </div>
      ))}
      <div className="flex items-baseline justify-between border-t border-border pt-4">
        <dt className="font-semibold">{totalLabel}</dt>
        <dd className="font-display text-3xl font-semibold text-primary">{money(total)}</dd>
      </div>
    </dl>
  );
}

export function PreviewActions({ category, onSave, onOrder, orderBlocked, orderHint, saveBlocked, saving = false }: {
  category: Category;
  onSave: () => void;
  onOrder: () => void;
  orderBlocked?: string | null;
  /** A second line under a blocked order button, e.g. "Add €1.40 more to order." */
  orderHint?: string | null;
  saveBlocked?: string | null;
  saving?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Button glow size="lg" onClick={onOrder} disabled={!!orderBlocked || saving} className="w-full">
        {saving ? t("common.saving") : t("studio.continueToOrder")} <Icon name="arrowRight" size={18} />
      </Button>
      {orderBlocked && (
        <p role="status" className="text-center text-sm text-muted-foreground">
          {orderBlocked}
          {orderHint && <span className="mt-1 block font-semibold text-foreground">{orderHint}</span>}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <ButtonLink href={studioHref(category, "design")} onClick={backIfPrevious} variant="secondary" size="sm">
          <Icon name="arrowLeft" size={15} /> {t("studio.backToStudio")}
        </ButtonLink>
        <Button variant="secondary" size="sm" onClick={onSave} disabled={!!saveBlocked || saving}>
          {t("studio.saveDesign")}
        </Button>
      </div>
    </div>
  );
}

/** Shown on a preview step when there is nothing to preview yet. */
export function NothingToPreview({ category, message }: { category: Category; message: string }) {
  return (
    <div className="mt-8 rounded-[2rem] border border-border bg-card px-6 py-16 text-center">
      <p className="font-display text-3xl font-semibold">{t("studio.nothingToPreview")}</p>
      <p className="mt-3 text-muted-foreground">{message}</p>
      <ButtonLink href={studioHref(category, "design")} onClick={backIfPrevious} className="mt-8">
        {t("studio.backToStudio")}
      </ButtonLink>
    </div>
  );
}

/** Continue button at the end of a base step; explains what is missing when disabled. */
export function ContinueButton({ ready, href, label, blockedLabel }: { ready: boolean; href: string; label: string; blockedLabel?: string }) {
  return ready ? (
    <ButtonLink href={href} onClick={backIfPrevious} glow size="lg" className="w-full sm:w-auto">
      {label} <Icon name="arrowRight" size={18} />
    </ButtonLink>
  ) : (
    <Button size="lg" disabled className="w-full sm:w-auto">
      {blockedLabel ?? label}
    </Button>
  );
}

/** Loading skeleton with the studio's layout. */
export function StudioSkeleton() {
  return (
    <Page>
      <div className="h-6 w-32 animate-pulse rounded-full bg-secondary" />
      <div className="mt-6 h-14 w-2/3 animate-pulse rounded-2xl bg-secondary" />
      <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]" role="status" aria-label={t("studio.loading")}>
        <div className="h-[420px] animate-pulse rounded-[2rem] bg-card" />
        <div className="h-[420px] animate-pulse rounded-[2rem] bg-card" />
      </div>
    </Page>
  );
}

/** A request failed: the server's message and a Try again button. */
export function LoadError({ message, onRetry, className = "" }: { message: string; onRetry: () => void; className?: string }) {
  return (
    <div role="alert" className={`rounded-[2rem] border border-border bg-card px-6 py-12 text-center ${className}`}>
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
        <Icon name="alert" size={22} />
      </span>
      <p className="mt-4 font-semibold">{message}</p>
      <Button variant="secondary" size="sm" className="mt-6" onClick={onRetry}>
        {t("common.retry")}
      </Button>
    </div>
  );
}

export function ImagePlaceholder({ label, className = "" }: { label: string; className?: string }) {
  return (
    <span className={`flex items-center justify-center bg-secondary text-center text-xs text-muted-foreground ${className}`} aria-hidden="true">
      {label}
    </span>
  );
}

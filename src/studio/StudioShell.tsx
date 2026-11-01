import type { ReactNode } from "react";
import { Button, ButtonLink } from "../components/Button";
import { Icon, type IconName } from "../components/Icon";
import { Page, PageHeader, SectionLabel } from "../components/Page";
import { StepIndicator } from "../components/StepIndicator";
import { getStudio, money, type StudioSlug } from "../data/mock";
import { useUndoShortcuts } from "./useHistory";

export const STUDIO_STEPS = ["Choose base", "Design", "Preview"];

/** Header + step indicator around every studio step. */
export function StudioShell({ slug, step, title, intro, children }: {
  slug: StudioSlug;
  step: 0 | 1 | 2;
  title?: ReactNode;
  intro?: ReactNode;
  children: ReactNode;
}) {
  const studio = getStudio(slug)!;
  return (
    <Page>
      <PageHeader
        back={{ href: "#/studios", label: "All studios" }}
        eyebrow="Creative studio"
        title={
          title ?? (
            <>
              {studio.name} <em className="font-normal text-primary">studio.</em>
            </>
          )
        }
        intro={intro ?? studio.description}
      />
      <StepIndicator steps={STUDIO_STEPS} active={step} className="mt-10" />
      {children}
    </Page>
  );
}

/** Canvas on the left (sticky on desktop), tools on the right, summary bar below. */
export function StudioLayout({ stage, tools, bar }: { stage: ReactNode; tools: ReactNode; bar: ReactNode }) {
  return (
    <>
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        {stage}
        <aside aria-label="Design tools" className="flex min-w-0 flex-col gap-8 rounded-[2rem] border border-border bg-card p-5 sm:p-8">
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
    ["undo", "Undo", undo, canUndo],
    ["redo", "Redo", redo, canRedo],
    ["trash", "Clear", onClear, canClear],
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
export function BaseChip({ label, value, href, action = "Change" }: { label: string; value: string; href: string; action?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-secondary/40 px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="truncate font-semibold">{value}</p>
      </div>
      <a href={href} className="text-sm font-semibold whitespace-nowrap text-primary hover:underline">
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
      <button type="button" className={btn} aria-label="Zoom out" title="Zoom out" onClick={() => onZoom(1 / 1.15)}>
        <Icon name="zoomOut" size={17} />
      </button>
      <button type="button" className={btn} aria-label="Zoom in" title="Zoom in" onClick={() => onZoom(1.15)}>
        <Icon name="zoomIn" size={17} />
      </button>
      <button type="button" className={btn} aria-label="Rotate left" title="Rotate left" onClick={() => onRotate(-15)}>
        <Icon name="rotateLeft" size={17} />
      </button>
      <button type="button" className={btn} aria-label="Rotate right" title="Rotate right" onClick={() => onRotate(15)}>
        <Icon name="rotateRight" size={17} />
      </button>
      <button type="button" className={btn} aria-label="Reset position" title="Reset" onClick={onReset}>
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

export function PriceLines({ lines, total, totalLabel = "Total" }: { lines: [string, number][]; total: number; totalLabel?: string }) {
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

export function PreviewActions({ slug, onSave, onOrder, orderBlocked, saveBlocked }: {
  slug: StudioSlug;
  onSave: () => void;
  onOrder: () => void;
  orderBlocked?: string | null;
  saveBlocked?: string | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Button glow size="lg" onClick={onOrder} disabled={!!orderBlocked} className="w-full">
        Continue to order <Icon name="arrowRight" size={18} />
      </Button>
      {orderBlocked && <p className="text-center text-sm text-muted-foreground">{orderBlocked}</p>}
      <div className="grid grid-cols-2 gap-3">
        <ButtonLink href={`#/studios/${slug}/design`} variant="secondary" size="sm">
          <Icon name="arrowLeft" size={15} /> Back to the studio
        </ButtonLink>
        <Button variant="secondary" size="sm" onClick={onSave} disabled={!!saveBlocked}>
          Save design
        </Button>
      </div>
    </div>
  );
}

/** Shown on a preview step when there is nothing to preview yet. */
export function NothingToPreview({ slug, message }: { slug: StudioSlug; message: string }) {
  return (
    <div className="mt-8 rounded-[2rem] border border-border bg-card px-6 py-16 text-center">
      <p className="font-display text-3xl font-semibold">Nothing to preview yet.</p>
      <p className="mt-3 text-muted-foreground">{message}</p>
      <ButtonLink href={`#/studios/${slug}/design`} className="mt-8">
        Back to the studio
      </ButtonLink>
    </div>
  );
}

/** Continue button at the end of a base step; explains what is missing when disabled. */
export function ContinueButton({ ready, href, label, blockedLabel }: { ready: boolean; href: string; label: string; blockedLabel?: string }) {
  return ready ? (
    <ButtonLink href={href} glow size="lg" className="w-full sm:w-auto">
      {label} <Icon name="arrowRight" size={18} />
    </ButtonLink>
  ) : (
    <Button size="lg" disabled className="w-full sm:w-auto">
      {blockedLabel ?? label}
    </Button>
  );
}

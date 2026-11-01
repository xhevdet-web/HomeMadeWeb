import { forwardRef, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Category } from "../api/models";
import { Button } from "../components/Button";
import { Icon, type IconName } from "../components/Icon";
import { studioHref } from "../data/homeCategories";
import { StudioShell } from "./StudioShell";
import { AnimatedPrice, StudioSummaryBar } from "./StudioSummaryBar";
import { useIsPhone, useVisibleHeight } from "./ui";
import { corsImage } from "./capture";

export interface FrameFooter {
  summary: string;
  price: number;
  priceLabel?: string;
  primaryLabel?: string;
  onPrimary: () => void;
  primaryBlocked?: string | null;
  note?: string | null;
  /** Pulse the primary button once (the design just became complete). */
  pulse?: boolean;
}

interface FrameProps {
  category: Category;
  /** e.g. "Bracelet • Medium · 22.1 cm" */
  subtitle: string;
  onSave: () => void;
  saveBlocked?: string | null;
  saving?: boolean;
  /** Measurement bar or a base chip, under the header. */
  top?: ReactNode;
  stage: ReactNode;
  /** A narrow column beside the stage (the bead sequence). */
  side?: ReactNode;
  notice?: { text: string; tone: "info" | "warn"; id: number } | null;
  /** Shown only while something is selected, right above the picker. */
  toolbar?: ReactNode;
  picker: ReactNode;
  /** Pinned under the picker on phones (sticker design tabs). */
  pickerFooter?: ReactNode;
  footer: FrameFooter;
}

/** The inline message under the stage; announced politely. */
export function Notice({ notice }: { notice: FrameProps["notice"] }) {
  return (
    <p role="status" aria-live="polite" className="flex min-h-6 items-center justify-center px-2 text-center text-sm">
      {notice && (
        <span key={notice.id} className={`img-fade ${notice.tone === "warn" ? "text-primary" : "text-muted-foreground"}`}>
          {notice.tone === "warn" && <Icon name="alert" size={14} className="mr-1.5 inline align-[-2px]" />}
          {notice.text}
        </span>
      )}
    </p>
  );
}

/** Desktop: the approved two-column studio. Phones: a full-screen app shell where only the picker scrolls. */
export function StudioFrame(props: FrameProps) {
  return useIsPhone() ? <PhoneShell {...props} /> : <DesktopFrame {...props} />;
}

function DesktopFrame({ category, top, stage, side, notice, toolbar, picker, pickerFooter, footer, onSave, saveBlocked, saving }: FrameProps) {
  return (
    <StudioShell category={category} step={1}>
      <div className="mt-8 grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div className="flex min-w-0 flex-col gap-3 md:sticky md:top-28">
          {top}
          <div className="flex min-w-0 gap-3">
            <div className="min-w-0 flex-1">{stage}</div>
            {side}
          </div>
          <Notice notice={notice} />
        </div>
        <aside aria-label="Design tools" className="flex min-w-0 flex-col gap-6 rounded-[2rem] border border-border bg-card p-5 sm:p-7 md:max-h-[calc(100vh-8rem)] md:overflow-y-auto md:overscroll-contain">
          {toolbar}
          {picker}
          {pickerFooter}
        </aside>
      </div>
      <StudioSummaryBar
        summary={footer.summary}
        price={footer.price}
        priceLabel={footer.priceLabel}
        onSave={onSave}
        saving={saving}
        saveBlocked={saveBlocked}
        primaryLabel={footer.primaryLabel}
        onPrimary={footer.onPrimary}
        primaryBlocked={footer.primaryBlocked}
        note={footer.note}
      />
    </StudioShell>
  );
}

function PhoneShell({ category, subtitle, onSave, saveBlocked, saving, top, stage, side, notice, toolbar, picker, pickerFooter, footer }: FrameProps) {
  const height = useVisibleHeight();
  const [width, setWidth] = useState(() => window.innerWidth);

  useEffect(() => {
    const on = () => setWidth(window.innerWidth);
    window.addEventListener("resize", on);
    // The page itself never scrolls while the shell is open.
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    window.scrollTo(0, 0);
    return () => {
      window.removeEventListener("resize", on);
      html.style.overflow = prev;
    };
  }, []);

  const sideWidth = side ? 54 : 0;
  // Like the app: min(width − 32 − sequence, 42% of the visible height, 440), never below 240.
  const stageSize = Math.max(240, Math.min(width - 32 - sideWidth, height * 0.42, 440));

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] flex flex-col bg-background text-foreground"
      style={{ height, paddingTop: "env(safe-area-inset-top)", paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)" }}
    >
      <header className="flex items-center gap-1 px-2 pt-1">
        <a href={studioHref(category)} aria-label="Back to the first step" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-secondary">
          <Icon name="arrowLeft" size={20} />
        </a>
        <div className="min-w-0 flex-1 text-center">
          <h1 className="truncate font-display text-lg leading-tight font-semibold">{category.name} studio</h1>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={!!saveBlocked || saving}
          aria-label={saving ? "Saving your design" : "Save design"}
          title={saveBlocked ?? "Save design"}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-secondary disabled:opacity-35"
        >
          <Icon name="bookmark" size={20} />
        </button>
      </header>

      {top && <div className="px-4 pt-1">{top}</div>}

      <div className="flex shrink-0 justify-center gap-2 px-4 pt-2" style={{ height: stageSize + 8 }}>
        <div style={{ width: side ? stageSize : "100%", height: stageSize }} className="min-w-0">
          {stage}
        </div>
        {side && <div style={{ height: stageSize }}>{side}</div>}
      </div>

      <Notice notice={notice} />
      {toolbar && <div className="px-4 pb-2">{toolbar}</div>}

      {/* Only this area scrolls; overscroll stays inside so pull-to-refresh never fires. */}
      <div className="min-h-[96px] flex-1 overflow-y-auto overscroll-contain px-4 pb-3">{picker}</div>
      {pickerFooter && <div className="border-t border-border px-4 py-2">{pickerFooter}</div>}

      <footer className="flex items-center gap-3 border-t border-border bg-card/95 px-4 pt-3 backdrop-blur-xl" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline gap-1.5">
            <AnimatedPrice cents={footer.price} className="font-display text-xl font-semibold text-primary" />
            {footer.priceLabel && <span className="text-xs text-muted-foreground">{footer.priceLabel.toLowerCase()}</span>}
          </p>
          <p className="truncate text-xs text-muted-foreground">{footer.primaryBlocked ?? footer.note ?? footer.summary}</p>
        </div>
        <Button size="sm" glow onClick={footer.onPrimary} disabled={!!footer.primaryBlocked} className={`min-h-11 ${footer.pulse ? "pulse-once" : ""}`}>
          {footer.primaryLabel ?? "Preview"} <Icon name="arrowRight" size={16} />
        </Button>
      </footer>
    </div>
  );
}

/**
 * The stage: the hero of the studio. Highlights while something is dragged over it, shows the
 * instruction chip, and gives its content `--stage-w` / `--stage-h` (px) so canvases can fit.
 */
export const StageFrame = forwardRef<
  HTMLElement,
  {
    label: string;
    chip?: string | null;
    variant?: "tray" | "photo";
    toolbar?: ReactNode;
    overlay?: ReactNode;
    /** "bottom" keeps a strip free for undo / redo / clear centred under the canvas; "none" when they sit at the side. */
    controls?: "bottom" | "none";
    className?: string;
    children: ReactNode;
  }
>(function StageFrame({ label, chip, variant = "photo", toolbar, overlay, controls = "bottom", className = "", children }, ref) {
  const inner = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const phone = useIsPhone();
  const bottom = controls === "bottom";

  useLayoutEffect(() => {
    const node = inner.current;
    if (!node) return;
    const measure = () => setBox({ w: node.clientWidth, h: node.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      aria-label={label}
      className={`relative flex w-full flex-col overflow-hidden rounded-[2rem] border transition-[border-color,box-shadow] duration-200 ${variant === "tray" ? "stage-tray" : "stage-photo"} ${
        chip ? "border-primary ring-2 ring-primary/40" : "border-border"
      } ${phone ? "h-full" : "h-[clamp(380px,62vh,600px)]"} ${className}`}
    >
      {chip && <div className="pointer-events-none absolute inset-0 z-10 bg-primary/12" aria-hidden="true" />}
      {chip && (
        <span className="pointer-events-none absolute top-3 left-1/2 z-30 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold whitespace-nowrap text-primary-foreground shadow-glow">
          {chip}
        </span>
      )}
      {toolbar}
      <div
        ref={inner}
        className={`relative flex min-h-0 flex-1 items-center justify-center ${phone ? "px-3 pt-3" : "px-6 pt-16"} ${bottom ? "pb-[60px]" : phone ? "pb-3" : "pb-6"}`}
        style={{ "--stage-w": `${box.w - (phone ? 24 : 48)}px`, "--stage-h": `${box.h - (phone ? 12 : 64) - (bottom ? 60 : phone ? 12 : 24)}px` } as CSSProperties}
      >
        {children}
      </div>
      {overlay}
    </section>
  );
});

/** A box with a fixed aspect (w/h) that fits inside the stage's content area. */
export function FitBox({ aspect, children, className = "" }: { aspect: number; children: ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`} style={{ aspectRatio: String(aspect), width: `min(var(--stage-w), calc(var(--stage-h) * ${aspect}))` }}>
      {children}
    </div>
  );
}

export interface ToolbarAction {
  icon: IconName;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}

/** The contextual toolbar for a selection: scrolls sideways on narrow phones. */
export function SelectionToolbar({ title, image, actions, onDone }: { title: string; image?: string | null; actions: ToolbarAction[]; onDone: () => void }) {
  return (
    <div role="toolbar" aria-label={`${title} actions`} className="flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 p-2">
      {image !== undefined && (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-background/60">
          {image ? <img {...corsImage} src={image} alt="" className="h-8 w-8 object-contain" draggable={false} /> : <Icon name="type" size={16} />}
        </span>
      )}
      <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none]">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={a.onClick}
            disabled={a.disabled}
            aria-label={a.label}
            title={a.label}
            className={`flex h-11 min-w-11 shrink-0 flex-col items-center justify-center rounded-xl px-2 text-[10px] font-semibold transition-colors hover:bg-background/50 disabled:opacity-35 ${
              a.danger ? "text-destructive" : "text-foreground"
            }`}
          >
            <Icon name={a.icon} size={17} />
            <span className="mt-0.5 hidden whitespace-nowrap sm:block">{a.label}</span>
          </button>
        ))}
      </div>
      <button type="button" onClick={onDone} className="h-11 shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">
        Done
      </button>
    </div>
  );
}

/** Round undo/redo/clear buttons over the stage. */
export function StageControls({ undo, redo, canUndo, canRedo, onClear, canClear, className = "" }: {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onClear: () => void;
  canClear: boolean;
  className?: string;
}) {
  const btn = "flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background/75 backdrop-blur-md transition-colors hover:bg-secondary disabled:opacity-35";
  return (
    <div className={`flex gap-2 ${className}`}>
      <button type="button" className={btn} onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (Ctrl+Z)">
        <Icon name="undo" size={18} />
      </button>
      <button type="button" className={btn} onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo (Ctrl+Shift+Z)">
        <Icon name="redo" size={18} />
      </button>
      <button type="button" className={btn} onClick={onClear} disabled={!canClear} aria-label="Clear" title="Clear">
        <Icon name="trash" size={18} />
      </button>
    </div>
  );
}

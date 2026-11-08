import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import type { Category } from "../api/models";
import { Button } from "../components/Button";
import { Icon, type IconName } from "../components/Icon";
import { studioHref } from "../data/homeCategories";
import { goBack } from "../router";
import { isDragging, onDragChange, remeasureTargets } from "./dnd/controller";
import { StudioShell } from "./StudioShell";
import { AnimatedPrice, StudioSummaryBar } from "./StudioSummaryBar";
import { useIsPhone } from "./ui";
import { corsImage } from "./capture";
import i18n from "../i18n";

// Components here re-render with the app when the language changes.
const t = i18n.t.bind(i18n);

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
  /** The studio's StudioToolbar, right above the picker. */
  toolbar?: ReactNode;
  picker: ReactNode;
  /** The phone drawer's title; "Add to your design" by default. */
  pickerTitle?: string;
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
          {stage}
          {/* On desktop the side strip (the bead sequence) runs under the stage. */}
          {side}
          <Notice notice={notice} />
        </div>
        <aside aria-label={t("studio.tools")} className="flex min-w-0 flex-col gap-6 rounded-[2rem] border border-border bg-card p-5 sm:p-7 md:max-h-[calc(100dvh-8rem)] md:overflow-y-auto md:overscroll-contain">
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

/** Which studio steps exist, from the studio's module (mugs open the design straight away). */
export const StudioSteps = createContext<{ hasBase: boolean }>({ hasBase: true });

type DrawerState = "peek" | "half" | "full";
const DRAWER_KEY = "hc.studio.drawer";
/** The closed drawer: handle and title only. */
const PEEK = 56;

function storedDrawer(): DrawerState {
  try {
    const v = sessionStorage.getItem(DRAWER_KEY);
    return v === "peek" || v === "full" ? v : "half";
  } catch {
    return "half";
  }
}

/**
 * While the phone studio is open the page itself never scrolls or zooms: iOS Safari ignores
 * `user-scalable=no`, so a pinch or double tap outside the canvas would zoom the whole studio and
 * a page scroll would fight the drawer. Pinching a design element still works (pointer events).
 */
function useShellLock() {
  useEffect(() => {
    const html = document.documentElement;
    const prev = { overflow: html.style.overflow, overscroll: html.style.overscrollBehavior };
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    window.scrollTo(0, 0);
    const stop = (e: Event) => e.preventDefault();
    document.addEventListener("gesturestart", stop, { passive: false });
    return () => {
      html.style.overflow = prev.overflow;
      html.style.overscrollBehavior = prev.overscroll;
      document.removeEventListener("gesturestart", stop);
    };
  }, []);
}

/**
 * Phones: a full-screen app shell. It is sized by CSS (fixed, inset 0), so Safari's toolbars and
 * the keyboard never re-layout the canvas mid-gesture. The picker lives in a drawer with three
 * heights (closed, half, full), dragged by its handle or tapped; the canvas takes whatever the
 * drawer leaves. The drawer is UI state only: opening or closing it never touches the design.
 */
function PhoneShell({ category, subtitle, onSave, saveBlocked, saving, top, stage, side, notice, toolbar, picker, pickerTitle, pickerFooter, footer }: FrameProps) {
  const { hasBase } = useContext(StudioSteps);
  useShellLock();
  const work = useRef<HTMLDivElement>(null);
  const tools = useRef<HTMLDivElement>(null);
  const drawer = useRef<HTMLElement>(null);
  const [space, setSpace] = useState({ work: 0, tools: 0 });
  const [state, setStateRaw] = useState<DrawerState>(storedDrawer);
  const stateRef = useRef(state);
  stateRef.current = state;
  const setState = useCallback((next: DrawerState) => {
    setStateRaw(next);
    try {
      sessionStorage.setItem(DRAWER_KEY, next);
    } catch {
      // Storage blocked: the drawer simply opens half way next time.
    }
  }, []);

  useLayoutEffect(() => {
    const measure = () => setSpace({ work: work.current?.clientHeight ?? 0, tools: tools.current?.offsetHeight ?? 0 });
    measure();
    const ro = new ResizeObserver(measure);
    if (work.current) ro.observe(work.current);
    if (tools.current) ro.observe(tools.current);
    return () => ro.disconnect();
  }, []);

  // Room for the canvas and the drawer; the canvas always keeps a visible part of the design.
  const avail = Math.max(0, space.work - space.tools);
  const halfH = Math.round(Math.max(PEEK + 64, Math.min(Math.max(avail * 0.5, Math.min(200, avail - 150)), avail - 150)));
  const fullH = Math.max(halfH, avail - 112);
  const heightOf = (s: DrawerState) => (space.work ? (s === "peek" ? PEEK : s === "half" ? halfH : fullH) : PEEK);
  const open = state !== "peek";

  // Adding something from the full drawer shows the result: the drawer drops to half.
  const designKey = `${footer.price}|${footer.summary}`;
  const lastDesign = useRef(designKey);
  useEffect(() => {
    if (designKey === lastDesign.current) return;
    lastDesign.current = designKey;
    if (stateRef.current === "full") setState("half");
  }, [designKey, setState]);

  // Picking an item up from the full drawer uncovers the canvas to drop it on.
  useEffect(
    () =>
      onDragChange((active) => {
        if (active && stateRef.current === "full") setState("half");
      }),
    [setState],
  );

  // Swiping the handle: the drawer follows the finger, then snaps to the nearest height (a flick counts).
  const swipe = useRef<{ id: number; y0: number; h0: number; moved: boolean; samples: { y: number; t: number }[] } | null>(null);
  const onHandleDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !drawer.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    swipe.current = { id: e.pointerId, y0: e.clientY, h0: drawer.current.offsetHeight, moved: false, samples: [{ y: e.clientY, t: e.timeStamp }] };
  };
  const onHandleMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = swipe.current;
    const node = drawer.current;
    if (!g || g.id !== e.pointerId || !node) return;
    const dy = e.clientY - g.y0;
    if (!g.moved && Math.abs(dy) < 6) return;
    g.moved = true;
    g.samples = [...g.samples.slice(-4), { y: e.clientY, t: e.timeStamp }];
    node.style.transition = "none";
    node.style.height = `${Math.min(fullH, Math.max(PEEK, g.h0 - dy))}px`;
  };
  const onHandleUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = swipe.current;
    const node = drawer.current;
    if (!g || g.id !== e.pointerId || !node) return;
    swipe.current = null;
    node.style.transition = "";
    if (!g.moved) {
      if (e.type === "pointerup") setState(open ? "peek" : "half");
      return;
    }
    const first = g.samples[0];
    const end = g.samples[g.samples.length - 1];
    const velocity = (end.y - first.y) / Math.max(1, end.t - first.t); // px/ms, positive = down
    const projected = node.offsetHeight - velocity * 160;
    const options: [DrawerState, number][] = [
      ["peek", PEEK],
      ["half", halfH],
      ["full", fullH],
    ];
    const [next] = options.reduce((best, o) => (Math.abs(o[1] - projected) < Math.abs(best[1] - projected) ? o : best));
    node.style.height = `${heightOf(next)}px`;
    setState(next);
  };

  const title = pickerTitle ?? t("studio.drawer.title");

  return (
    <div
      className="fixed inset-0 z-[60] flex touch-manipulation flex-col bg-background text-foreground"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingLeft: "env(safe-area-inset-left)", paddingRight: "env(safe-area-inset-right)" }}
    >
      <header className="flex shrink-0 items-center gap-1 px-2 pt-1">
        <button
          type="button"
          onClick={() => goBack(hasBase ? studioHref(category) : "#/studios")}
          aria-label={t("common.back")}
          title={t("common.back")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-secondary"
        >
          <Icon name="arrowLeft" size={20} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <h1 className="truncate font-display text-lg leading-tight font-semibold">{t("studio.phoneTitle", { name: category.name })}</h1>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={!!saveBlocked || saving}
          aria-label={saving ? t("studio.savingDesign") : t("studio.saveDesign")}
          title={saveBlocked ?? t("studio.saveDesign")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-secondary disabled:opacity-35"
        >
          <Icon name="bookmark" size={20} />
        </button>
      </header>

      {top && <div className="shrink-0 px-4 pt-1">{top}</div>}

      <div ref={work} className="flex min-h-0 flex-1 flex-col">
        <div className="relative flex min-h-0 flex-1 justify-center gap-2 px-4 pt-2 pb-1">
          <div className="h-full min-w-0 flex-1">{stage}</div>
          {side && <div className="h-full shrink-0">{side}</div>}
          <div className="pointer-events-none absolute inset-x-6 bottom-2 z-20">
            <Notice notice={notice} />
          </div>
        </div>

        {/* Browsing the full drawer hides the design tools; they come back with the canvas. */}
        <div ref={tools} className="shrink-0">
          {toolbar && state !== "full" && <div className="px-4 pb-2">{toolbar}</div>}
        </div>

        <section
          ref={drawer}
          aria-label={title}
          className="flex shrink-0 flex-col overflow-hidden rounded-t-[1.75rem] border-x border-t border-border bg-card shadow-[0_-10px_30px_-18px_rgb(0_0_0/0.5)] transition-[height] duration-300 ease-[cubic-bezier(.2,.7,.2,1)] motion-reduce:transition-none"
          style={{ height: heightOf(state) }}
          onTransitionEnd={(e) => {
            if (e.target === drawer.current && isDragging()) remeasureTargets();
          }}
        >
          <div
            className="flex shrink-0 cursor-grab touch-none items-center gap-1 pr-2 pl-4 select-none"
            style={{ height: PEEK }}
            onPointerDown={onHandleDown}
            onPointerMove={onHandleMove}
            onPointerUp={onHandleUp}
            onPointerCancel={onHandleUp}
          >
            <button
              type="button"
              aria-expanded={open}
              aria-controls="studio-drawer-content"
              // Taps arrive through the handle's pointer events; this answers the keyboard.
              onClick={(e) => e.detail === 0 && setState(open ? "peek" : "half")}
              className="relative flex h-full min-w-0 flex-1 items-center gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <span className="absolute top-1.5 left-1/2 h-1 w-9 -translate-x-1/2 rounded-full bg-border" aria-hidden="true" />
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary" aria-hidden="true">
                <Icon name="plus" size={18} />
              </span>
              <span className="min-w-0 flex-1 pt-1">
                <span className="block truncate text-sm font-semibold">{title}</span>
                <span className="block truncate text-xs text-muted-foreground">{open ? t("studio.drawer.hintOpen") : t("studio.drawer.hintClosed")}</span>
              </span>
              <Icon name="chevronDown" size={20} className={`shrink-0 text-muted-foreground transition-transform duration-300 ${open ? "" : "rotate-180"}`} />
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setState(state === "full" ? "half" : "full")}
              aria-label={state === "full" ? t("studio.drawer.shrink") : t("studio.drawer.expand")}
              title={state === "full" ? t("studio.drawer.shrink") : t("studio.drawer.expand")}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Icon name={state === "full" ? "minimize" : "maximize"} size={18} />
            </button>
          </div>
          {/* Always mounted, so filters and scroll position survive closing the drawer. */}
          <div id="studio-drawer-content" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4" aria-hidden={!open} inert={!open}>
            {picker}
          </div>
        </section>
      </div>

      {pickerFooter && <div className="shrink-0 border-t border-border bg-card px-4 py-2">{pickerFooter}</div>}

      <footer className="flex shrink-0 items-center gap-3 border-t border-border bg-card px-4 pt-3" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        <div className="min-w-0 flex-1">
          <p className="flex items-baseline gap-1.5">
            <AnimatedPrice cents={footer.price} className="font-display text-xl font-semibold text-primary" />
            {footer.priceLabel && <span className="text-xs text-muted-foreground">{footer.priceLabel.toLowerCase()}</span>}
          </p>
          <p className="truncate text-xs text-muted-foreground">{footer.primaryBlocked ?? footer.note ?? footer.summary}</p>
        </div>
        <Button size="sm" glow onClick={footer.onPrimary} disabled={!!footer.primaryBlocked} className={`min-h-11 ${footer.pulse ? "pulse-once" : ""}`}>
          {footer.primaryLabel ?? t("studio.preview")} <Icon name="arrowRight" size={16} />
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
    className?: string;
    children: ReactNode;
  }
>(function StageFrame({ label, chip, variant = "photo", toolbar, overlay, className = "", children }, ref) {
  const inner = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const phone = useIsPhone();

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
      } ${phone ? "h-full" : "h-[clamp(320px,62dvh,600px)]"} ${className}`}
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
        className={`relative flex min-h-0 flex-1 items-center justify-center ${phone ? "px-3 pt-3 pb-3" : "px-6 pt-16 pb-6"}`}
        style={{ "--stage-w": `${box.w - (phone ? 24 : 48)}px`, "--stage-h": `${box.h - (phone ? 12 : 64) - (phone ? 12 : 24)}px` } as CSSProperties}
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

/** What is selected on the canvas, with its own actions (Smaller, Larger, Rotate…). */
export interface ToolbarSelection {
  title: string;
  /** The item's picture; null shows a text icon; leave out for no picture. */
  image?: string | null;
  actions: ToolbarAction[];
  onDone: () => void;
}

/**
 * Every studio's one toolbar, always shown above the picker: undo, redo and clear all, plus the
 * selected item's actions. The buttons wrap onto more rows instead of scrolling out of sight;
 * labels show where there is room (phones show icons, with the label as the button name).
 */
export function StudioToolbar({ undo, redo, canUndo, canRedo, onClear, canClear, selection = null }: {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onClear: () => void;
  canClear: boolean;
  selection?: ToolbarSelection | null;
}) {
  const phone = useIsPhone();
  const actions: (ToolbarAction & { title?: string })[] = [
    { icon: "undo", label: t("studio.toolbar.undo"), title: t("studio.toolbar.undoHint"), onClick: undo, disabled: !canUndo },
    { icon: "redo", label: t("studio.toolbar.redo"), title: t("studio.toolbar.redoHint"), onClick: redo, disabled: !canRedo },
    ...(selection?.actions ?? []),
    // An eraser, so it never looks like the selected item's Delete.
    { icon: "eraser", label: t("studio.toolbar.clearAll"), onClick: onClear, disabled: !canClear, danger: true },
  ];
  return (
    <div
      role="toolbar"
      aria-label={selection ? t("studio.toolbar.itemActions", { name: selection.title }) : t("studio.toolbar.designActions")}
      className={`flex flex-col gap-1.5 border transition-colors ${phone ? "rounded-xl p-1" : "rounded-2xl p-2"} ${selection ? "border-primary/40 bg-primary/10" : "border-border bg-background/40"}`}
    >
      {selection && (
        <div className="flex items-center gap-2">
          {selection.image !== undefined && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-background/60">
              {selection.image ? <img {...corsImage} src={selection.image} alt="" className="h-8 w-8 object-contain" draggable={false} /> : <Icon name="type" size={16} />}
            </span>
          )}
          <p className="min-w-0 flex-1 truncate text-sm font-semibold">{selection.title}</p>
          <button type="button" onClick={selection.onDone} className="h-10 shrink-0 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
            {t("common.done")}
          </button>
        </div>
      )}
      <div className={`grid gap-1 ${phone ? "grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))]" : "grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))]"}`}>
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            onClick={a.onClick}
            disabled={a.disabled}
            aria-label={a.label}
            title={a.title ?? a.label}
            className={`flex min-w-0 flex-col items-center justify-center rounded-xl px-1 font-semibold transition-colors hover:bg-background/50 disabled:opacity-35 disabled:hover:bg-transparent ${phone ? "h-11" : "h-14 gap-1 text-[11px]"} ${
              a.danger ? "text-destructive" : "text-foreground"
            }`}
          >
            <Icon name={a.icon} size={18} />
            {!phone && <span className="max-w-full truncate">{a.label}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

import { useId, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type Ref } from "react";
import i18n from "../../i18n";
import { corsImage } from "../../studio/capture";
import { OLD_PRINT_CREAM, type MugArea } from "./logic";

/** Whether a saved print has the old cream background, read from its top-left pixel. */
function hasCreamBackground(img: HTMLImageElement) {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, 1, 1, 0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b].every((v, i) => Math.abs(v - OLD_PRINT_CREAM[i]) <= 4);
  } catch {
    // An image the browser won't let us read is shown as it is.
    return false;
  }
}

/**
 * A saved flat print on the mug. Prints are saved on white; ones saved earlier on cream are
 * shown white too, so the print never looks like a sticker on the mug.
 */
export function MugPrintImage({ src }: { src: string }) {
  const id = useId().replace(/:/g, "");
  const [cream, setCream] = useState(false);
  const [r, g, b] = OLD_PRINT_CREAM.map((v) => (255 / v).toFixed(4));
  return (
    <>
      {cream && (
        <svg width="0" height="0" className="absolute" aria-hidden="true">
          {/* Scales each channel so the cream becomes exactly white. */}
          <filter id={`cream-${id}`} colorInterpolationFilters="sRGB">
            <feColorMatrix type="matrix" values={`${r} 0 0 0 0  0 ${g} 0 0 0  0 0 ${b} 0 0  0 0 0 1 0`} />
          </filter>
        </svg>
      )}
      <img
        {...corsImage}
        src={src}
        alt=""
        draggable={false}
        onLoad={(e) => setCream(hasCreamBackground(e.currentTarget))}
        style={cream ? { filter: `url(#cream-${id})` } : undefined}
        className="absolute inset-0 h-full w-full"
      />
    </>
  );
}

export type MugView = "left" | "front" | "right";
export const MUG_VIEWS: MugView[] = ["left", "front", "right"];

/** Visual only: the print covers this share of the mug body's height. */
const PRINT_SHARE_OF_HEIGHT = 0.82;

/* The editor's mug, as in the app's Mug Studio. The real product is a white mug, drawn white
 * in both themes. */
const WHITE = "#FFFFFF";
const EDGE = "#D9D9DE";
const INSIDE = "#ECECEF";
/** Body height ÷ diameter of a standard mug (visual only). */
const BODY_ASPECT = 1.15;
/** The editor is drawn in these units; the page scales it to fit the stage. */
const UNITS = 1000;

/**
 * Where everything sits on the editor's mug (the app's mugGeometry). The body shows a window of
 * the print at its real proportions, about half of a typical wrap; `frame` is the WHOLE print,
 * so positions stay fractions of the full print and a design reads the same from every side.
 */
export function mugGeometry(area: MugArea, view: MugView) {
  const width = UNITS;
  const bodyWidth = width * 0.6;
  const bodyHeight = bodyWidth * BODY_ASPECT;
  const rimY = bodyWidth * 0.08;
  const height = bodyHeight + rimY * 2 + 8;
  const cx = width / 2;
  const top = rimY + 4;
  const printHeight = bodyHeight * PRINT_SHARE_OF_HEIGHT;
  const printTop = top + (bodyHeight - printHeight) / 2 + rimY * 0.4;
  const perMm = printHeight / area.heightMm;
  // The print visible on the body face, in mm, never more than the whole print.
  const visibleMm = Math.min(bodyWidth / perMm, area.widthMm);
  const windowWidth = visibleMm * perMm;
  const startMm = view === "left" ? 0 : view === "right" ? area.widthMm - visibleMm : (area.widthMm - visibleMm) / 2;
  const windowLeft = cx - windowWidth / 2;
  return {
    width,
    height,
    cx,
    top,
    rimY,
    bodyWidth,
    bodyHeight,
    perMm,
    frame: { left: windowLeft - startMm * perMm, top: printTop, width: area.widthMm * perMm, height: printHeight },
    window: { left: windowLeft, top: printTop, width: windowWidth, height: printHeight },
    /** Whether the print is wider than the body face, so turning the mug shows more. */
    turns: visibleMm < area.widthMm,
    /** The x (0–1 of the print) facing the customer, where new images and text land. */
    centre: (startMm + visibleMm / 2) / area.widthMm,
  };
}

/** The dashed safe area as placement bounds (fractions of the whole print). */
export const mugSafeBounds = (area: MugArea) => ({
  x0: area.safeMm.left / area.widthMm,
  y0: area.safeMm.top / area.heightMm,
  x1: 1 - area.safeMm.right / area.widthMm,
  y1: 1 - area.safeMm.bottom / area.heightMm,
});

/**
 * The Mug Studio's editor, like the app: the white mug seen from one side with the print on its
 * body. `children` (the placement layer) covers the whole print in `printRef`; only the part
 * facing the customer shows, and the other sides are reached by turning the mug.
 */
export function MugEditor({ area, view, printRef, onBackground, guides = true, label, children }: {
  area: MugArea;
  view: MugView;
  printRef?: Ref<HTMLDivElement>;
  /** A press on the mug outside the print, e.g. to clear the selection. */
  onBackground?: () => void;
  /** The dashed safe area and the print's edges; off where the mug is only shown. */
  guides?: boolean;
  /** Read out instead of the parts, where the mug is a picture (preview, order summary). */
  label?: string;
  children: ReactNode;
}) {
  const id = useId().replace(/:/g, "");
  const g = mugGeometry(area, view);
  const W = g.width;
  const H = g.height;
  const pct = (value: number, of: number) => `${(value / of) * 100}%`;
  const left = g.cx - g.bodyWidth / 2;
  const right = g.cx + g.bodyWidth / 2;
  const bottom = g.top + g.bodyHeight;
  const radius = g.bodyWidth / 2;
  const body = `M${left},${g.top} L${left},${bottom} A${radius},${g.rimY} 0 0 0 ${right},${bottom} L${right},${g.top} A${radius},${g.rimY} 0 0 1 ${left},${g.top} Z`;
  // The handle sits where the print starts (left view) or ends (right view); behind the mug from the front.
  const side = view === "left" ? -1 : view === "right" ? 1 : 0;
  const edgeX = side < 0 ? left + 2 : right - 2;
  const reach = radius * 0.62;
  const handle =
    side === 0
      ? null
      : `M${edgeX},${g.top + g.bodyHeight * 0.2} C${edgeX + side * reach},${g.top + g.bodyHeight * 0.14} ${edgeX + side * reach * 1.05},${g.top + g.bodyHeight * 0.72} ${edgeX},${g.top + g.bodyHeight * 0.74}`;
  const win = g.window;
  // The dashed safe area; only the parts inside the visible window are drawn.
  const safe = area.safeMm;
  const safeLeft = g.frame.left + safe.left * g.perMm;
  const safeRight = g.frame.left + g.frame.width - safe.right * g.perMm;
  const safeTop = win.top + safe.top * g.perMm;
  const safeBottom = win.top + win.height - safe.bottom * g.perMm;
  const fromX = Math.max(win.left, safeLeft);
  const toX = Math.min(win.left + win.width, safeRight);
  const inside = (x: number) => x >= win.left && x <= win.left + win.width;
  const dashed = { stroke: "var(--color-primary)", strokeWidth: 3, strokeDasharray: "12 10", vectorEffect: "non-scaling-stroke" as const };
  const background = (e: ReactPointerEvent) => e.target === e.currentTarget && onBackground?.();

  return (
    <div
      className="relative w-full select-none"
      style={{ aspectRatio: `${W} / ${H}` }}
      onPointerDown={background}
      {...(label ? { role: "img", "aria-label": label } : {})}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        {handle && (
          <>
            <path d={handle} fill="none" stroke={EDGE} strokeWidth={radius * 0.2 + 3} strokeLinecap="round" />
            <path d={handle} fill="none" stroke={WHITE} strokeWidth={radius * 0.2} strokeLinecap="round" />
          </>
        )}
        <path d={body} fill={WHITE} stroke={EDGE} strokeWidth={2} />
        <ellipse cx={g.cx} cy={g.top} rx={radius} ry={g.rimY} fill={WHITE} stroke={EDGE} strokeWidth={2} />
        <ellipse cx={g.cx} cy={g.top + 1} rx={radius * 0.9} ry={g.rimY * 0.78} fill={INSIDE} />
      </svg>

      <div className="absolute overflow-hidden" style={{ left: pct(win.left, W), top: pct(win.top, H), width: pct(win.width, W), height: pct(win.height, H) }}>
        {/* Turning the mug slides the print round (no motion with reduced motion). */}
        <div
          ref={printRef}
          className="absolute top-0 h-full transition-[left] duration-500 ease-out motion-reduce:transition-none"
          style={{ left: pct(g.frame.left - win.left, win.width), width: pct(g.frame.width, win.width) }}
        >
          {children}
        </div>
      </div>

      {/* Cylinder shading over the print, so images and text read as printed on the mug. */}
      <svg viewBox={`0 0 ${W} ${H}`} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <linearGradient id={`mug-shade-${id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#000" stopOpacity={0.14} />
            <stop offset="0.2" stopColor="#000" stopOpacity={0.02} />
            <stop offset="0.4" stopColor="#fff" stopOpacity={0.25} />
            <stop offset="0.55" stopColor="#fff" stopOpacity={0} />
            <stop offset="1" stopColor="#000" stopOpacity={0.16} />
          </linearGradient>
        </defs>
        <path d={body} fill={`url(#mug-shade-${id})`} />
        {/* Guides: the print area's ends (where visible) and the dashed safe area. */}
        {guides && (
          <>
            <rect x={win.left} y={win.top} width={win.width} height={win.height} fill="none" stroke={EDGE} strokeWidth={1.5} />
            {toX > fromX && (
              <>
                <line x1={fromX} y1={safeTop} x2={toX} y2={safeTop} {...dashed} />
                <line x1={fromX} y1={safeBottom} x2={toX} y2={safeBottom} {...dashed} />
              </>
            )}
            {inside(safeLeft) && <line x1={safeLeft} y1={safeTop} x2={safeLeft} y2={safeBottom} {...dashed} />}
            {inside(safeRight) && <line x1={safeRight} y1={safeTop} x2={safeRight} y2={safeBottom} {...dashed} />}
          </>
        )}
      </svg>
    </div>
  );
}

/** Left / Front / Right: turns the editor's mug, like the app's view tabs. */
export function MugViewTabs({ view, onChange }: { view: MugView; onChange: (view: MugView) => void }) {
  return (
    <div role="radiogroup" aria-label={i18n.t("mugs.sideOfMug")} className="grid grid-cols-3 gap-1 rounded-full border border-border bg-card p-1">
      {MUG_VIEWS.map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={view === v}
          onClick={() => onChange(v)}
          className={`min-h-10 rounded-full text-sm font-semibold transition-colors ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
        >
          {i18n.t(`mugs.views.${v}`)}
        </button>
      ))}
    </div>
  );
}

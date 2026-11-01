import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Icon, type IconName } from "../components/Icon";
import type { Bounds } from "../data/studioCatalog";
import { Artwork } from "./artworks";
import {
  FONTS,
  FULL_BOUNDS,
  MAX_SCALE,
  MIN_SCALE,
  TEXT_BASE,
  TEXT_COLORS,
  constrain,
  describeElement,
  sameGeometry,
  type PlacedElement,
} from "./elements";

export type LayerCommand = "forward" | "backward" | "duplicate" | "delete" | "reset";
export type LayerAction = "smaller" | "larger" | "rotateLeft" | "rotateRight" | LayerCommand;

export const ALL_ACTIONS: LayerAction[] = ["smaller", "larger", "rotateLeft", "rotateRight", "forward", "backward", "duplicate", "delete"];

const ACTION_META: Record<LayerAction, [IconName, string]> = {
  smaller: ["zoomOut", "Smaller"],
  larger: ["zoomIn", "Larger"],
  rotateLeft: ["rotateLeft", "Rotate left"],
  rotateRight: ["rotateRight", "Rotate right"],
  forward: ["arrowUp", "Bring forward"],
  backward: ["arrowDown", "Send backward"],
  duplicate: ["copy", "Duplicate"],
  delete: ["trash", "Delete"],
  reset: ["reset", "Reset"],
};

interface Gesture {
  kind: "move" | "transform";
  start: PlacedElement;
  px: number;
  py: number;
  cx: number;
  cy: number;
  a0: number;
  d0: number;
  last?: PlacedElement;
}

const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

/** Snap rotation to the nearest 45° when within 3°. */
function snapRotation(r: number) {
  const nearest = Math.round(r / 45) * 45;
  return Math.abs(r - nearest) < 3 ? nearest : Math.round(r);
}

export function ElementContent({ el, W }: { el: PlacedElement; W: number }) {
  if (el.kind === "text") {
    return (
      <span
        className="block leading-[1.1] whitespace-pre"
        style={{
          fontSize: W * TEXT_BASE,
          fontFamily: FONTS[el.font ?? "classic"].family,
          fontWeight: el.weight ?? 400,
          fontStyle: el.italic ? "italic" : "normal",
          color: TEXT_COLORS[el.color ?? "gold"].value,
        }}
      >
        {el.text}
      </span>
    );
  }
  const style = { width: W, height: W * el.aspect };
  if (el.src) return <img src={el.src} alt="" draggable={false} style={style} className="block max-w-none object-cover" />;
  return <div style={style}>{el.art && <Artwork id={el.art} />}</div>;
}

interface Props {
  elements: PlacedElement[];
  /** Describes the design for assistive tech. */
  label: string;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  /** Commit a moved / resized / rotated element. `merge` folds bursts into one undo step. */
  onChange?: (el: PlacedElement, merge?: string) => void;
  onCommand?: (command: LayerCommand, id: string) => void;
  /** Elements stay inside (`contain`) or always cover (`cover`) these bounds. */
  bounds?: Bounds;
  mode?: "contain" | "cover";
  actions?: LayerAction[];
  readOnly?: boolean;
  wheelZoom?: boolean;
  className?: string;
}

/** Free placement of images and text with drag, resize/rotate handle, action bar and keyboard control. */
export function PlacementLayer({
  elements,
  label,
  selectedId = null,
  onSelect,
  onChange,
  onCommand,
  bounds = FULL_BOUNDS,
  mode = "contain",
  actions = ALL_ACTIONS,
  readOnly = false,
  wheelZoom = false,
  className = "",
}: Props) {
  const root = useRef<HTMLDivElement>(null);
  const nodes = useRef(new Map<string, HTMLDivElement>());
  const gesture = useRef<Gesture | null>(null);
  const frame = useRef(0);
  const [{ W, H }, setSize] = useState({ W: 0, H: 0 });
  const [live, setLive] = useState<PlacedElement | null>(null);

  useLayoutEffect(() => {
    const node = root.current;
    if (!node) return;
    const measure = () => setSize({ W: node.clientWidth, H: node.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  /** Unrotated size in px of an element at a given scale. */
  const dims = (el: PlacedElement, s: number) => {
    if (el.kind === "image") return { w: s * W, h: s * W * el.aspect };
    const node = nodes.current.get(el.id);
    return { w: (node?.offsetWidth ?? W * 0.4) * s, h: (node?.offsetHeight ?? W * 0.1) * s };
  };

  const fit = (el: PlacedElement) => constrain(el, { W, H }, (s) => dims(el, s), bounds, mode);

  // Keep every element inside its bounds, e.g. after the box shape or phone model changed.
  useLayoutEffect(() => {
    if (readOnly || !W || gesture.current) return;
    for (const el of elements) {
      const fitted = fit(el);
      if (!sameGeometry(fitted, el)) onChange?.(fitted, "amend");
    }
  });

  const latest = useRef({ elements, selectedId, onChange, fit });
  useLayoutEffect(() => {
    latest.current = { elements, selectedId, onChange, fit };
  });

  useEffect(() => {
    const node = root.current;
    if (!node || !wheelZoom || readOnly) return;
    const onWheel = (e: WheelEvent) => {
      const { elements: list, selectedId: sel, onChange: change, fit: fitEl } = latest.current;
      const el = list.find((x) => x.id === sel) ?? (list.length === 1 ? list[0] : undefined);
      if (!el) return;
      e.preventDefault();
      change?.(fitEl({ ...el, scale: clampScale(el.scale * Math.exp(-e.deltaY * 0.0015)) }), `wheel-${el.id}`);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [wheelZoom, readOnly]);

  const commit = (el: PlacedElement, merge?: string) => onChange?.(fit(el), merge);

  const begin = (e: ReactPointerEvent<HTMLElement>, el: PlacedElement, kind: Gesture["kind"]) => {
    if (readOnly || !root.current) return;
    e.stopPropagation();
    onSelect?.(el.id);
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = root.current.getBoundingClientRect();
    const cx = r.left + el.x * W;
    const cy = r.top + el.y * H;
    gesture.current = {
      kind,
      start: el,
      px: e.clientX,
      py: e.clientY,
      cx,
      cy,
      a0: Math.atan2(e.clientY - cy, e.clientX - cx),
      d0: Math.hypot(e.clientX - cx, e.clientY - cy) || 1,
    };
  };

  const move = (e: ReactPointerEvent<HTMLElement>) => {
    const g = gesture.current;
    if (!g) return;
    let next: PlacedElement;
    if (g.kind === "move") {
      if (Math.hypot(e.clientX - g.px, e.clientY - g.py) < 2 && !g.last) return;
      next = { ...g.start, x: g.start.x + (e.clientX - g.px) / W, y: g.start.y + (e.clientY - g.py) / H };
    } else {
      const a = Math.atan2(e.clientY - g.cy, e.clientX - g.cx);
      const d = Math.hypot(e.clientX - g.cx, e.clientY - g.cy);
      next = {
        ...g.start,
        scale: clampScale((g.start.scale * d) / g.d0),
        rotation: snapRotation(g.start.rotation + ((a - g.a0) * 180) / Math.PI),
      };
    }
    g.last = fit(next);
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => setLive(g.last ?? null));
  };

  const end = () => {
    const g = gesture.current;
    gesture.current = null;
    cancelAnimationFrame(frame.current);
    setLive(null);
    if (g?.last) onChange?.(g.last);
  };

  const act = (a: LayerAction, el: PlacedElement) => {
    switch (a) {
      case "smaller":
        return commit({ ...el, scale: clampScale(el.scale / 1.15) });
      case "larger":
        return commit({ ...el, scale: clampScale(el.scale * 1.15) });
      case "rotateLeft":
        return commit({ ...el, rotation: el.rotation - 15 });
      case "rotateRight":
        return commit({ ...el, rotation: el.rotation + 15 });
      default:
        onCommand?.(a, el.id);
    }
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>, el: PlacedElement) => {
    const step = e.shiftKey ? 0.05 : 0.01;
    const merge = `key-${el.id}`;
    let next: PlacedElement | null = null;
    switch (e.key) {
      case "ArrowLeft":
        next = { ...el, x: el.x - step };
        break;
      case "ArrowRight":
        next = { ...el, x: el.x + step };
        break;
      case "ArrowUp":
        next = { ...el, y: el.y - step };
        break;
      case "ArrowDown":
        next = { ...el, y: el.y + step };
        break;
      case "+":
      case "=":
        next = { ...el, scale: clampScale(el.scale * 1.08) };
        break;
      case "-":
      case "_":
        next = { ...el, scale: clampScale(el.scale / 1.08) };
        break;
      case "[":
        next = { ...el, rotation: el.rotation - 15 };
        break;
      case "]":
        next = { ...el, rotation: el.rotation + 15 };
        break;
      case "Delete":
      case "Backspace":
        e.preventDefault();
        onCommand?.("delete", el.id);
        return;
      case "Escape":
        onSelect?.(null);
        e.currentTarget.blur();
        return;
      default:
        return;
    }
    e.preventDefault();
    commit(next, merge);
  };

  const sorted = [...elements].sort((a, b) => a.z - b.z);
  const committedSelected = readOnly ? undefined : elements.find((e) => e.id === selectedId);
  const selected = committedSelected && live?.id === committedSelected.id ? live : committedSelected;

  return (
    <div
      ref={root}
      role="group"
      aria-label={label}
      className={`absolute inset-0 overflow-hidden select-none ${className}`}
      onPointerDown={() => !readOnly && onSelect?.(null)}
    >
      {W > 0 &&
        sorted.map((committed) => {
          const el = live?.id === committed.id ? live : committed;
          return (
            <div
              key={el.id}
              ref={(node) => {
                if (node) nodes.current.set(el.id, node);
                else nodes.current.delete(el.id);
              }}
              role={readOnly ? undefined : "button"}
              tabIndex={readOnly ? undefined : 0}
              aria-label={readOnly ? undefined : describeElement(el)}
              aria-pressed={readOnly ? undefined : el.id === selectedId}
              onPointerDown={(e) => begin(e, committed, "move")}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
              onFocus={() => !readOnly && onSelect?.(el.id)}
              onKeyDown={(e) => onKey(e, committed)}
              className={`absolute top-0 left-0 outline-none ${
                readOnly ? "pointer-events-none" : "cursor-grab touch-none active:cursor-grabbing"
              }`}
              style={{
                transform: `translate(${el.x * W}px, ${el.y * H}px) translate(-50%, -50%) rotate(${el.rotation}deg) scale(${el.scale})`,
              }}
            >
              <ElementContent el={el} W={W} />
            </div>
          );
        })}

      {selected && W > 0 && (
        <Selection
          el={selected}
          size={dims(selected, selected.scale)}
          W={W}
          H={H}
          actions={actions}
          onHandleDown={(e) => committedSelected && begin(e, committedSelected, "transform")}
          onHandleMove={move}
          onHandleUp={end}
          onAction={(a) => committedSelected && act(a, committedSelected)}
        />
      )}
    </div>
  );
}

function Selection({ el, size, W, H, actions, onHandleDown, onHandleMove, onHandleUp, onAction }: {
  el: PlacedElement;
  size: { w: number; h: number };
  W: number;
  H: number;
  actions: LayerAction[];
  onHandleDown: (e: ReactPointerEvent<HTMLElement>) => void;
  onHandleMove: (e: ReactPointerEvent<HTMLElement>) => void;
  onHandleUp: () => void;
  onAction: (a: LayerAction) => void;
}) {
  const rad = (el.rotation * Math.PI) / 180;
  const ey = (size.w * Math.abs(Math.sin(rad)) + size.h * Math.abs(Math.cos(rad))) / 2;
  const barW = Math.min(W - 8, actions.length * 34 + 8);
  const cx = el.x * W;
  const cy = el.y * H;
  let top = cy - ey - 50;
  if (top < 4) top = cy + ey + 12;
  top = Math.min(Math.max(4, top), H - 46);
  const left = Math.min(Math.max(4, cx - barW / 2), W - barW - 4);

  return (
    <>
      <div
        className="pointer-events-none absolute top-0 left-0 z-[1000] rounded-md border-2 border-primary"
        style={{
          width: size.w,
          height: size.h,
          transform: `translate(${cx}px, ${cy}px) translate(-50%, -50%) rotate(${el.rotation}deg)`,
        }}
      >
        <button
          type="button"
          aria-label="Drag to resize and rotate"
          title="Drag to resize and rotate"
          className="pointer-events-auto absolute -right-3.5 -bottom-3.5 flex h-7 w-7 cursor-nwse-resize touch-none items-center justify-center rounded-full border-2 border-primary bg-background"
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={onHandleUp}
        >
          <span className="h-2 w-2 rounded-full bg-primary" />
        </button>
      </div>

      <div
        role="toolbar"
        aria-label="Element actions"
        className="absolute z-[1001] flex flex-wrap justify-center gap-0.5 rounded-full border border-border bg-background/90 p-1 shadow-glow backdrop-blur-md"
        style={{ left, top, width: barW }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {actions.map((a) => {
          const [icon, label] = ACTION_META[a];
          return (
            <button
              key={a}
              type="button"
              aria-label={label}
              title={label}
              onClick={() => onAction(a)}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-secondary ${
                a === "delete" ? "text-destructive" : "text-foreground"
              }`}
            >
              <Icon name={icon} size={15} />
            </button>
          );
        })}
      </div>
    </>
  );
}

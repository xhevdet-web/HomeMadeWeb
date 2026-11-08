/**
 * Drag and drop for the studios, with Pointer Events only (HTML5 draggable doesn't work with
 * iOS touch). The ghost is a plain DOM node moved with transforms in requestAnimationFrame, so
 * nothing re-renders per pointer move. Drop targets register themselves and get over/leave/drop.
 */

export interface Point {
  x: number;
  y: number;
}

export interface DragPayload {
  /** "component": from a picker. "bead": a piece lifted off the cord to reorder. */
  kind: "component" | "bead";
  id: string;
  name: string;
  image: string | null;
  /** Ghost shape: round for beads, rounded square for canvas items. */
  shape?: "circle" | "square";
  index?: number;
}

export interface DropTarget {
  el: HTMLElement;
  over?: (p: Point, payload: DragPayload) => void;
  leave?: () => void;
  /** Return true when the drop was accepted (the ghost shrinks in), false to fly it back. */
  drop: (p: Point, payload: DragPayload) => boolean;
}

const targets = new Set<DropTarget>();
const listeners = new Set<(active: DragPayload | null) => void>();

export function registerTarget(target: DropTarget) {
  targets.add(target);
  return () => {
    targets.delete(target);
  };
}

/** Subscribe to drag start/end (e.g. to show a print area only while dragging). */
export function onDragChange(fn: (active: DragPayload | null) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const GHOST = 72;
/** The ghost sits up and left of the finger so it stays visible. */
const OFFSET = 36;

interface Session {
  payload: DragPayload;
  ghost: HTMLDivElement;
  origin: DOMRect;
  x: number;
  y: number;
  frame: number;
  rects: Map<DropTarget, DOMRect>;
  current: DropTarget | null;
  onEnd?: () => void;
}

let session: Session | null = null;

export const isDragging = () => !!session;

function preventScroll(e: TouchEvent) {
  if (session && e.cancelable) e.preventDefault();
}

let blockers = 0;

/**
 * Keeps a scroll-blocking touchmove listener on the page while drag sources are mounted.
 * Safari (and Chrome) decide whether a touch can be kept from scrolling when it starts, so a
 * listener added once the long press lifts the item came too late: the picker scrolled under the
 * finger, the browser cancelled the pointer and the item flew back. It only blocks during a drag.
 */
export function holdScrollBlocker() {
  if (blockers++ === 0) document.addEventListener("touchmove", preventScroll, { passive: false });
  return () => {
    if (--blockers === 0) document.removeEventListener("touchmove", preventScroll);
  };
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Escape") cancelDrag();
}

/** Measures the drop targets again, e.g. after the phone drawer changed height mid-drag. */
export function remeasureTargets() {
  measure();
}

function measure() {
  if (!session) return;
  session.rects = new Map([...targets].map((t) => [t, t.el.getBoundingClientRect()]));
}

function hit(p: Point) {
  if (!session) return null;
  for (const [t, r] of session.rects) if (p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom) return t;
  return null;
}

function place() {
  if (!session) return;
  const s = session;
  s.ghost.style.transform = `translate3d(${s.x - OFFSET - GHOST / 2}px, ${s.y - OFFSET - GHOST / 2}px, 0)`;
}

export function beginDrag(payload: DragPayload, origin: DOMRect, p: Point, onEnd?: () => void) {
  if (session) cancelDrag();
  const ghost = document.createElement("div");
  ghost.setAttribute("aria-hidden", "true");
  ghost.className = `pointer-events-none fixed top-0 left-0 z-[90] flex items-center justify-center border-2 border-primary bg-card shadow-glow ${
    payload.shape === "square" ? "rounded-2xl" : "rounded-full"
  }`;
  Object.assign(ghost.style, { width: `${GHOST}px`, height: `${GHOST}px`, willChange: "transform", transition: "none" });
  if (payload.image) {
    const img = document.createElement("img");
    img.src = payload.image;
    img.alt = "";
    img.draggable = false;
    img.className = "h-[80%] w-[80%] object-contain";
    ghost.appendChild(img);
  } else {
    ghost.textContent = payload.name.slice(0, 2);
    ghost.className += " font-display text-lg font-semibold";
  }
  document.body.appendChild(ghost);
  session = { payload, ghost, origin, x: p.x, y: p.y, frame: 0, rects: new Map(), current: null, onEnd };
  measure();
  place();
  navigator.vibrate?.(10);
  window.addEventListener("keydown", onKey);
  window.addEventListener("scroll", measure, true);
  window.addEventListener("resize", measure);
  document.documentElement.classList.add("no-callout");
  listeners.forEach((fn) => fn(payload));
  moveDrag(p);
}

export function moveDrag(p: Point) {
  if (!session) return;
  const s = session;
  s.x = p.x;
  s.y = p.y;
  cancelAnimationFrame(s.frame);
  s.frame = requestAnimationFrame(() => {
    if (session !== s) return;
    place();
    const target = hit(p);
    if (target !== s.current) {
      s.current?.leave?.();
      s.current = target;
    }
    target?.over?.(p, s.payload);
  });
}

function finish(animate: (ghost: HTMLDivElement) => void) {
  if (!session) return;
  const s = session;
  session = null;
  cancelAnimationFrame(s.frame);
  s.current?.leave?.();
  window.removeEventListener("keydown", onKey);
  window.removeEventListener("scroll", measure, true);
  window.removeEventListener("resize", measure);
  document.documentElement.classList.remove("no-callout");
  listeners.forEach((fn) => fn(null));
  s.onEnd?.();
  if (reduced()) {
    s.ghost.remove();
    return;
  }
  s.ghost.style.transition = "transform 180ms cubic-bezier(.2,.7,.2,1), opacity 180ms ease-out";
  animate(s.ghost);
  window.setTimeout(() => s.ghost.remove(), 200);
}

/** Drop where the pointer is. */
export function endDrag(p: Point) {
  if (!session) return;
  const s = session;
  s.x = p.x;
  s.y = p.y;
  measure();
  const target = hit(p);
  const accepted = !!target && target.drop(p, s.payload);
  if (accepted)
    finish((g) => {
      g.style.transform = `translate3d(${p.x - GHOST / 2}px, ${p.y - GHOST / 2}px, 0) scale(0.4)`;
      g.style.opacity = "0";
    });
  else flyBack();
}

function flyBack() {
  if (!session) return;
  const o = session.origin;
  finish((g) => {
    g.style.transform = `translate3d(${o.left + o.width / 2 - GHOST / 2}px, ${o.top + o.height / 2 - GHOST / 2}px, 0) scale(0.6)`;
    g.style.opacity = "0";
  });
}

/** pointercancel or Esc: the ghost goes back to where it came from and nothing changes. */
export function cancelDrag() {
  flyBack();
}

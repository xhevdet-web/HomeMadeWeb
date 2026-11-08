import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject, type MouseEvent as ReactMouseEvent } from "react";
import { beginDrag, cancelDrag, endDrag, holdScrollBlocker, isDragging, moveDrag, onDragChange, registerTarget, type DragPayload, type Point } from "./controller";

/** A touch long press this long picks an item up, like the app's activateAfterLongPress(220). */
export const LONG_PRESS_MS = 220;
/** Moving further than this before the long press means the finger is scrolling. */
const SCROLL_SLOP = 8;
/** A mouse or pen drag starts after this much movement. */
const MOUSE_SLOP = 4;

interface Press {
  id: number;
  type: string;
  x0: number;
  y0: number;
  x: number;
  y: number;
  timer: number;
  dragging: boolean;
  el: HTMLElement | SVGElement;
}

/**
 * Makes an element a drag source. A tap (or Enter) calls `onTap`; a touch long press or a
 * mouse drag picks it up. Returns props to spread on the element.
 */
export function useDragSource(getPayload: () => DragPayload | null, onTap: () => void, { disabled = false }: { disabled?: boolean } = {}) {
  const press = useRef<Press | null>(null);
  const handlers = useRef({ getPayload, onTap });
  useEffect(() => {
    handlers.current = { getPayload, onTap };
  });

  useEffect(() => {
    const release = holdScrollBlocker();
    return () => {
      release();
      if (press.current) window.clearTimeout(press.current.timer);
    };
  }, []);

  const lift = () => {
    const p = press.current;
    const payload = handlers.current.getPayload();
    if (!p || !payload) return;
    p.dragging = true;
    try {
      p.el.setPointerCapture(p.id);
    } catch {
      // The pointer may already be gone.
    }
    p.el.style.transition = "transform 150ms, opacity 150ms";
    p.el.style.transform = "scale(0.95)";
    p.el.style.opacity = "0.5";
    const el = p.el;
    beginDrag(payload, el.getBoundingClientRect(), { x: p.x, y: p.y }, () => {
      el.style.transform = "";
      el.style.opacity = "";
    });
  };

  const onPointerDown = (e: ReactPointerEvent<Element>) => {
    if (disabled || e.button !== 0 || isDragging()) return;
    const p: Press = { id: e.pointerId, type: e.pointerType, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, timer: 0, dragging: false, el: e.currentTarget as HTMLElement | SVGElement };
    press.current = p;
    if (e.pointerType === "touch") p.timer = window.setTimeout(lift, LONG_PRESS_MS);
  };

  const onPointerMove = (e: ReactPointerEvent<Element>) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    p.x = e.clientX;
    p.y = e.clientY;
    const moved = Math.hypot(p.x - p.x0, p.y - p.y0);
    if (p.dragging) moveDrag({ x: p.x, y: p.y });
    else if (p.type === "touch") {
      if (moved > SCROLL_SLOP) {
        // A scroll: let the picker scroll and don't drag.
        window.clearTimeout(p.timer);
        press.current = null;
      }
    } else if (moved > MOUSE_SLOP) lift();
  };

  const onPointerUp = (e: ReactPointerEvent<Element>) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    window.clearTimeout(p.timer);
    press.current = null;
    if (p.dragging) endDrag({ x: e.clientX, y: e.clientY });
    else handlers.current.onTap();
  };

  const onPointerCancel = () => {
    const p = press.current;
    if (!p) return;
    window.clearTimeout(p.timer);
    press.current = null;
    if (p.dragging) cancelDrag();
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    // Keyboard activation (Enter/Space) arrives as a click with detail 0; pointer taps are handled on pointerup.
    onClick: (e: ReactMouseEvent) => {
      if (e.detail === 0 && !disabled) handlers.current.onTap();
    },
    onContextMenu: (e: ReactMouseEvent) => e.preventDefault(),
  };
}

export interface DropHandlers {
  over?: (p: Point, payload: DragPayload) => void;
  leave?: () => void;
  drop: (p: Point, payload: DragPayload) => boolean;
}

/** Registers an element as a drop target while mounted. */
export function useDropTarget(ref: RefObject<HTMLElement | null>, handlers: DropHandlers) {
  const h = useRef(handlers);
  useEffect(() => {
    h.current = handlers;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return registerTarget({
      el,
      over: (p, d) => h.current.over?.(p, d),
      leave: () => h.current.leave?.(),
      drop: (p, d) => h.current.drop(p, d),
    });
  }, [ref]);
}

/** The payload being dragged right now, or null. Updates only at drag start and end. */
export function useActiveDrag() {
  const [active, setActive] = useState<DragPayload | null>(null);
  useEffect(() => onDragChange(setActive), []);
  return active;
}

/** Stage highlight for a drop target: the chip text while something is over it. */
export function useStageDrop(
  ref: RefObject<HTMLElement | null>,
  label: (p: Point, payload: DragPayload) => string,
  drop: (p: Point, payload: DragPayload) => boolean,
  onLeave?: () => void,
) {
  const [chip, setChip] = useState<string | null>(null);
  useDropTarget(ref, {
    over: (p, d) => {
      const next = label(p, d);
      setChip((c) => (c === next ? c : next));
    },
    leave: () => {
      setChip(null);
      onLeave?.();
    },
    drop: (p, d) => {
      setChip(null);
      return drop(p, d);
    },
  });
  return chip;
}

export type { DragPayload, Point };

import { useEffect, useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import i18n from "../i18n";
import { Icon } from "../components/Icon";

/**
 * A sheet that slides up from the bottom (centred dialog on wide screens). It never navigates
 * away, so the design underneath is never lost. Closes by swiping down, the backdrop or Esc;
 * traps focus while open and returns it when it closes. Sits above the on-screen keyboard.
 */
export function BottomSheet({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y0: number; dy: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = panel.current;
    node?.querySelector<HTMLElement>("input, textarea, select, button:not([data-sheet-close])")?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && node) {
        const focusable = [...node.querySelectorAll<HTMLElement>("button, input, textarea, select, a[href], [tabindex]:not([tabindex='-1'])")].filter((el) => !el.hasAttribute("disabled"));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    // Keep the sheet above the keyboard on phones.
    const vv = window.visualViewport;
    const lift = () => {
      if (node && vv) node.style.marginBottom = `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`;
    };
    vv?.addEventListener("resize", lift);
    vv?.addEventListener("scroll", lift);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      vv?.removeEventListener("resize", lift);
      vv?.removeEventListener("scroll", lift);
      previous?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!open) return null;

  // Swipe down on the handle area to close.
  const down = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { y0: e.clientY, dy: 0 };
  };
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag.current || !panel.current) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.y0);
    panel.current.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const up = () => {
    const dy = drag.current?.dy ?? 0;
    drag.current = null;
    if (panel.current) panel.current.style.transform = "";
    if (dy > 80) onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6" style={{ animation: "fade-in 150ms ease-out both" }}>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[85dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[2rem] border border-border bg-card shadow-glow transition-transform duration-200 sm:rounded-[2rem]"
        style={{ animation: "sheet-up 220ms cubic-bezier(.2,.7,.2,1) both", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="touch-none px-6 pt-3 pb-2" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <div className="mx-auto h-1.5 w-10 rounded-full bg-border" aria-hidden="true" />
          <div className="mt-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">{title}</h2>
            <button
              type="button"
              data-sheet-close
              onClick={onClose}
              aria-label={i18n.t("common.close")}
              className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-secondary"
            >
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto overscroll-contain px-6 pt-2 pb-6">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

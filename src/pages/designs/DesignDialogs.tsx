import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { SavedDesign } from "../../api/designs";
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { NAME_MAX } from "./useDesignActions";

/**
 * A centred dialog: traps focus while open, Escape and the backdrop cancel, and focus goes back
 * to where it was when it closes.
 */
function Dialog({ open, onClose, labelledBy, children }: { open: boolean; onClose: () => void; labelledBy: string; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = panel.current;
    const focusable = () => [...(node?.querySelectorAll<HTMLElement>("button, input, a[href], [tabindex]:not([tabindex='-1'])") ?? [])].filter((el) => !el.hasAttribute("disabled"));
    // The first field, or else the first button, gets focus.
    (node?.querySelector<HTMLElement>("input") ?? focusable()[0])?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.({ preventScroll: true });
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" style={{ animation: "fade-in 150ms ease-out both" }}>
      <div className="absolute inset-0 bg-[rgba(5,8,18,0.72)]" onClick={onClose} aria-hidden="true" />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={labelledBy} className="relative w-full max-w-[420px] rounded-[18px] border border-border bg-card p-6 shadow-glow">
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function DeleteDesignDialog({ saved, onCancel, onConfirm }: { saved: SavedDesign | null; onCancel: () => void; onConfirm: () => void }) {
  const { t } = useTranslation();
  const id = useId();
  return (
    <Dialog open={!!saved} onClose={onCancel} labelledBy={id}>
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/12 text-destructive">
        <Icon name="trash" size={20} />
      </span>
      <h2 id={id} className="mt-4 font-display text-[22px] leading-tight font-semibold">
        {t("designs.deleteTitle")}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{saved && t("designs.deleteText", { name: saved.name })}</p>
      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button variant="neutral" size="sm" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        {/* Danger: its own colours rather than an override of the primary button. */}
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#C93C34] px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#B5332C] active:scale-[0.98]"
        >
          <Icon name="trash" size={15} />
          {t("designs.deleteConfirm")}
        </button>
      </div>
    </Dialog>
  );
}

export function RenameDesignDialog({ saved, onCancel, onSave }: { saved: SavedDesign | null; onCancel: () => void; onSave: (name: string) => Promise<boolean> }) {
  const { t } = useTranslation();
  const id = useId();
  const field = useId();
  const input = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!saved) return;
    setName(saved.name.slice(0, NAME_MAX));
    // Pre-filled and selected, so typing replaces it.
    window.requestAnimationFrame(() => input.current?.select());
  }, [saved]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    const ok = await onSave(name);
    setBusy(false);
    if (ok) onCancel();
  };

  return (
    <Dialog open={!!saved} onClose={onCancel} labelledBy={id}>
      <form onSubmit={submit}>
        <h2 id={id} className="font-display text-[22px] leading-tight font-semibold">
          {t("designs.renameTitle")}
        </h2>
        <label htmlFor={field} className="mt-5 block text-sm font-semibold">
          {t("designs.nameLabel")}
        </label>
        <input
          ref={input}
          id={field}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={NAME_MAX}
          className="mt-2 w-full rounded-[10px] border border-primary bg-background px-4 py-3 text-foreground focus:ring-2 focus:ring-primary/40 focus:outline-none"
        />
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t("designs.renameHint")}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="neutral" size="sm" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" size="sm" disabled={!name.trim() || busy}>
            {t("designs.save")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

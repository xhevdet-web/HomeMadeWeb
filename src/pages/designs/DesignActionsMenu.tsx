import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { SavedDesign } from "../../api/designs";
import { Button } from "../../components/Button";
import { Icon, type IconName } from "../../components/Icon";
import { BottomSheet } from "../../studio/BottomSheet";

export interface MenuTarget {
  saved: SavedDesign;
  anchor: HTMLElement;
}

export interface MenuActions {
  /** Studio link to continue this design; null when its studio is gone. */
  editHref: (saved: SavedDesign) => string | null;
  rename: (saved: SavedDesign) => void;
  duplicate: (saved: SavedDesign) => void;
  remove: (saved: SavedDesign) => void;
}

/** True below 640px, where the menu is a bottom sheet. */
export function usePhone() {
  const query = "(max-width: 639px)";
  const [phone, setPhone] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const list = window.matchMedia(query);
    const change = () => setPhone(list.matches);
    list.addEventListener("change", change);
    return () => list.removeEventListener("change", change);
  }, []);
  return phone;
}

interface Item {
  key: string;
  label: string;
  icon: IconName;
  danger?: boolean;
  href?: string;
  run?: () => void;
}

function itemsFor(saved: SavedDesign, actions: MenuActions, t: (key: "designs.editInStudio" | "designs.rename" | "designs.duplicate" | "designs.delete") => string): (Item | "divider")[] {
  const edit = actions.editHref(saved);
  return [
    ...(edit ? [{ key: "edit", label: t("designs.editInStudio"), icon: "pencil" as const, href: edit }] : []),
    { key: "rename", label: t("designs.rename"), icon: "type", run: () => actions.rename(saved) },
    { key: "duplicate", label: t("designs.duplicate"), icon: "copy", run: () => actions.duplicate(saved) },
    "divider",
    { key: "delete", label: t("designs.delete"), icon: "trash", danger: true, run: () => actions.remove(saved) },
  ];
}

/**
 * The ⋯ menu of a design: a dropdown under its button on wider screens (in a portal, so the
 * card never clips it), a bottom sheet on phones. One at a time; closes on an outside click,
 * Escape or a choice, and gives focus back to the ⋯ button.
 */
export function DesignActionsMenu({ target, onClose, actions }: { target: MenuTarget | null; onClose: () => void; actions: MenuActions }) {
  const { t } = useTranslation();
  const phone = usePhone();
  const panel = useRef<HTMLDivElement>(null);
  const buttons = useRef<(HTMLElement | null)[]>([]);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

  const close = (refocus = true) => {
    const anchor = target?.anchor;
    onClose();
    if (refocus) anchor?.focus({ preventScroll: true });
  };

  // Desktop: placed under the ⋯ button, right edges aligned.
  useLayoutEffect(() => {
    if (!target || phone) return setPos(null);
    const place = () => {
      const r = target.anchor.getBoundingClientRect();
      setPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [target, phone]);

  useEffect(() => {
    if (!target || phone) return;
    const onPointer = (e: PointerEvent) => {
      const node = e.target as Node;
      // The ⋯ button toggles the menu itself.
      if (panel.current?.contains(node) || target.anchor.contains(node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, phone]);

  // The first item gets focus once the menu is placed (it is hidden until then, and hidden
  // elements can't take focus), so the arrow keys work straight away.
  const placed = !!pos;
  useEffect(() => {
    if (target && !phone && placed) buttons.current.find(Boolean)?.focus();
  }, [target, phone, placed]);

  if (!target) return null;
  const items = itemsFor(target.saved, actions, t);
  const choose = (item: Item) => {
    // Focus goes back to ⋯ first, so a dialog opened next returns focus there when it closes.
    close();
    item.run?.();
  };

  if (phone)
    return (
      <BottomSheet title={target.saved.name} open onClose={() => close()}>
        <ul className="-mx-2 flex flex-col">
          {items.map((item, i) =>
            item === "divider" ? (
              <li key={`d${i}`} className="mx-2 my-1 border-t border-border" role="separator" />
            ) : (
              <li key={item.key}>
                <MenuRow item={item} tall onChoose={choose} />
              </li>
            ),
          )}
        </ul>
        <Button variant="neutral" className="mt-4 w-full" onClick={() => close()}>
          {t("common.cancel")}
        </Button>
      </BottomSheet>
    );

  const onKey = (e: ReactKeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const list = buttons.current.filter(Boolean) as HTMLElement[];
    const at = list.indexOf(document.activeElement as HTMLElement);
    const next = e.key === "Home" ? 0 : e.key === "End" ? list.length - 1 : (at + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length;
    list[next]?.focus();
  };

  buttons.current = [];
  return createPortal(
    <div
      ref={panel}
      role="menu"
      aria-label={t("designs.actions", { name: target.saved.name })}
      onKeyDown={onKey}
      className="fixed z-[60] w-[210px] rounded-xl border border-white/12 bg-[#1A2338] p-1.5 shadow-[0_18px_40px_rgba(0,0,0,0.5)]"
      style={pos ? { top: pos.top, right: pos.right } : { visibility: "hidden" }}
    >
      {items.map((item, i) =>
        item === "divider" ? (
          <div key={`d${i}`} role="separator" className="my-1 border-t border-white/10" />
        ) : (
          <MenuRow
            key={item.key}
            item={item}
            onChoose={choose}
            register={(el) => {
              buttons.current.push(el);
            }}
          />
        ),
      )}
    </div>,
    document.body,
  );
}

function MenuRow({ item, onChoose, tall = false, register }: { item: Item; onChoose: (item: Item) => void; tall?: boolean; register?: (el: HTMLElement | null) => void }) {
  const look = `flex w-full items-center gap-3 rounded-lg px-3 text-left font-medium outline-none transition-colors ${tall ? "h-[52px] text-base" : "h-10 text-[13.5px]"} ${
    item.danger ? "text-[#FF8A80] hover:bg-[rgba(255,107,94,0.12)] focus-visible:bg-[rgba(255,107,94,0.12)]" : "hover:bg-white/7 focus-visible:bg-white/7"
  }`;
  const content = (
    <>
      <Icon name={item.icon} size={16} className={item.danger ? "" : "text-muted-foreground"} />
      {item.label}
    </>
  );
  return item.href ? (
    <a ref={register} role="menuitem" href={item.href} className={look} onClick={() => onChoose({ ...item, run: undefined })}>
      {content}
    </a>
  ) : (
    <button ref={register} type="button" role="menuitem" className={look} onClick={() => onChoose(item)}>
      {content}
    </button>
  );
}

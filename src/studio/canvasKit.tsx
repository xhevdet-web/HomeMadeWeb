import { useRef, type ReactNode, type RefObject } from "react";
import { Icon } from "../components/Icon";
import { useDragSource, useStageDrop, type DragPayload } from "./dnd/hooks";
import type { PlacedElement } from "./elements";
import type { LayerCommand } from "./PlacementLayer";
import type { ToolbarAction } from "./StudioFrame";
import { playOnce, useIsPhone } from "./ui";
import { corsImage } from "./capture";

/** A picker tile that can be tapped (or Enter) and held-and-dragged onto the stage. */
export function DragTile({
  id,
  name,
  image,
  price,
  badge,
  disabled = false,
  selected = false,
  onTap,
  size = "md",
}: {
  id: string;
  name: string;
  image: string | null;
  price?: string;
  badge?: string | null;
  disabled?: boolean;
  selected?: boolean;
  onTap: () => void;
  size?: "md" | "lg";
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const drag = useDragSource(
    () => (disabled ? null : ({ kind: "component", id, name, image, shape: "square" } satisfies DragPayload)),
    () => {
      if (disabled) playOnce(ref.current, "shake");
      onTap();
    },
  );
  return (
    <button
      ref={ref}
      type="button"
      {...drag}
      aria-disabled={disabled}
      aria-pressed={selected || undefined}
      aria-label={`${name}${price ? `, ${price}` : ""}${badge ? `, ${badge}` : ""}`}
      className={`no-callout group flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border text-left transition-colors [touch-action:pan-x_pan-y] ${
        selected ? "border-primary" : "border-border hover:border-foreground/30"
      } ${disabled ? "opacity-45" : ""} ${size === "lg" ? "w-28" : ""}`}
    >
      <span className="relative flex aspect-square w-full items-center justify-center bg-secondary p-2">
        {image ? (
          <img {...corsImage} src={image} alt="" loading="lazy" decoding="async" draggable={false} className="img-fade h-full w-full object-contain" />
        ) : (
          <span className="text-xs text-muted-foreground">No picture</span>
        )}
        {badge && <span className="absolute top-1.5 right-1.5 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-semibold text-foreground">{badge}</span>}
      </span>
      <span className="line-clamp-2 px-2.5 pt-2 text-xs leading-tight font-semibold">{name}</span>
      {price && <span className="px-2.5 pt-0.5 pb-2.5 text-[11px] text-primary">{price}</span>}
    </button>
  );
}

/** Large tiles in one sideways row on phones, a grid on wider screens (like the app's ComponentPicker). */
export function TileRow({ children, cols = "grid-cols-3" }: { children: ReactNode; cols?: string }) {
  const phone = useIsPhone();
  return phone ? (
    <ul className="-mx-4 flex gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:none]">{children}</ul>
  ) : (
    <ul className={`grid gap-2 ${cols}`}>{children}</ul>
  );
}

export const TileItem = ({ children }: { children: ReactNode }) => <li className="w-28 shrink-0 md:w-auto">{children}</li>;

/**
 * The stage accepts picker drags. `area` is the element whose box the drop position is measured
 * in (0–1 fractions), e.g. the gift box or the print area.
 */
export function useCanvasDrop(stage: RefObject<HTMLElement | null>, area: RefObject<HTMLElement | null>, label: string, onDrop: (fx: number, fy: number, payload: DragPayload) => boolean) {
  return useStageDrop(
    stage,
    () => label,
    (p, payload) => {
      const r = area.current?.getBoundingClientRect();
      if (!r) return false;
      return onDrop((p.x - r.left) / r.width, (p.y - r.top) / r.height, payload);
    },
  );
}

/** The app's canvas toolbar buttons for a selected element. Scale and position are clamped by the layer. */
export function elementActions(
  el: PlacedElement,
  change: (el: PlacedElement) => void,
  command: (cmd: LayerCommand) => void,
  opts: { layers?: boolean; duplicate?: boolean; reset?: boolean; centre?: { x: number; y: number } } = {},
): ToolbarAction[] {
  const actions: ToolbarAction[] = [
    { icon: "zoomOut", label: "Smaller", onClick: () => change({ ...el, scale: el.scale / 1.15 }) },
    { icon: "zoomIn", label: "Larger", onClick: () => change({ ...el, scale: el.scale * 1.15 }) },
    { icon: "rotateLeft", label: "Rotate left", onClick: () => change({ ...el, rotation: el.rotation - 15 }) },
    { icon: "rotateRight", label: "Rotate right", onClick: () => change({ ...el, rotation: el.rotation + 15 }) },
  ];
  if (opts.layers !== false) {
    actions.push({ icon: "arrowUp", label: "Forward", onClick: () => command("forward") });
    actions.push({ icon: "arrowDown", label: "Backward", onClick: () => command("backward") });
  }
  if (opts.duplicate) actions.push({ icon: "copy", label: "Duplicate", onClick: () => command("duplicate") });
  if (opts.centre) {
    const c = opts.centre;
    actions.push({ icon: "reset", label: "Centre", onClick: () => change({ ...el, x: c.x, y: c.y }) });
  }
  if (opts.reset) actions.push({ icon: "reset", label: "Reset", onClick: () => command("reset") });
  actions.push({ icon: "trash", label: "Delete", onClick: () => command("delete"), danger: true });
  return actions;
}

export function UploadHint({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 text-xs text-muted-foreground">
      <Icon name="alert" size={13} className="mt-0.5 text-primary" />
      <span>{children}</span>
    </p>
  );
}

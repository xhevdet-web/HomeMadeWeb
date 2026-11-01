import type { ReactNode } from "react";
import type { GarmentId, Side } from "../../data/studioCatalog";
import type { ApparelDraft } from "../../studio/drafts";
import { PlacementLayer } from "../../studio/PlacementLayer";
import { colorOf, garmentOf } from "./logic";

const BODY: Record<GarmentId, string> = {
  hoodie:
    "M62 40 30 54q-10 6-12 22L8 150l24 6 14-60 2 108q52 8 104 0l2-108 14 60 24-6-10-74q-2-16-12-22l-32-14q-38 24-76 0Z",
  tee: "M66 30 30 46 10 92l30 14 12-26v126q48 6 96 0V80l12 26 30-14-20-46-36-16q-34 18-68 0Z",
  crewneck:
    "M64 32 32 48q-10 6-12 22l-10 80 22 6 14-64 2 112q52 8 104 0l2-112 14 64 22-6-10-80q-2-16-12-22l-32-16q-36 18-72 0Z",
};

/** Flat SVG silhouette of a garment in its colour, front or back. */
export function GarmentShape({ garment, color, dark, side }: { garment: GarmentId; color: string; dark: boolean; side: Side }) {
  const line = dark ? "oklch(1 0 0 / 0.14)" : "oklch(0 0 0 / 0.16)";
  const shade = dark ? "oklch(0 0 0 / 0.35)" : "oklch(0 0 0 / 0.1)";
  return (
    <g>
      {garment === "hoodie" && side === "front" && <path d="M64 44Q60 8 100 6t36 38Z" fill={color} />}
      {garment === "hoodie" && side === "front" && <path d="M64 44Q60 8 100 6t36 38Z" fill={shade} />}
      <path d={BODY[garment]} fill={color} stroke={line} strokeWidth="1.2" />
      <g fill="none" stroke={line} strokeWidth="1.5" strokeLinecap="round">
        {garment === "hoodie" &&
          (side === "front" ? (
            <>
              <path d="M76 42q24 28 48 0-24-8-48 0Z" fill={shade} />
              <path d="M92 58v26M108 58v26" />
              <path d="M66 152h68l8 34H58Z" />
            </>
          ) : (
            <path d="M66 46Q60 10 100 8t34 38q-34 14-68 0Z" fill={color} />
          ))}
        {garment === "tee" && <path d={side === "front" ? "M74 32q26 22 52 0" : "M76 31q24 10 48 0"} strokeWidth="3" />}
        {garment === "crewneck" && (
          <>
            <path d={side === "front" ? "M74 34q26 24 52 0" : "M76 33q24 10 48 0"} strokeWidth="4" />
            <path d="M48 198q52 8 104 0M12 142l20 5M188 142l-20 5" strokeWidth="3" />
          </>
        )}
        {garment === "hoodie" && <path d="M48 196q52 8 104 0M10 142l22 6M190 142l-22 6" strokeWidth="3" />}
      </g>
    </g>
  );
}

/** Garment with a dashed PRINT AREA; children (a placement layer) sit on top. */
export function GarmentCanvas({ draft, side, children }: { draft: ApparelDraft; side: Side; children?: ReactNode }) {
  const garment = garmentOf(draft);
  const color = colorOf(draft.colorId);
  if (!garment) return null;
  const area = garment.print[side];
  return (
    <div className="relative w-full" style={{ aspectRatio: "200 / 220" }}>
      <svg viewBox="0 0 200 220" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <GarmentShape garment={garment.id} color={color.color} dark={color.dark} side={side} />
      </svg>
      <div
        className="pointer-events-none absolute rounded-md border border-dashed"
        style={{
          left: `${area.x0 * 100}%`,
          top: `${area.y0 * 100}%`,
          width: `${(area.x1 - area.x0) * 100}%`,
          height: `${(area.y1 - area.y0) * 100}%`,
          borderColor: color.dark ? "oklch(1 0 0 / 0.45)" : "oklch(0 0 0 / 0.35)",
        }}
      >
        <span
          className="absolute -top-4 left-0 text-[9px] font-semibold tracking-[0.2em] uppercase"
          style={{ color: color.dark ? "oklch(1 0 0 / 0.6)" : "oklch(0 0 0 / 0.5)" }}
        >
          Print area
        </span>
      </div>
      {children}
    </div>
  );
}

export function ApparelThumb({ draft, side = "front" }: { draft: ApparelDraft; side?: Side }) {
  return (
    <GarmentCanvas draft={draft} side={side}>
      <PlacementLayer elements={draft[side]} label={`${side} of the garment`} readOnly />
    </GarmentCanvas>
  );
}

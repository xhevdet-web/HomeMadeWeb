import i18n from "../../i18n";
import { useId, type ReactNode } from "react";
import type { PrintArea, Product } from "../../api/models";
import type { CaseDraft } from "../../studio/drafts";
import { PlacementLayer } from "../../studio/PlacementLayer";
import { useImageRatio } from "../apparel/logic";
import type { StudioData } from "../data";
import { caseAreas, modelOf } from "./logic";
import { corsImage } from "../../studio/capture";

/** SVG path of a rounded rectangle; rx / ry may differ (fractions of a box that isn't square). */
function roundedRect(x: number, y: number, w: number, h: number, rx: number, ry: number) {
  rx = Math.min(rx, w / 2);
  ry = Math.min(ry, h / 2);
  return (
    `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}` +
    `H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z`
  );
}

/** A template area (0–1 of the template, radius a share of its width) in uniform units: the template is 100 wide. */
const areaPath = (a: PrintArea, ratio: number) => {
  const r = (a.radius ?? 0) * a.width * 100;
  return roundedRect(a.x * 100, (a.y * 100) / ratio, a.width * 100, (a.height * 100) / ratio, r, r);
};

/**
 * A phone model's template with the artwork clipped to its printable area, like the app:
 * the camera opening is cut out of the artwork (evenodd), so the template's real camera shows.
 * Then the overlay, and while editing the dashed guides of the printable area and the camera.
 */
export function CaseCanvas({ model, children, safeArea = true }: { model: Product | null; children?: ReactNode; safeArea?: boolean }) {
  const clipId = `case-clip-${useId().replace(/:/g, "")}`;
  const ratio = useImageRatio(model?.imageUrl ?? null);
  const shown = model?.imageUrl ? ratio : 0.49;
  const { area, camera } = caseAreas(model);
  const pct = (v: number) => `${v * 100}%`;

  // The clip in the printable area's own box (0–1 both ways): its rounded outline minus the camera.
  const k = (area.width * shown) / area.height; // area-height units per area-width unit
  const r = area.radius ?? 0;
  let clip = roundedRect(0, 0, 1, 1, r, r * k);
  if (camera) {
    const cx = (camera.x - area.x) / area.width;
    const cy = (camera.y - area.y) / area.height;
    const cr = ((camera.radius ?? 0) * camera.width) / area.width;
    clip += roundedRect(cx, cy, camera.width / area.width, camera.height / area.height, cr, cr * k);
  }
  const guides = [areaPath(area, shown), ...(camera ? [areaPath(camera, shown)] : [])];

  return (
    <div className="relative w-full" style={{ aspectRatio: String(shown) }}>
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <clipPath id={clipId} clipPathUnits="objectBoundingBox">
          <path d={clip} fillRule="evenodd" clipRule="evenodd" />
        </clipPath>
      </svg>
      {model?.imageUrl ? (
        <img {...corsImage} src={model.imageUrl} alt="" draggable={false} className="absolute inset-0 h-full w-full" />
      ) : (
        <div className="absolute inset-0 rounded-[14%/7%] border border-border bg-secondary" />
      )}
      <div className="absolute" style={{ left: pct(area.x), top: pct(area.y), width: pct(area.width), height: pct(area.height), clipPath: `url(#${clipId})` }}>
        {children}
      </div>
      {model?.overlayImageUrl && <img {...corsImage} src={model.overlayImageUrl} alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full" />}
      {safeArea && (
        <svg viewBox={`0 0 100 ${100 / shown}`} className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          {guides.map((d) => (
            <g key={d}>
              <path d={d} fill="none" stroke="white" strokeOpacity={0.55} strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
              <path
                d={d}
                fill="none"
                stroke="var(--primary)"
                strokeOpacity={0.85}
                strokeWidth={1.5}
                strokeDasharray="7 6"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

export function CaseThumb({ draft, data }: { draft: CaseDraft; data: StudioData }) {
  const model = modelOf(draft, data);
  return (
    <div className="mx-auto h-full max-h-full" style={{ aspectRatio: "0.5" }}>
      <CaseCanvas model={model} safeArea={false}>
        <PlacementLayer elements={draft.elements} label={i18n.t("cases.caseOf", { name: model?.name ?? i18n.t("cases.phone") })} readOnly />
      </CaseCanvas>
    </div>
  );
}

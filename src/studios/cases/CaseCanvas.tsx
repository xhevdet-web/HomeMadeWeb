import i18n from "../../i18n";
import { useId, type ReactNode } from "react";
import type { Product } from "../../api/models";
import type { CaseDraft } from "../../studio/drafts";
import { PlacementLayer } from "../../studio/PlacementLayer";
import { useImageRatio } from "../apparel/logic";
import type { StudioData } from "../data";
import { caseTemplate, modelOf, PLACEHOLDER_RATIO } from "./logic";
import { areaFrame, cameraCutPath, cameraShape, printableShape, safeShape, shapePath, templateFrame } from "./geometry";
import { corsImage } from "../../studio/capture";

/**
 * A phone model's template with the artwork clipped to its printable shape (per-corner radii),
 * then the camera opening cut out of it (a second, even-odd clip), so the template's real camera
 * shows even where the camera reaches past the printable edge. Then the overlay, and while
 * editing (`safeArea`) the guides: the printable outline and camera (dashed) and the safe area
 * (dotted, brighter while `active`). Where a zoomed-out design leaves the case uncovered, the
 * template itself (the case's own colour) shows, as in the saved preview. While the case is
 * empty, `placeholder` fills the printable shape white with a short prompt. Guides and placeholder are screen-only: never part of the
 * saved preview.
 * Geometry comes from ./geometry, the same as the saved preview and the admin editor.
 */
export function CaseCanvas({
  model,
  children,
  safeArea = true,
  active = true,
  placeholder,
}: {
  model: Product | null;
  children?: ReactNode;
  safeArea?: boolean;
  active?: boolean;
  placeholder?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const clipId = `case-clip-${uid}`;
  const cutId = `case-cut-${uid}`;
  const ratio = useImageRatio(model?.imageUrl ?? null);
  const shown = model?.imageUrl ? ratio : PLACEHOLDER_RATIO;
  const t = caseTemplate(model);
  const { area } = t;
  const pct = (v: number) => `${v * 100}%`;

  // Clips in the printable area's own box (0–1 both ways, objectBoundingBox).
  const local = areaFrame(area);
  const clip = shapePath(printableShape(t, shown), local);
  const cut = cameraCutPath(t, shown, local);
  // Guides in template units: 100 wide, 100 / ratio high, so corners stay round.
  const view = templateFrame(shown);
  const camera = cameraShape(t, shown);
  const safe = safeShape(t, shown);
  const outlines = [shapePath(printableShape(t, shown), view), ...(camera ? [shapePath(camera, view)] : [])];

  return (
    <div className="relative w-full" style={{ aspectRatio: String(shown) }}>
      <svg width="0" height="0" className="absolute" aria-hidden="true">
        <clipPath id={clipId} clipPathUnits="objectBoundingBox">
          <path d={clip} />
        </clipPath>
        {cut && (
          <clipPath id={cutId} clipPathUnits="objectBoundingBox">
            <path d={cut} fillRule="evenodd" clipRule="evenodd" />
          </clipPath>
        )}
      </svg>
      {model?.imageUrl ? (
        <img {...corsImage} src={model.imageUrl} alt="" draggable={false} className="absolute inset-0 h-full w-full" />
      ) : (
        <div className="absolute inset-0 rounded-[14%/7%] border border-border bg-secondary" />
      )}
      <div
        data-case-area=""
        className="absolute"
        style={{ left: pct(area.x), top: pct(area.y), width: pct(area.width), height: pct(area.height), clipPath: `url(#${clipId})` }}
      >
        <div className="absolute inset-0" style={cut ? { clipPath: `url(#${cutId})` } : undefined}>
          {placeholder && (
            <div
              data-case-placeholder=""
              className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white px-[12%] text-center"
              style={{ containerType: "inline-size" }}
            >
              <p className="font-semibold leading-snug text-neutral-500" style={{ fontSize: "clamp(11px, 7.5cqw, 18px)" }}>
                <span aria-hidden="true" className="mx-auto mb-[0.5em] flex size-[2.2em] items-center justify-center rounded-full border border-dashed border-neutral-400 text-[1.3em] leading-none">
                  +
                </span>
                {placeholder}
              </p>
            </div>
          )}
          {children}
        </div>
      </div>
      {model?.overlayImageUrl && <img {...corsImage} src={model.overlayImageUrl} alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full" />}
      {safeArea && (
        <svg
          data-case-guides=""
          viewBox={`0 0 100 ${100 / shown}`}
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          aria-hidden="true"
        >
          {outlines.map((d) => (
            <g key={d}>
              <path
                d={d}
                fill="none"
                stroke="var(--primary)"
                strokeOpacity={0.7}
                strokeWidth={1}
                strokeDasharray="4 4"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}
          {safe && (
            <g data-case-safe="" className="transition-opacity duration-300 motion-reduce:transition-none" style={{ opacity: active ? 1 : 0.45 }}>
              <path
                d={shapePath(safe, view)}
                fill="none"
                stroke="var(--primary)"
                strokeOpacity={0.55}
                strokeWidth={1}
                strokeDasharray="2 4"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )}
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

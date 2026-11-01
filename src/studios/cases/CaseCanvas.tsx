import type { ReactNode } from "react";
import type { Product } from "../../api/models";
import type { CaseDraft } from "../../studio/drafts";
import { PlacementLayer } from "../../studio/PlacementLayer";
import { useImageRatio } from "../apparel/logic";
import type { StudioData } from "../data";
import { caseAreas, modelOf } from "./logic";
import { corsImage } from "../../studio/capture";

/**
 * A phone model's template with the artwork clipped to its printable area (rounded by its
 * radius). Above the artwork the camera opening shows the template again, then the overlay.
 */
export function CaseCanvas({ model, children, safeArea = true }: { model: Product | null; children?: ReactNode; safeArea?: boolean }) {
  const ratio = useImageRatio(model?.imageUrl ?? null);
  const shown = model?.imageUrl ? ratio : 0.49;
  const { area, camera } = caseAreas(model);
  const radius = (r: number, w: number, h: number) => `${(r * 100).toFixed(2)}% / ${((r * w * shown) / h) * 100}%`;
  const pct = (v: number) => `${v * 100}%`;

  return (
    <div className="relative w-full" style={{ aspectRatio: String(shown) }}>
      {model?.imageUrl ? (
        <img {...corsImage} src={model.imageUrl} alt="" draggable={false} className="absolute inset-0 h-full w-full" />
      ) : (
        <div className="absolute inset-0 rounded-[14%/7%] border border-border bg-secondary" />
      )}
      <div
        className="absolute overflow-hidden bg-secondary/60"
        style={{ left: pct(area.x), top: pct(area.y), width: pct(area.width), height: pct(area.height), borderRadius: radius(area.radius ?? 0, area.width, area.height) }}
      >
        {children}
        {safeArea && (
          <div
            className="pointer-events-none absolute inset-[4%] border-2 border-dashed border-primary/70"
            style={{ borderRadius: radius(area.radius ?? 0, area.width, area.height) }}
          />
        )}
      </div>
      {model?.imageUrl && camera && (
        <img {...corsImage}
          src={model.imageUrl}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full"
          style={{
            clipPath: `inset(${pct(camera.y)} ${pct(1 - camera.x - camera.width)} ${pct(1 - camera.y - camera.height)} ${pct(camera.x)} round ${(camera.radius ?? 0) * camera.width * 100}% / ${(camera.radius ?? 0) * camera.width * shown * 100}%)`,
          }}
        />
      )}
      {model?.overlayImageUrl && <img {...corsImage} src={model.overlayImageUrl} alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full" />}
    </div>
  );
}

export function CaseThumb({ draft, data }: { draft: CaseDraft; data: StudioData }) {
  const model = modelOf(draft, data);
  return (
    <div className="mx-auto h-full max-h-full" style={{ aspectRatio: "0.5" }}>
      <CaseCanvas model={model} safeArea={false}>
        <PlacementLayer elements={draft.elements} label={`${model?.name ?? "Phone"} case`} readOnly />
      </CaseCanvas>
    </div>
  );
}

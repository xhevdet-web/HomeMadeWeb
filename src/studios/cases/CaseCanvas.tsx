import type { ReactNode } from "react";
import type { PhoneModel } from "../../data/studioCatalog";
import type { CaseDraft } from "../../studio/drafts";
import { PlacementLayer } from "../../studio/PlacementLayer";
import { getModel } from "../../data/studioCatalog";

/** Case outline for a model: its corner radius, the camera cut-out and a dashed safe area. */
export function CaseCanvas({ model, children, safeArea = true }: { model: PhoneModel; children?: ReactNode; safeArea?: boolean }) {
  const r = model.radius * 100;
  const radius = `${r}% / ${r / model.aspect}%`;
  const cam = model.camera;
  const camAspect = (cam.h * model.aspect) / cam.w;
  const vbH = 100 * camAspect;
  const lensUnit = Math.min(100, vbH);

  return (
    <div
      className="relative w-full overflow-hidden border border-border bg-secondary"
      style={{ aspectRatio: `1 / ${model.aspect}`, borderRadius: radius }}
    >
      {children}
      {safeArea && (
        <div
          className="pointer-events-none absolute border-2 border-dashed border-primary/70"
          style={{ inset: `${5 / model.aspect}% 5%`, borderRadius: radius }}
        />
      )}
      <div
        className="pointer-events-none absolute border border-white/15 bg-[oklch(0.16_0.01_265)] shadow-[0_4px_12px_oklch(0_0_0/0.4)]"
        style={{
          left: `${cam.x * 100}%`,
          top: `${cam.y * 100}%`,
          width: `${cam.w * 100}%`,
          height: `${cam.h * 100}%`,
          borderRadius: `${cam.round * 100}%`,
        }}
      >
        <svg viewBox={`0 0 100 ${vbH}`} className="h-full w-full" aria-hidden="true">
          {model.lenses.map(([x, y, lr], i) => (
            <g key={i}>
              <circle cx={x * 100} cy={y * vbH} r={lr * lensUnit} fill="oklch(0.1 0.01 265)" stroke="oklch(0.4 0.01 265)" strokeWidth="2" />
              <circle cx={x * 100 - lr * lensUnit * 0.3} cy={y * vbH - lr * lensUnit * 0.3} r={lr * lensUnit * 0.22} fill="oklch(0.5 0.05 250 / 0.6)" />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export function CaseThumb({ draft }: { draft: CaseDraft }) {
  const model = getModel(draft.modelId);
  if (!model) return null;
  return (
    <div className="mx-auto h-full" style={{ aspectRatio: `1 / ${model.aspect}` }}>
      <CaseCanvas model={model} safeArea={false}>
        <PlacementLayer elements={draft.elements} label={`${model.name} case`} readOnly />
      </CaseCanvas>
    </div>
  );
}

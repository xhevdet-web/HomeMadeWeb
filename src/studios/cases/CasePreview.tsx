import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSaveDesign, useStudio } from "../../studio/StudioContext";
import { DetailRows, NothingToPreview, PreviewActions, PreviewLayout, PriceLines, StudioShell } from "../../studio/StudioShell";
import { useImageRatio } from "../apparel/logic";
import { componentById, stockProblem, type StudioProps } from "../data";
import { CaseCanvas } from "./CaseCanvas";
import { PlacementLayer } from "../../studio/PlacementLayer";
import { areaAspect, captureCase, caseAreas, caseImage, caseInput, casePrice, isSoldOut, modelOf } from "./logic";

export function CasePreview({ category, data }: StudioProps) {
  const d = useStudio().getDraft(category.id, "CASE");
  const byId = useMemo(() => componentById(data), [data]);
  const model = modelOf(d, data);
  const image = caseImage(d);
  const ratio = useImageRatio(model?.imageUrl ?? null);
  const ofArea = areaAspect(caseAreas(model).area, model?.imageUrl ? ratio : 0.49);
  const saver = useSaveDesign(category, async () => {
    const { input, uploads } = await caseInput(category, d, model!, ofArea);
    return { input, files: { preview: await captureCase(d, model!), customDesigns: uploads } };
  });
  const title = (
    <>
      Your <em className="font-normal text-primary">case.</em>
    </>
  );

  if (!image || !model) {
    return (
      <StudioShell category={category} step={2} title={title}>
        <NothingToPreview category={category} message="Add a design or your own photo first." />
      </StudioShell>
    );
  }

  const designPrice = byId.get(image.ref ?? "")?.price ?? 0;
  const blocked = isSoldOut(model)
    ? "This phone model is no longer available. Choose another one; your image stays."
    : image.missing
      ? "Re-upload your photo to continue."
      : null;

  return (
    <StudioShell category={category} step={2} title={title} intro="This is how your case will look. We print it by hand once you order.">
      <PreviewLayout
        visual={
          <Tilt>
            <CaseCanvas model={model} safeArea={false}>
              <PlacementLayer elements={d.elements} label={`${model.name} case`} readOnly />
            </CaseCanvas>
          </Tilt>
        }
      >
        <DetailRows
          rows={[
            ["Phone", model.name],
            ["Design", image.name ?? "Your photo"],
          ]}
        />
        <PriceLines lines={[[`${model.name} case`, model.price], ...(designPrice ? [[image.name ?? "Design", designPrice] as [string, number]] : [])]} total={casePrice(d, model, byId)} />
        <PreviewActions category={category} onSave={saver.save} onOrder={saver.order} saving={saver.saving} orderBlocked={blocked ?? stockProblem(d.elements.map((e) => e.ref), byId)} saveBlocked={blocked} />
      </PreviewLayout>
    </StudioShell>
  );
}

const MAX_TILT = 14;
const clampTilt = (v: number) => Math.max(-MAX_TILT, Math.min(MAX_TILT, v));
const reducedMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

type OrientationPermission = { requestPermission?: () => Promise<"granted" | "denied"> };

/**
 * The case leans toward the cursor on desktop; on phones it follows the device's tilt once the
 * customer allows motion access (iOS asks for permission). Off with reduced motion.
 */
function Tilt({ children }: { children: ReactNode }) {
  const [t, setT] = useState({ x: 0, y: 0 });
  const [motion, setMotion] = useState<"off" | "on" | "denied">("off");
  const frame = useRef(0);
  const still = reducedMotion();
  const touch = typeof matchMedia !== "undefined" && matchMedia("(hover: none)").matches;
  const supported = typeof window !== "undefined" && "DeviceOrientationEvent" in window;

  const set = (x: number, y: number) => {
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => setT({ x: clampTilt(x), y: clampTilt(y) }));
  };

  useEffect(() => {
    if (motion !== "on") return;
    let base: { b: number; g: number } | null = null;
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      base ??= { b: e.beta, g: e.gamma };
      set(-(e.beta - base.b) * 0.6, (e.gamma - base.g) * 0.6);
    };
    window.addEventListener("deviceorientation", onTilt);
    return () => window.removeEventListener("deviceorientation", onTilt);
  }, [motion]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const enable = async () => {
    const api = (window as unknown as { DeviceOrientationEvent: OrientationPermission }).DeviceOrientationEvent;
    try {
      const result = api.requestPermission ? await api.requestPermission() : "granted";
      setMotion(result === "granted" ? "on" : "denied");
    } catch {
      setMotion("denied");
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className="[perspective:1000px]"
        onPointerMove={(e) => {
          if (still || e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          set(-((e.clientY - r.top) / r.height - 0.5) * 2 * MAX_TILT, ((e.clientX - r.left) / r.width - 0.5) * 2 * MAX_TILT);
        }}
        onPointerLeave={() => set(0, 0)}
      >
        <div
          className="w-[min(260px,70vw)] drop-shadow-[0_30px_40px_oklch(0_0_0/0.5)] transition-transform duration-300 ease-out motion-reduce:transition-none"
          style={still ? undefined : { transform: `rotateX(${t.x}deg) rotateY(${t.y}deg)` }}
        >
          {children}
        </div>
      </div>
      {touch && supported && !still && motion !== "on" && (
        <button type="button" onClick={() => void enable()} className="mt-6 min-h-11 rounded-full border border-border px-4 text-sm font-semibold transition-colors hover:bg-secondary">
          {motion === "denied" ? "Motion access was declined" : "Tilt your phone to look around"}
        </button>
      )}
    </div>
  );
}

import { useState, type ReactNode } from "react";
import { colorAvailable, needsColor, packagingAvailable, type GiftPackaging } from "../../api/models";
import { studioHref } from "../../data/homeCategories";
import { money } from "../../lib/format";
import { useStudio } from "../../studio/StudioContext";
import { ContinueButton, StudioShell } from "../../studio/StudioShell";
import { ReadyMade } from "../ReadyMade";
import type { StudioProps } from "../data";
import { GiftBox } from "./GiftBox";
import { corsImage } from "../../studio/capture";

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="rounded-[2rem] border border-border bg-card p-6 sm:p-8">
      <h2 className="flex items-center gap-3 font-display text-2xl font-semibold">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary font-display text-base font-bold text-primary-foreground">{n}</span>
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

const optionClass = (active: boolean) =>
  `rounded-2xl border p-5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
    active ? "border-primary bg-primary/10" : "border-border hover:border-foreground/30"
  }`;

const TYPES = [
  { type: "TRANSPARENT", title: "Transparent", text: "See what's inside" },
  { type: "OPAQUE", title: "Closed", text: "Keep it a surprise" },
] as const;

const fromPrice = (p: GiftPackaging) => p.price + Math.min(0, ...p.colors.filter(colorAvailable).map((c) => c.priceAdjustment));

/** Step 1: how the gift arrives. Packaging, shapes, colours and prices come from /gift-packaging. */
export function GiftPackagingStep({ category, data }: StudioProps) {
  const { getDraft, setDraft } = useStudio();
  const d = getDraft(category.id, "GIFT");
  // Inactive packaging is kept for showing saved gifts, but not offered for new ones.
  const offered = data.packaging.filter((p) => p.isActive);
  const chosen = data.packaging.find((p) => p.id === d.packagingId) ?? null;
  const [type, setType] = useState<GiftPackaging["type"] | null>(chosen?.type ?? null);
  const ofType = offered.filter((p) => p.type === type);
  const color = chosen?.colors.find((c) => c.id === d.colorId) ?? null;
  const ready = !!chosen && packagingAvailable(chosen) && (!needsColor(chosen) || (!!color && colorAvailable(color)));

  return (
    <StudioShell
      category={category}
      step={0}
      others
      title={
        <>
          How should your gift <em className="font-normal text-primary">arrive?</em>
        </>
      }
      intro={d.elements.length ? "Change the box as you like. Everything you put inside stays." : "Three quick choices, then fill it with things they'll love."}
    >
      {offered.length === 0 ? (
        <p className="mt-10 rounded-[2rem] border border-border bg-card px-6 py-12 text-center text-muted-foreground">Gift packaging isn't available right now. Please check back soon.</p>
      ) : (
        <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="flex flex-col gap-6">
            <Step n={1} title="How should it arrive?">
              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Packaging type">
                {TYPES.map((t) => (
                  <button
                    key={t.type}
                    type="button"
                    role="radio"
                    aria-checked={type === t.type}
                    disabled={!offered.some((p) => p.type === t.type && packagingAvailable(p))}
                    onClick={() => {
                      setType(t.type);
                      if (chosen?.type !== t.type) setDraft(category.id, { ...d, packagingId: null, colorId: null });
                    }}
                    className={optionClass(type === t.type)}
                  >
                    <span className="block font-display text-xl font-semibold">{t.title}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{t.text}</span>
                  </button>
                ))}
              </div>
            </Step>

            {type && (
              <Step n={2} title="Shape & style">
                <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Packaging">
                  {ofType.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={d.packagingId === p.id}
                      disabled={!packagingAvailable(p)}
                      onClick={() => setDraft(category.id, { ...d, packagingId: p.id, colorId: null })}
                      className={optionClass(d.packagingId === p.id)}
                    >
                      <span className="mb-4 flex h-14 items-end">
                        {p.imageUrl ? (
                          <img {...corsImage} src={p.imageUrl} alt="" className="h-14 w-auto object-contain" />
                        ) : (
                          <span className={`block h-12 rounded-md border-2 border-primary/70 ${p.shape === "RECTANGULAR" ? "w-20" : "w-12"}`} />
                        )}
                      </span>
                      <span className="block font-display text-xl font-semibold">{p.name}</span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {p.shape === "RECTANGULAR" ? "Rectangular" : "Square"} · from {money(fromPrice(p))}
                      </span>
                      {!packagingAvailable(p) && <span className="mt-1 block text-xs text-muted-foreground">Sold out</span>}
                    </button>
                  ))}
                </div>
              </Step>
            )}

            {chosen && needsColor(chosen) && (
              <Step n={3} title="Box color">
                <div className="grid grid-cols-3 gap-4 sm:grid-cols-6" role="radiogroup" aria-label="Box colour">
                  {chosen.colors.filter((c) => c.isActive).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={d.colorId === c.id}
                      disabled={!colorAvailable(c)}
                      onClick={() => setDraft(category.id, { ...d, colorId: c.id })}
                      className="flex flex-col items-center gap-2 text-center disabled:opacity-40"
                    >
                      <span
                        className={`h-12 w-12 rounded-full border border-border ${d.colorId === c.id ? "ring-2 ring-primary ring-offset-4 ring-offset-card" : ""}`}
                        style={{ background: c.hex }}
                      />
                      <span className="text-xs leading-tight">{c.name}</span>
                      <span className="text-[11px] text-primary">{!colorAvailable(c) ? "Sold out" : c.priceAdjustment ? `+${money(c.priceAdjustment)}` : "Included"}</span>
                    </button>
                  ))}
                </div>
              </Step>
            )}

            <div>
              <ContinueButton ready={ready} href={studioHref(category, "design")} label="Start designing" blockedLabel="Choose a box color to continue" />
            </div>
          </div>

          <div className="relative flex min-h-[280px] items-center justify-center overflow-hidden rounded-[2rem] border border-border bg-card p-8 lg:sticky lg:top-28">
            <div className="bg-glow pointer-events-none absolute inset-0" />
            <div className="relative w-full max-w-[340px]">
              <GiftBox shape={chosen?.shape} transparent={(chosen?.type ?? type) === "TRANSPARENT"} hex={color?.hex ?? ((chosen?.type ?? type) === "TRANSPARENT" ? "#D9CFC1" : "#2B2F45")} />
              <p className="mt-4 text-center text-sm text-muted-foreground">{chosen ? `${chosen.name}${color ? ` · ${color.name}` : ""}` : "Your box preview"}</p>
            </div>
          </div>
        </div>
      )}
      <ReadyMade products={data.products} />
    </StudioShell>
  );
}

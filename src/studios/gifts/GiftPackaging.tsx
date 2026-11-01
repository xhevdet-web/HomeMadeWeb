import type { ReactNode } from "react";
import { money } from "../../data/mock";
import { BOX_COLORS, GIFT_PACKAGING, GIFT_SHAPES } from "../../data/studioCatalog";
import { useStudio } from "../../studio/StudioContext";
import { ContinueButton, StudioShell } from "../../studio/StudioShell";
import { GiftBox } from "./GiftBox";

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
  `rounded-2xl border p-5 text-left transition-colors ${active ? "border-primary bg-primary/10" : "border-border hover:border-foreground/30"}`;

export function GiftPackaging() {
  const { drafts, setDraft } = useStudio();
  const d = drafts.gifts;
  const extra = GIFT_PACKAGING.find((p) => p.id === d.packaging)?.price ?? 0;
  const ready = !!(d.packaging && d.shape && d.colorId);
  const hasItems = d.elements.length > 0;

  return (
    <StudioShell
      slug="gifts"
      step={0}
      title={
        <>
          How should your gift <em className="font-normal text-primary">arrive?</em>
        </>
      }
      intro={hasItems ? "Change the box as you like. Everything you put inside stays." : "Three quick choices, then fill it with things they'll love."}
    >
      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="flex flex-col gap-6">
          <Step n={1} title="How should it arrive?">
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Packaging">
              {GIFT_PACKAGING.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={d.packaging === p.id}
                  onClick={() => setDraft("gifts", { ...d, packaging: p.id })}
                  className={optionClass(d.packaging === p.id)}
                >
                  <span className="block font-display text-xl font-semibold">{p.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{p.text}</span>
                  {p.price > 0 && <span className="mt-2 block text-xs text-primary">+{money(p.price)}</span>}
                </button>
              ))}
            </div>
          </Step>

          <Step n={2} title="Shape & style">
            <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Shape">
              {GIFT_SHAPES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={d.shape === s.id}
                  onClick={() => setDraft("gifts", { ...d, shape: s.id })}
                  className={optionClass(d.shape === s.id)}
                >
                  <span className="mb-4 flex h-14 items-end">
                    <span className={`block h-12 rounded-md border-2 border-primary/70 ${s.id === "rect" ? "w-20" : "w-12"}`} />
                  </span>
                  <span className="block font-display text-xl font-semibold">{s.name}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">from {money(s.price + extra)}</span>
                </button>
              ))}
            </div>
          </Step>

          <Step n={3} title="Box color">
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-6" role="radiogroup" aria-label="Box colour">
              {BOX_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={d.colorId === c.id}
                  onClick={() => setDraft("gifts", { ...d, colorId: c.id })}
                  className="flex flex-col items-center gap-2 text-center"
                >
                  <span
                    className={`h-12 w-12 rounded-full border border-border ${d.colorId === c.id ? "ring-2 ring-primary ring-offset-4 ring-offset-card" : ""}`}
                    style={{ background: c.color }}
                  />
                  <span className="text-xs leading-tight">{c.name}</span>
                  <span className="text-[11px] text-primary">{c.price ? `+${money(c.price)}` : "Included"}</span>
                </button>
              ))}
            </div>
          </Step>

          <div>
            <ContinueButton ready={ready} href="#/studios/gifts/design" label="Start designing" blockedLabel="Choose a box color to continue" />
          </div>
        </div>

        <div className="relative flex min-h-[280px] items-center justify-center overflow-hidden rounded-[2rem] border border-border bg-card p-8 lg:sticky lg:top-28">
          <div className="bg-glow pointer-events-none absolute inset-0" />
          <div className="relative w-full max-w-[340px]">
            <GiftBox draft={{ packaging: d.packaging ?? "closed", shape: d.shape, colorId: d.colorId }} />
            <p className="mt-4 text-center text-sm text-muted-foreground">Your box preview</p>
          </div>
        </div>
      </div>
    </StudioShell>
  );
}

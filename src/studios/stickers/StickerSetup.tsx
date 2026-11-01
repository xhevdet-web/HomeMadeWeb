import { useRef } from "react";
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { SectionLabel } from "../../components/Page";
import { money } from "../../data/mock";
import { STICKER_SHAPES, STICKER_SIZES } from "../../data/studioCatalog";
import { navigate } from "../../router";
import { useStudio } from "../../studio/StudioContext";
import { StudioShell } from "../../studio/StudioShell";
import { recenter } from "./logic";

const SHAPE_CLASS = {
  square: "h-12 w-12 rounded-lg",
  circle: "h-12 w-12 rounded-full",
  rectangle: "h-9 w-14 rounded-lg",
  oval: "h-9 w-14 rounded-[50%]",
};

export function StickerSetup() {
  const { drafts, setDraft } = useStudio();
  const d = drafts.stickers;
  const startSize = useRef(d.sizeId);
  const sizes = STICKER_SIZES.filter((s) => s.shape === d.shape);
  const ready = !!(d.shape && d.sizeId);

  const use = () => {
    if (!ready) return;
    if (d.sizeId !== startSize.current) setDraft("stickers", recenter(d));
    navigate("#/studios/stickers/design");
  };

  return (
    <StudioShell
      slug="stickers"
      step={0}
      title={
        <>
          Choose your shape <em className="font-normal text-primary">and size.</em>
        </>
      }
      intro="All designs in one set share the same shape and size."
    >
      <section className="mt-10 rounded-[2rem] border border-border bg-card p-6 sm:p-8">
        <SectionLabel as="h2">Shape</SectionLabel>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="radiogroup" aria-label="Shape">
          {STICKER_SHAPES.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={d.shape === s.id}
              onClick={() => setDraft("stickers", { ...d, shape: s.id, sizeId: STICKER_SIZES.find((x) => x.id === d.sizeId)?.shape === s.id ? d.sizeId : null })}
              className={`flex flex-col items-center gap-3 rounded-2xl border p-5 transition-colors ${
                d.shape === s.id ? "border-primary bg-primary/10" : "border-border hover:border-foreground/30"
              }`}
            >
              <span className="flex h-14 items-center">
                <span className={`block border-2 border-primary/80 bg-foreground/10 ${SHAPE_CLASS[s.id]}`} />
              </span>
              <span className="font-semibold">{s.name}</span>
            </button>
          ))}
        </div>
      </section>

      {d.shape && (
        <section className="mt-6 rounded-[2rem] border border-border bg-card p-6 sm:p-8">
          <SectionLabel as="h2">Size</SectionLabel>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Size">
            {sizes.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={d.sizeId === s.id}
                onClick={() => setDraft("stickers", { ...d, sizeId: s.id })}
                className={`rounded-2xl border p-5 text-left transition-colors ${
                  d.sizeId === s.id ? "border-primary bg-primary/10" : "border-border hover:border-foreground/30"
                }`}
              >
                <span className="block font-display text-2xl font-semibold">{s.label}</span>
                <span className="mt-1 block text-sm text-primary">{money(s.price)} each</span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">The biggest size is 7 × 7 cm.</p>
        </section>
      )}

      <div className="mt-8">
        <Button size="lg" glow={ready} disabled={!ready} onClick={use} className="w-full sm:w-auto">
          {ready ? (
            <>
              Use this size <Icon name="arrowRight" size={18} />
            </>
          ) : (
            "Choose a shape and size"
          )}
        </Button>
      </div>
    </StudioShell>
  );
}

import { useState } from "react";
import { studioHref } from "../../data/homeCategories";
import { money } from "../../lib/format";
import { useStudio } from "../../studio/StudioContext";
import { ContinueButton, Notice, StudioShell, Tabs } from "../../studio/StudioShell";
import type { StudioProps } from "../data";
import { brandGroups, isSoldOut, modelOf } from "./logic";
import { corsImage } from "../../studio/capture";

/** Step 1: the phone model. Models are the CASE category's COMPANY products, grouped by brand. */
export function CaseModels({ category, data }: StudioProps) {
  const { getDraft, setDraft } = useStudio();
  const d = getDraft(category.id, "CASE");
  const current = modelOf(d, data);
  const groups = brandGroups(data.products);
  const [brand, setBrand] = useState(current?.deviceBrand?.trim() || groups[0]?.brand || "OTHER");
  const group = groups.find((g) => g.brand === brand) ?? groups[0];

  return (
    <StudioShell
      category={category}
      step={0}
      others
      title={
        <>
          Choose your <em className="font-normal text-primary">phone.</em>
        </>
      }
      intro="Pick your phone model. Each case is made for its exact shape and camera."
    >
      {d.elements.length > 0 && (
        <div className="mt-8">
          <Notice>Your image stays when you switch to another model.</Notice>
        </div>
      )}
      {groups.length === 0 ? (
        <p className="mt-10 rounded-[2rem] border border-border bg-card px-6 py-12 text-center text-muted-foreground">No phone models yet. Please check back soon.</p>
      ) : (
        <>
          {groups.length > 1 && (
            <div className="mt-10 max-w-xl">
              <Tabs label="Brand" value={group.brand} onChange={setBrand} tabs={groups.map((g) => ({ id: g.brand, label: g.label }))} />
            </div>
          )}
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" role="radiogroup" aria-label="Phone model">
            {group.models.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={d.modelId === m.id}
                  disabled={isSoldOut(m)}
                  onClick={() => setDraft(category.id, { ...d, modelId: m.id })}
                  className={`flex w-full flex-col items-center rounded-[2rem] border p-5 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                    d.modelId === m.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-foreground/30"
                  }`}
                >
                  {m.imageUrl ? <img {...corsImage} src={m.imageUrl} alt="" loading="lazy" className="h-36 w-auto object-contain" /> : <span className="h-36 w-16 rounded-xl bg-secondary" />}
                  <span className="mt-4 font-display text-lg leading-tight font-semibold">{m.name}</span>
                  <span className={`mt-1 text-sm ${isSoldOut(m) ? "text-muted-foreground" : "text-primary"}`}>{isSoldOut(m) ? "Sold out" : money(m.price)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="mt-8">
        <ContinueButton
          ready={!!current && !isSoldOut(current)}
          href={studioHref(category, "design")}
          label="Continue to the studio"
          blockedLabel={current && isSoldOut(current) ? "This model is sold out" : "Choose a phone model"}
        />
      </div>
    </StudioShell>
  );
}

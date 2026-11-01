import { useState } from "react";
import { money } from "../../data/mock";
import { BRANDS, PHONE_MODELS, getModel, type Brand } from "../../data/studioCatalog";
import { useStudio } from "../../studio/StudioContext";
import { ContinueButton, Notice, StudioShell, Tabs } from "../../studio/StudioShell";
import { CaseCanvas } from "./CaseCanvas";

export function CaseModels() {
  const { drafts, setDraft } = useStudio();
  const d = drafts.cases;
  const current = getModel(d.modelId);
  const [brand, setBrand] = useState<Brand>(current?.brand ?? "Apple");
  const hasImage = d.elements.length > 0;

  return (
    <StudioShell
      slug="cases"
      step={0}
      title={
        <>
          Choose your <em className="font-normal text-primary">phone.</em>
        </>
      }
      intro="Pick your phone model. Each case is made for its exact shape and camera."
    >
      {hasImage && <div className="mt-8"><Notice>Your image stays when you switch to another model.</Notice></div>}
      <div className="mt-10 max-w-xl">
        <Tabs label="Brand" value={brand} onChange={setBrand} tabs={BRANDS} />
      </div>
      <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" role="radiogroup" aria-label="Phone model">
        {PHONE_MODELS.filter((m) => m.brand === brand).map((m) => (
          <li key={m.id}>
            <button
              type="button"
              role="radio"
              aria-checked={d.modelId === m.id}
              disabled={m.soldOut}
              onClick={() => setDraft("cases", { ...d, modelId: m.id })}
              className={`flex w-full flex-col items-center rounded-[2rem] border p-5 text-center transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                d.modelId === m.id ? "border-primary bg-primary/10" : "border-border bg-card hover:border-foreground/30"
              }`}
            >
              <span className="block w-16">
                <CaseCanvas model={m} safeArea={false} />
              </span>
              <span className="mt-4 font-display text-lg leading-tight font-semibold">{m.name}</span>
              <span className={`mt-1 text-sm ${m.soldOut ? "text-muted-foreground" : "text-primary"}`}>{m.soldOut ? "Sold out" : money(m.price)}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-8">
        <ContinueButton
          ready={!!current && !current.soldOut}
          href="#/studios/cases/design"
          label="Continue to the studio"
          blockedLabel={current?.soldOut ? "This model is sold out" : "Choose a phone model"}
        />
      </div>
    </StudioShell>
  );
}

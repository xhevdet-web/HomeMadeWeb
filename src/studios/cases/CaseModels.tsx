import { useState } from "react";
import i18n from "../../i18n";

// Re-renders with the app when the language changes.
const t = i18n.t.bind(i18n);
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
          {t("cases.chooseTitle")} <em className="font-normal text-primary">{t("cases.chooseTitleAccent")}</em>
        </>
      }
      intro={t("cases.chooseIntro")}
    >
      {d.elements.length > 0 && (
        <div className="mt-8">
          <Notice>{t("cases.imageStays")}</Notice>
        </div>
      )}
      {groups.length === 0 ? (
        <p className="mt-10 rounded-[2rem] border border-border bg-card px-6 py-12 text-center text-muted-foreground">{t("cases.noModels")}</p>
      ) : (
        <>
          {groups.length > 1 && (
            <div className="mt-10 max-w-xl">
              <Tabs label={t("cases.brand")} value={group.brand} onChange={setBrand} tabs={groups.map((g) => ({ id: g.brand, label: g.label }))} />
            </div>
          )}
          <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4" role="radiogroup" aria-label={t("cases.phoneModel")}>
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
                  <span className={`mt-1 text-sm ${isSoldOut(m) ? "text-muted-foreground" : "text-primary"}`}>{isSoldOut(m) ? t("studio.soldOut") : money(m.price)}</span>
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
          label={t("cases.continue")}
          blockedLabel={current && isSoldOut(current) ? t("cases.modelSoldOut") : t("cases.chooseModel")}
        />
      </div>
    </StudioShell>
  );
}

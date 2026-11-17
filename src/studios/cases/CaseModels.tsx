import { useState } from "react";
import i18n from "../../i18n";

// Re-renders with the app when the language changes.
const t = i18n.t.bind(i18n);
import { studioHref } from "../../data/homeCategories";
import { money } from "../../lib/format";
import { useStudio } from "../../studio/StudioContext";
import { ContinueButton, Notice, StudioShell, Tabs } from "../../studio/StudioShell";
import type { StudioProps } from "../data";
import { brandGroups, isSoldOut, modelOf, phoneModels, readyCases } from "./logic";
import { corsImage } from "../../studio/capture";
import { productShadow, productStage } from "../../components/ProductCard";
import { ReadyMade } from "../ReadyMade";

/**
 * Step 1: the phone model, from the CASE category's phone models grouped by brand. The category's
 * ready-made cases are listed below, ordered as they are; those that fit the chosen model first.
 */
export function CaseModels({ category, data }: StudioProps) {
  const { getDraft, setDraft } = useStudio();
  const d = getDraft(category.id, "CASE");
  const current = modelOf(d, data);
  const groups = brandGroups(phoneModels(data));
  const ready = readyCases(data);
  const fitting = current ? [...ready.filter((p) => p.baseProductId === current.id), ...ready.filter((p) => p.baseProductId !== current.id)] : ready;
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
                  className={`flex h-full w-full flex-col overflow-hidden rounded-2xl border text-center transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                    d.modelId === m.id ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border bg-card hover:border-foreground/30"
                  }`}
                >
                  {/* The same photo stage as the products page. */}
                  <span className={`relative block aspect-square w-full ${productStage}`}>
                    {m.imageUrl ? (
                      <img {...corsImage} src={m.imageUrl} alt="" loading="lazy" className={`absolute inset-0 h-full w-full object-contain p-[12%] ${productShadow}`} />
                    ) : (
                      <span className="absolute inset-[12%] rounded-xl bg-black/5" />
                    )}
                  </span>
                  <span className="mt-4 px-3 font-display text-lg leading-tight font-semibold">{m.name}</span>
                  <span className={`mt-1 px-3 pb-5 text-sm ${isSoldOut(m) ? "text-muted-foreground" : "text-primary"}`}>{isSoldOut(m) ? t("studio.soldOut") : money(m.price)}</span>
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
      <ReadyMade products={fitting} category={category} />
    </StudioShell>
  );
}

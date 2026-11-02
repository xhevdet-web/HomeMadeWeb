import { useTranslation } from "react-i18next";
import type { Product } from "../api/models";
import { ButtonLink } from "../components/Button";
import { money } from "../lib/format";
import { corsImage } from "../studio/capture";

/** The category's ready-made pieces (COMPANY products), orderable as they are. */
export function ReadyMade({ products }: { products: Product[] }) {
  const { t } = useTranslation();
  if (!products.length) return null;
  return (
    <section className="mt-20" aria-labelledby="ready-title">
      <p className="eyebrow">{t("designs.readyMade")}</p>
      <h2 id="ready-title" className="mt-4 font-display text-4xl font-semibold tracking-tight">
        {t("studio.readyTitle")} <em className="font-normal text-primary">{t("studio.readyTitleAccent")}</em>
      </h2>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((p) => {
          const soldOut = p.stock !== undefined && p.stock <= 0 && !Array.isArray(p.sizes);
          return (
            <li key={p.id} className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
              {p.imageUrl ? (
                <img {...corsImage} src={p.imageUrl} alt={p.name} loading="lazy" className="aspect-square w-full bg-secondary object-cover" />
              ) : (
                <span className="aspect-square w-full bg-secondary" />
              )}
              <div className="flex flex-1 flex-col p-4">
                <p className="font-display text-lg font-semibold">{p.name}</p>
                <p className="mt-1 text-primary">{money(p.price)}</p>
                <div className="mt-auto pt-4">
                  {soldOut ? (
                    <span className="text-sm text-muted-foreground">{t("studio.soldOut")}</span>
                  ) : (
                    <ButtonLink href={`#/checkout?product=${p.id}`} size="sm">
                      {t("designs.order")}
                    </ButtonLink>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

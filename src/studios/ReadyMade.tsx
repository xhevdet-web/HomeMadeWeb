import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Category, Product } from "../api/models";
import { Icon } from "../components/Icon";
import { ProductCard } from "../components/ProductCard";
import { ProductViewer } from "../components/ProductViewer";
import { studioSlug } from "../data/homeCategories";

/** The category's ready-made pieces (COMPANY products), with the shop's product cards and viewer. */
export function ReadyMade({ products, category }: { products: Product[]; category: Category }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(null);
  if (!products.length) return null;

  return (
    <section className="mt-20" aria-labelledby="ready-title">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <p className="eyebrow">{t("designs.readyMade")}</p>
          <h2 id="ready-title" className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("studio.readyTitle")} <em className="font-normal text-primary">{t("studio.readyTitleAccent")}</em>
          </h2>
        </div>
        <a
          href={`#/products?kategoria=${studioSlug(category)}`}
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          {t("products.seeAll")} <Icon name="arrowRight" size={15} />
        </a>
      </div>
      <ul className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(min(100%,240px),1fr))] gap-6">
        {products.map((p, i) => (
          <li key={p.id}>
            <ProductCard product={p} category={category} onOpen={() => setOpen(i)} />
          </li>
        ))}
      </ul>
      {open !== null && <ProductViewer products={products} index={open} categoryOf={() => category} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </section>
  );
}

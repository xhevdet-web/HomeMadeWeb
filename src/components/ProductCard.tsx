import { useTranslation } from "react-i18next";
import type { Category, Product } from "../api/models";
import { fitsLabel, isCustom, isSoldOut, priceLabel, productAction, productPictures, type ProductAction } from "../lib/products";
import { corsImage } from "../studio/capture";
import { Icon } from "./Icon";

/** The product photo stage: transparent PNGs on the --product-stage colour, always whole. */
export const productStage = "bg-[var(--product-stage)]";
export const productShadow = "drop-shadow-[0_8px_12px_rgba(40,30,20,0.18)]";

export function ProductBadge({ product, category }: { product: Product; category: Category | null | undefined }) {
  const { t } = useTranslation();
  if (isSoldOut(product))
    return <span className="absolute top-3 left-3 z-10 rounded-full bg-[#121319] px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-[#f5f1ea] uppercase">{t("studio.soldOut")}</span>;
  if (isCustom(product, category))
    return <span className="absolute top-3 left-3 z-10 rounded-full bg-white px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-[#8a4413] uppercase">{t("products.madeToOrder")}</span>;
  return null;
}

/** The card's main button: orange (order), orange outline (customise) or grey outline (sold out). */
export function ActionButton({ action, className = "" }: { action: ProductAction; className?: string }) {
  const look = {
    order: "bg-primary text-primary-foreground hover:bg-primary/90",
    customize: "border border-primary text-primary hover:bg-primary hover:text-primary-foreground",
    notify: "border border-border text-foreground/85 hover:bg-secondary hover:text-foreground",
  }[action.kind];
  return (
    <a href={action.href} className={`flex min-h-11 items-center justify-center rounded-xl px-4 text-center text-sm font-semibold transition-colors ${look} ${className}`}>
      {action.label}
    </a>
  );
}

/**
 * A catalog product: photo (opens the full-size viewer), category, name and price, a detail line
 * and one full-width button. Cards in a grid row are the same height; the button sits at the bottom.
 */
export function ProductCard({ product, category, onOpen }: { product: Product; category: Category | null | undefined; onOpen?: () => void }) {
  const { t } = useTranslation();
  const soldOut = isSoldOut(product);
  const custom = isCustom(product, category);
  const [front, back] = productPictures(product);
  const detail = fitsLabel(product, category) || product.description?.split("\n")[0]?.trim() || product.color || "";
  const image = (src: string, extra: string) => (
    <img
      {...corsImage}
      src={src}
      alt={extra ? "" : product.name}
      width={600}
      height={600}
      loading="lazy"
      decoding="async"
      className={`absolute inset-0 h-full w-full object-contain p-[12%] ${productShadow} transition duration-300 ease-out group-hover:scale-[1.04] ${soldOut ? "opacity-50" : ""} ${extra}`}
    />
  );

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <button
        type="button"
        onClick={onOpen}
        aria-label={t("studio.viewProduct", { name: product.name })}
        className={`group relative block aspect-square w-full overflow-hidden ${productStage} focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-primary`}
      >
        <ProductBadge product={product} category={category} />
        {front ? (
          <>
            {/* With a second photo, it fades in on hover. */}
            {image(front, back ? "group-hover:opacity-0" : "")}
            {back && image(back, "opacity-0 group-hover:opacity-100")}
          </>
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-xs font-semibold tracking-[0.2em] text-[#8a7f74] uppercase">
            <Icon name="image" size={28} />
            {t("products.noPhoto")}
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col px-5 py-[18px]">
        {category && <p className="text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">{category.name}</p>}
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <h3 className="min-w-0 font-display text-xl leading-tight font-semibold">{product.name}</h3>
          <p className={`shrink-0 font-semibold ${soldOut ? "text-muted-foreground" : "text-primary"}`}>{priceLabel(product, custom)}</p>
        </div>
        {detail && <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{detail}</p>}
        <div className="mt-auto pt-4">
          <ActionButton action={productAction(product, category)} />
        </div>
      </div>
    </article>
  );
}

import type { SavedDesign } from "../../api/designs";
import type { Category, Product } from "../../api/models";
import { lookKey } from "../../data/homeCategories";
import i18n from "../../i18n";
import { categoryIcon } from "../../lib/products";
import type { IconName } from "../../components/Icon";

/** Albanian month abbreviations, as written on the site. */
const SQ_MONTHS = ["jan", "shk", "mar", "pri", "maj", "qer", "korr", "gush", "sht", "tet", "nën", "dhj"];

/** "15 nën 2026" in Albanian, "15 Nov 2026" in English. */
export function formatSavedDate(iso: string, language = i18n.language) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  if (language === "sq") return `${date.getDate()} ${SQ_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** "€6.50" */
export const formatPrice = (cents: number) => `€${(cents / 100).toFixed(2)}`;

/** The product's embedded category, in the shape the category helpers take. */
const asCategory = (c: NonNullable<Product["category"]>) => ({ name: c.name, builderType: (c.builderType ?? null) as Category["builderType"], builderConfig: c.builderConfig as Category["builderConfig"] });

/** The category key the site knows (bracelet, mugs…), or the category id for anything else. */
export function categoryKeyOf(p: Product) {
  const key = p.category ? lookKey(asCategory(p.category)) : null;
  return key ?? p.categoryId;
}

/** The one place category names are turned into labels: the site's own names (Byzylykë, Varëse…). */
export function categoryLabel(p: Product) {
  const key = p.category ? lookKey(asCategory(p.category)) : null;
  return key ? i18n.t(`looks.${key}.name`) : (p.category?.name ?? i18n.t("designs.other"));
}

export function categoryIconOf(p: Product): IconName {
  return p.category ? categoryIcon(asCategory(p.category)) : "package";
}

/** What tells this design apart from others in its category: the size, else the piece or phone it's on. */
export const variantOf = (p: Product) => p.selectedSize?.name ?? p.baseProduct?.name ?? "";

/** The components, grouped: ["Black Panther ×3", "Metal Dark Blue ×1"]. */
export function componentsOf(p: Product) {
  const lines = new Map<string, number>();
  for (const item of p.items ?? []) {
    const name = item.subCategory?.name;
    if (name) lines.set(name, (lines.get(name) ?? 0) + item.quantity);
  }
  return [...lines].map(([name, n]) => (n > 1 ? `${name} ×${n}` : name));
}

/** "Black Panther ×3 · Metal Dark Blue +2" for the card; the full list goes in the tooltip. */
export function componentsLine(p: Product) {
  const all = componentsOf(p);
  const shown = all.slice(0, 2).join(" · ");
  return { short: all.length > 2 ? `${shown} +${all.length - 2}` : shown, full: all.join(" · ") };
}

export const hasPreview = (p: Product) => !!p.designPreviewUrl;

/** Everything the search looks at, lower-cased: name, category label, variant and components. */
export function searchText(s: SavedDesign) {
  return [s.name, categoryLabel(s.product), variantOf(s.product), ...componentsOf(s.product)].join(" ").toLocaleLowerCase("sq");
}

import { categories as fetchCategories } from "../api/catalog";
import { measuredSizes, type BuilderType, type Category } from "../api/models";
import { CATALOG_TTL, useApi } from "../hooks/useApi";
import i18n from "../i18n";
import { slugify } from "../lib/format";

/** Hand-written copy and the local photo for the categories we know. */
export interface CategoryLook {
  key: LookKey;
  image: string | null;
  line: string;
  text: string;
  /** What the studio does, from the mobile app. */
  studio: string;
}

type LookKey = "bracelet" | "necklace" | "gifts" | "mugs" | "apparel" | "cases" | "stickers";

const IMAGES: Record<LookKey, string> = {
  bracelet: "/images/bracelet.jpg",
  necklace: "/images/necklace.jpg",
  gifts: "/images/gifts.jpg",
  mugs: "/images/mugs.jpg",
  apparel: "/images/apparel.jpg",
  cases: "/images/cases.jpg",
  stickers: "/images/stickers.jpg",
};

/** The copy in the current language; read when a page renders, so it follows the language switch. */
export function lookByKey(key: LookKey): CategoryLook {
  return {
    key,
    image: IMAGES[key],
    line: i18n.t(`looks.${key}.line`),
    text: i18n.t(`looks.${key}.text`),
    studio: i18n.t(`looks.${key}.studio`),
  };
}

const BY_BUILDER: Partial<Record<BuilderType, LookKey>> = { GIFT: "gifts", MUG: "mugs", APPAREL: "apparel", CASE: "cases", STICKER: "stickers" };

/** Matched by builder type (and silhouette for necklaces), then by name. */
export function lookKey(c: Pick<Category, "name" | "builderType" | "builderConfig">): LookKey | null {
  if (c.builderType === "JEWELRY") return isNecklace(c) ? "necklace" : "bracelet";
  if (c.builderType && BY_BUILDER[c.builderType]) return BY_BUILDER[c.builderType]!;
  const name = c.name.toLowerCase();
  if (/neck/.test(name)) return "necklace";
  if (/bracel/.test(name)) return "bracelet";
  if (/gift/.test(name)) return "gifts";
  if (/mug/.test(name)) return "mugs";
  if (/hood|shirt|tee|apparel/.test(name)) return "apparel";
  if (/case/.test(name)) return "cases";
  if (/sticker/.test(name)) return "stickers";
  return null;
}

/** Copy and picture for any category. Unknown ones use the API image, then a neutral placeholder (null). */
export function lookFor(c: Category): CategoryLook {
  const key = lookKey(c);
  if (key) return lookByKey(key);
  const fallback = i18n.t("looks.fallback");
  return {
    key: "bracelet",
    image: c.imageUrl,
    line: c.name,
    text: c.description?.trim() || fallback,
    studio: c.description?.trim() || fallback,
  };
}

export const isNecklace = (c: Pick<Category, "name" | "builderConfig">) =>
  c.builderConfig?.silhouette ? c.builderConfig.silhouette === "NECKLACE" : /neck/i.test(c.name);

/** Builders the website has a studio for. BOUQUET is not on the website. */
const SUPPORTED: BuilderType[] = ["JEWELRY", "GIFT", "MUG", "APPAREL", "CASE", "STICKER"];

/** The studio a category opens: by builderType, never by name. Categories without one keep the jewelry studio. */
export function studioBuilder(c: Category): BuilderType | null {
  if (c.builderType) return SUPPORTED.includes(c.builderType) ? c.builderType : null;
  return measuredSizes(c).length ? "JEWELRY" : null;
}

export const studioSlug = (c: Pick<Category, "name">) => slugify(c.name);
export const studioHref = (c: Pick<Category, "name">, step?: "design" | "preview") => `#/studios/${studioSlug(c)}${step ? `/${step}` : ""}`;

/** Active categories with a website studio, in API order. Shared and cached for a minute. */
export function useStudioCategories() {
  const result = useApi("categories", fetchCategories, { ttl: CATALOG_TTL });
  return { ...result, data: result.data?.filter((c) => studioBuilder(c)) };
}

/** Shown on the homepage if the API can't be reached, so it never looks broken. Names are
 * translated when shown (looks.<key>.name). */
export const STATIC_CATEGORIES: LookKey[] = ["bracelet", "necklace", "gifts", "mugs", "apparel", "cases", "stickers"];

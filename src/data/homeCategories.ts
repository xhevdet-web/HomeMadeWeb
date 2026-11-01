import { categories as fetchCategories } from "../api/catalog";
import { measuredSizes, type BuilderType, type Category } from "../api/models";
import { CATALOG_TTL, useApi } from "../hooks/useApi";
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

const LOOKS: Record<LookKey, CategoryLook> = {
  bracelet: {
    key: "bracelet",
    image: "/images/bracelet.jpg",
    line: "Bead by bead.",
    text: "Pick your beads, letters and charms. Spell a name, a date, a feeling.",
    studio: "Choose a size, then string beads and charms piece by piece.",
  },
  necklace: {
    key: "necklace",
    image: "/images/necklace.jpg",
    line: "Wear your story.",
    text: "Names, initials and pendants shaped in gold and silver, just for you.",
    studio: "Choose a size, then string beads and charms piece by piece.",
  },
  gifts: {
    key: "gifts",
    image: "/images/gifts.jpg",
    line: "Made to be opened.",
    text: "Personal boxes and keepsakes they will remember long after the ribbon.",
    studio: "Fill a box with treats and decorations, and add a personal note.",
  },
  mugs: {
    key: "mugs",
    image: "/images/mugs.jpg",
    line: "Morning, personalised.",
    text: "Your artwork, photo or words printed on a mug made for daily rituals.",
    studio: "Upload your photos or pick our designs, arrange them and see them on your mug.",
  },
  apparel: {
    key: "apparel",
    image: "/images/apparel.jpg",
    line: "Wear your design.",
    text: "Hoodies and tees with your own graphics, printed to last.",
    studio: "Pick your piece and size, then add logos, graphics or your own artwork.",
  },
  cases: {
    key: "cases",
    image: "/images/cases.jpg",
    line: "Protect in style.",
    text: "Phone cases designed by you, for the device you carry every day.",
    studio: "Choose your phone, then add your own photo or one of our designs.",
  },
  stickers: {
    key: "stickers",
    image: "/images/stickers.jpg",
    line: "Stick it anywhere.",
    text: "Die-cut stickers from your doodles, logos and inside jokes.",
    studio: "Pick a shape and size, then turn up to five of your own images into stickers.",
  },
};

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

export const FALLBACK_TEXT = "Design something that's completely yours.";

/** Copy and picture for any category. Unknown ones use the API image, then a neutral placeholder (null). */
export function lookFor(c: Category): CategoryLook {
  const key = lookKey(c);
  if (key) return LOOKS[key];
  return {
    key: "bracelet",
    image: c.imageUrl,
    line: c.name,
    text: c.description?.trim() || FALLBACK_TEXT,
    studio: c.description?.trim() || FALLBACK_TEXT,
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

/** Shown on the homepage if the API can't be reached, so it never looks broken. */
export const STATIC_CATEGORIES: { name: string; key: LookKey }[] = [
  { name: "Bracelet", key: "bracelet" },
  { name: "Necklace", key: "necklace" },
  { name: "Gifts", key: "gifts" },
  { name: "Mugs", key: "mugs" },
  { name: "Apparel", key: "apparel" },
  { name: "Cases", key: "cases" },
  { name: "Sticker", key: "stickers" },
];

export const LOOK = LOOKS;

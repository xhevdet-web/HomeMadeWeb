import type { BuilderType } from "../api/models";
import type { LookKey } from "../data/homeCategories";
import type { Theme } from "../theme";

/** The picture a walkthrough step shows: a studio screenshot, or the category's product photo. */
export type Shot = "base" | "design" | "detail" | "preview" | "photo";

export type GuideBuilder = Exclude<BuilderType, "BOUQUET">;

/**
 * How each studio works, step by step, in the order the studio shows them. Every step mirrors a
 * real screen (base → design → preview → checkout); the text is `about.guide.<builder>.<step>`.
 */
export const GUIDES: { [B in GuideBuilder]: { id: string; shot: Shot }[] } = {
  JEWELRY: [
    { id: "size", shot: "base" },
    { id: "beads", shot: "design" },
    { id: "fit", shot: "detail" },
    { id: "preview", shot: "preview" },
    { id: "order", shot: "photo" },
  ],
  GIFT: [
    { id: "arrive", shot: "base" },
    { id: "fill", shot: "design" },
    { id: "note", shot: "detail" },
    { id: "preview", shot: "preview" },
    { id: "order", shot: "photo" },
  ],
  MUG: [
    { id: "image", shot: "design" },
    { id: "arrange", shot: "detail" },
    { id: "preview", shot: "preview" },
    { id: "order", shot: "photo" },
  ],
  APPAREL: [
    { id: "piece", shot: "base" },
    { id: "design", shot: "design" },
    { id: "sides", shot: "detail" },
    { id: "preview", shot: "preview" },
    { id: "order", shot: "photo" },
  ],
  CASE: [
    { id: "phone", shot: "base" },
    { id: "design", shot: "design" },
    { id: "position", shot: "detail" },
    { id: "preview", shot: "preview" },
    { id: "order", shot: "photo" },
  ],
  STICKER: [
    { id: "shape", shot: "base" },
    { id: "images", shot: "design" },
    { id: "fit", shot: "detail" },
    { id: "quantity", shot: "preview" },
    { id: "order", shot: "photo" },
  ],
};

/** Used when the categories can't be loaded, so the guide still works. */
export const BUILDER_OF_LOOK: Record<LookKey, GuideBuilder> = {
  bracelet: "JEWELRY",
  necklace: "JEWELRY",
  gifts: "GIFT",
  mugs: "MUG",
  apparel: "APPAREL",
  cases: "CASE",
  stickers: "STICKER",
};

/**
 * Real studio screenshots in both themes and both languages, so the studio on the page matches
 * what the visitor sees. Made by `scripts/capture-about-shots.cjs`.
 */
export const shotSrc = (look: LookKey, shot: Exclude<Shot, "photo">, theme: Theme, language: string) =>
  `/images/about/${look}-${shot}-${theme}-${language === "en" ? "en" : "sq"}.jpg`;

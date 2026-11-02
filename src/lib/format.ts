/** Prices always come from the API in cents. */
export function money(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

import { dateLocale } from "../i18n";

/** In the current language: 27 Oct 2026 / 27 tet 2026. */
export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(dateLocale(), { day: "numeric", month: "short", year: "numeric" });
}

export function formatNumber(n: number) {
  return n.toLocaleString(dateLocale());
}

/** "Gift Boxes" → "gift-boxes"; used for readable studio URLs. */
export function slugify(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** 200 → "20 cm", 165 → "16.5 cm" (16,5 cm in Albanian). */
export const cm = (mm: number) => `${(Math.round(mm) / 10).toLocaleString(dateLocale())} cm`;

export const initialsOf = (u: { firstName: string; lastName: string }) => `${u.firstName[0] ?? ""}${u.lastName[0] ?? ""}`.toUpperCase();

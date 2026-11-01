/** Prices always come from the API in cents. */
export function money(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatNumber(n: number) {
  return n.toLocaleString("en-US");
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

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];

/** 6 → "Six"; larger numbers stay digits. */
export const countWord = (n: number) => WORDS[n] ?? String(n);

/** 200 → "20 cm", 165 → "16.5 cm". */
export const cm = (mm: number) => `${Math.round(mm) / 10} cm`;

export const initialsOf = (u: { firstName: string; lastName: string }) => `${u.firstName[0] ?? ""}${u.lastName[0] ?? ""}`.toUpperCase();

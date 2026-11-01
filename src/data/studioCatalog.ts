/* Catalog for the seven design studios. All prices in cents. */
import type { ArtId } from "../studio/artworks";

export interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Shared stock rules: "N left" when low, "Sold out" at 0, "All N in use" when the design uses every piece. */
export function stockState(stock: number, used: number): { label: string | null; disabled: boolean } {
  if (stock <= 0) return { label: "Sold out", disabled: true };
  if (used >= stock) return { label: `All ${stock} in use`, disabled: true };
  if (stock - used <= 5) return { label: `${stock - used} left`, disabled: false };
  return { label: null, disabled: false };
}

/* ---------------- Jewelry ---------------- */

export type PieceType = "bead" | "letter" | "charm" | "spacer" | "pendant";
export type Material = "Glass" | "Pearl" | "Agate" | "Gold" | "Silver" | "Acrylic";
export type CharmIcon = "heart" | "star" | "moon" | "clover" | "coin" | "eye" | "disc" | "locket";

export interface JewelryPiece {
  id: string;
  name: string;
  type: PieceType;
  material: Material;
  color: string;
  letter?: string;
  icon?: CharmIcon;
  lengthMm: number;
  price: number;
  stock: number;
}

const GOLD = "oklch(0.8 0.13 85)";
const SILVER = "oklch(0.86 0.01 265)";

const bead = (id: string, name: string, material: Material, color: string, lengthMm: number, price: number, stock = 80): JewelryPiece => ({
  id, name, type: "bead", material, color, lengthMm, price, stock,
});

const charm = (id: string, name: string, icon: CharmIcon, color: string, material: Material, price: number, stock = 20, type: PieceType = "charm", lengthMm = 12): JewelryPiece => ({
  id, name, type, material, color, icon, lengthMm, price, stock,
});

export const PIECES: JewelryPiece[] = [
  bead("amber", "Amber", "Glass", "oklch(0.72 0.17 55)", 8, 20),
  bead("cherry", "Cherry", "Glass", "oklch(0.55 0.19 30)", 8, 20),
  bead("sky", "Sky", "Glass", "oklch(0.8 0.08 225)", 6, 15),
  bead("honey", "Honey", "Glass", "oklch(0.82 0.14 80)", 10, 25),
  bead("midnight", "Midnight", "Glass", "oklch(0.3 0.06 265)", 8, 20),
  bead("blush", "Blush", "Glass", "oklch(0.8 0.08 15)", 6, 15, 4),
  bead("pearl", "Pearl", "Pearl", "oklch(0.95 0.02 85)", 6, 30),
  bead("pearl-round", "Round pearl", "Pearl", "oklch(0.93 0.025 80)", 8, 40),
  bead("pearl-baroque", "Baroque pearl", "Pearl", "oklch(0.9 0.03 75)", 10, 55, 3),
  bead("ocean", "Ocean agate", "Agate", "oklch(0.6 0.09 230)", 8, 45),
  bead("onyx", "Black agate", "Agate", "oklch(0.25 0.01 265)", 10, 50),
  bead("moss", "Moss agate", "Agate", "oklch(0.6 0.08 150)", 8, 45, 0),
  bead("gold-bead", "Gold bead", "Gold", GOLD, 6, 60),
  bead("silver-bead", "Silver bead", "Silver", SILVER, 6, 50),
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map<JewelryPiece>((l) => ({
    id: `letter-${l}`,
    name: `Letter ${l}`,
    type: "letter",
    material: "Acrylic",
    color: "oklch(0.97 0.005 85)",
    letter: l,
    lengthMm: 7,
    price: 30,
    stock: l === "Q" ? 0 : l === "X" || l === "Z" ? 4 : 40,
  })),
  charm("charm-heart", "Heart charm", "heart", GOLD, "Gold", 150),
  charm("charm-star", "Star charm", "star", GOLD, "Gold", 120),
  charm("charm-moon", "Moon charm", "moon", SILVER, "Silver", 120),
  charm("charm-clover", "Clover charm", "clover", SILVER, "Silver", 130, 5),
  charm("charm-coin", "Coin charm", "coin", GOLD, "Gold", 140),
  charm("charm-eye", "Evil eye", "eye", "oklch(0.55 0.13 250)", "Glass", 110),
  { id: "spacer-gold", name: "Gold spacer", type: "spacer", material: "Gold", color: GOLD, lengthMm: 3, price: 10, stock: 100 },
  { id: "spacer-silver", name: "Silver spacer", type: "spacer", material: "Silver", color: SILVER, lengthMm: 3, price: 10, stock: 100 },
  charm("pendant-disc", "Gold disc pendant", "disc", GOLD, "Gold", 490, 8, "pendant", 22),
  charm("pendant-locket", "Heart locket", "locket", GOLD, "Gold", 590, 3, "pendant", 25),
  charm("pendant-star", "Star pendant", "star", SILVER, "Silver", 390, 10, "pendant", 20),
];

const PIECE_MAP = new Map(PIECES.map((p) => [p.id, p]));
export const getPiece = (id: string) => PIECE_MAP.get(id);

export interface JewelrySize {
  id: string;
  label: string;
  minCm: number;
  maxCm: number;
  usualCm: number;
}

export interface JewelryConfig {
  noun: string;
  sizes: JewelrySize[];
  cord: "circle" | "u";
  types: PieceType[];
  minPrice: number;
}

export const MATERIAL_FILTERS: Material[] = ["Glass", "Pearl", "Agate", "Gold", "Silver"];
export const TYPE_LABEL: Record<PieceType, string> = {
  bead: "Beads",
  letter: "Letters",
  charm: "Charms",
  spacer: "Spacers",
  pendant: "Pendants",
};

export const JEWELRY: Record<"bracelet" | "necklace", JewelryConfig> = {
  bracelet: {
    noun: "bracelet",
    cord: "circle",
    types: ["bead", "letter", "charm", "spacer"],
    minPrice: 500,
    sizes: [
      { id: "S", label: "S", minCm: 15, maxCm: 16, usualCm: 15.5 },
      { id: "M", label: "M", minCm: 16.5, maxCm: 17.5, usualCm: 17 },
      { id: "L", label: "L", minCm: 18, maxCm: 19, usualCm: 18.5 },
    ],
  },
  necklace: {
    noun: "necklace",
    cord: "u",
    types: ["bead", "letter", "charm", "pendant", "spacer"],
    minPrice: 500,
    sizes: [
      { id: "choker", label: "Choker", minCm: 35, maxCm: 40, usualCm: 38 },
      { id: "princess", label: "Princess", minCm: 43, maxCm: 48, usualCm: 45 },
      { id: "matinee", label: "Matinee", minCm: 50, maxCm: 60, usualCm: 55 },
    ],
  },
};

/* ---------------- Gifts ---------------- */

export type Packaging = "transparent" | "closed";
export type BoxShape = "square" | "rect";
export type GiftGroup = "Items" | "Decorations" | "Filler" | "Bags & boxes";

export const GIFT_PACKAGING: { id: Packaging; title: string; text: string; price: number }[] = [
  { id: "transparent", title: "Transparent", text: "See what's inside", price: 100 },
  { id: "closed", title: "Closed", text: "Keep it a surprise", price: 0 },
];

export const GIFT_SHAPES: { id: BoxShape; name: string; price: number }[] = [
  { id: "square", name: "Square", price: 690 },
  { id: "rect", name: "Rectangular", price: 890 },
];

export const BOX_COLORS: { id: string; name: string; color: string; price: number }[] = [
  { id: "black", name: "Midnight black", color: "oklch(0.22 0.01 265)", price: 0 },
  { id: "navy", name: "Navy", color: "oklch(0.32 0.07 265)", price: 0 },
  { id: "kraft", name: "Kraft", color: "oklch(0.66 0.08 65)", price: 0 },
  { id: "ivory", name: "Ivory", color: "oklch(0.93 0.02 85)", price: 0 },
  { id: "rose", name: "Rose velvet", color: "oklch(0.62 0.12 10)", price: 100 },
  { id: "gold", name: "Gold foil", color: "oklch(0.76 0.12 85)", price: 150 },
];

export interface GiftItem {
  id: string;
  name: string;
  group: GiftGroup;
  art: ArtId;
  price: number;
  stock: number;
  /** Default width as a fraction of a square box. */
  size: number;
}

export const GIFT_ITEMS: GiftItem[] = [
  { id: "candle", name: "Scented candle", group: "Items", art: "candle", price: 690, stock: 20, size: 0.26 },
  { id: "mini-mug", name: "Mini mug", group: "Items", art: "miniMug", price: 890, stock: 12, size: 0.28 },
  { id: "chocolate", name: "Chocolate bar", group: "Items", art: "chocolate", price: 350, stock: 30, size: 0.26 },
  { id: "cookies", name: "Cookies", group: "Items", art: "cookies", price: 450, stock: 15, size: 0.26 },
  { id: "teddy", name: "Teddy bear", group: "Items", art: "teddy", price: 990, stock: 3, size: 0.32 },
  { id: "tea-tin", name: "Tea tin", group: "Items", art: "teaTin", price: 590, stock: 10, size: 0.24 },
  { id: "bow", name: "Ribbon bow", group: "Decorations", art: "bow", price: 150, stock: 40, size: 0.22 },
  { id: "heart", name: "Felt heart", group: "Decorations", art: "giftHeart", price: 120, stock: 40, size: 0.16 },
  { id: "tag", name: "Gift tag", group: "Decorations", art: "tag", price: 90, stock: 40, size: 0.2 },
  { id: "rose", name: "Dried rose", group: "Decorations", art: "rose", price: 250, stock: 4, size: 0.22 },
  { id: "card", name: "Message card", group: "Decorations", art: "card", price: 190, stock: 40, size: 0.26 },
  { id: "shred", name: "Paper shred", group: "Filler", art: "shred", price: 100, stock: 50, size: 0.4 },
  { id: "nest", name: "Straw nest", group: "Filler", art: "nest", price: 150, stock: 50, size: 0.42 },
  { id: "pouch", name: "Linen pouch", group: "Bags & boxes", art: "pouch", price: 290, stock: 10, size: 0.26 },
  { id: "mini-box", name: "Mini box", group: "Bags & boxes", art: "miniBox", price: 350, stock: 0, size: 0.24 },
];

export const getGiftItem = (id?: string) => GIFT_ITEMS.find((i) => i.id === id);

/* ---------------- Mugs ---------------- */

export const MUG_PRICE = 1290;
export const MUG_AREA_CM = { w: 20, h: 9 };
export const MAX_MUG_ELEMENTS = 1;
export const MUG_DESIGNS: ArtId[] = ["floral", "bestMom", "mountains", "coffee", "sunrise", "waves", "leaves", "nightStars"];

/* ---------------- Apparel ---------------- */

export type GarmentId = "hoodie" | "tee" | "crewneck";
export type Side = "front" | "back";

export interface Garment {
  id: GarmentId;
  name: string;
  price: number;
  print: Record<Side, Bounds>;
}

export const GARMENTS: Garment[] = [
  {
    id: "hoodie",
    name: "Classic Hoodie",
    price: 3490,
    print: { front: { x0: 0.32, y0: 0.33, x1: 0.68, y1: 0.62 }, back: { x0: 0.3, y0: 0.36, x1: 0.7, y1: 0.78 } },
  },
  {
    id: "tee",
    name: "Oversized Tee",
    price: 1990,
    print: { front: { x0: 0.3, y0: 0.25, x1: 0.7, y1: 0.7 }, back: { x0: 0.3, y0: 0.22, x1: 0.7, y1: 0.72 } },
  },
  {
    id: "crewneck",
    name: "Crewneck Sweatshirt",
    price: 2990,
    print: { front: { x0: 0.31, y0: 0.26, x1: 0.69, y1: 0.66 }, back: { x0: 0.31, y0: 0.24, x1: 0.69, y1: 0.72 } },
  },
];

/** The canvas is roughly 75 cm wide at real scale; used for the print-quality check. */
export const APPAREL_CANVAS_CM = 75;

export const GARMENT_COLORS: { id: string; name: string; color: string; dark: boolean }[] = [
  { id: "black", name: "Black", color: "oklch(0.22 0.01 265)", dark: true },
  { id: "white", name: "White", color: "oklch(0.96 0.005 85)", dark: false },
  { id: "navy", name: "Navy", color: "oklch(0.32 0.07 265)", dark: true },
  { id: "sand", name: "Sand", color: "oklch(0.84 0.05 80)", dark: false },
  { id: "forest", name: "Forest", color: "oklch(0.4 0.07 155)", dark: true },
];

export const APPAREL_SIZES: { id: string; soldOut?: boolean }[] = [
  { id: "XS" },
  { id: "S" },
  { id: "M" },
  { id: "L" },
  { id: "XL", soldOut: true },
  { id: "XXL" },
];

export type ApparelTab = "Icons" | "Logos" | "Lettering" | "Illustrations";

export const APPAREL_DESIGNS: { id: string; name: string; tab: ApparelTab; art: ArtId; price: number }[] = [
  { id: "a-star", name: "Star", tab: "Icons", art: "star", price: 200 },
  { id: "a-heart", name: "Heart", tab: "Icons", art: "heart", price: 200 },
  { id: "a-bolt", name: "Lightning", tab: "Icons", art: "bolt", price: 200 },
  { id: "a-smiley", name: "Smiley", tab: "Icons", art: "smiley", price: 200 },
  { id: "a-monogram", name: "Monogram", tab: "Logos", art: "monogram", price: 400 },
  { id: "a-crest", name: "Crest", tab: "Logos", art: "crest", price: 400 },
  { id: "a-wave", name: "Wave badge", tab: "Logos", art: "waveBadge", price: 350 },
  { id: "a-good", name: "Good Vibes", tab: "Lettering", art: "goodVibes", price: 300 },
  { id: "a-wild", name: "Stay Wild", tab: "Lettering", art: "stayWild", price: 300 },
  { id: "a-est", name: "Est. 2026", tab: "Lettering", art: "est2026", price: 300 },
  { id: "a-mountains", name: "Mountains", tab: "Illustrations", art: "mountains", price: 500 },
  { id: "a-sunrise", name: "Sunrise", tab: "Illustrations", art: "sunrise", price: 500 },
  { id: "a-floral", name: "Floral wreath", tab: "Illustrations", art: "floral", price: 500 },
];

export const getApparelDesign = (id?: string) => APPAREL_DESIGNS.find((d) => d.id === id);
export const APPAREL_UPLOAD_FEE = 400;

/* ---------------- Cases ---------------- */

export type Brand = "Apple" | "Samsung" | "Google" | "Other";

export interface PhoneModel {
  id: string;
  brand: Brand;
  name: string;
  price: number;
  soldOut?: boolean;
  /** Height / width of the case. */
  aspect: number;
  /** Corner radius as a fraction of the case width. */
  radius: number;
  /** Camera cut-out, as fractions of case width (x, w) and height (y, h). */
  camera: { x: number; y: number; w: number; h: number; round: number };
  /** Lens centres as fractions of the camera box, radius as a fraction of its shorter side. */
  lenses: [number, number, number][];
}

const PRO_LENSES: [number, number, number][] = [
  [0.29, 0.27, 0.2],
  [0.29, 0.73, 0.2],
  [0.73, 0.5, 0.2],
];

export const PHONE_MODELS: PhoneModel[] = [
  { id: "iphone-16-pro", brand: "Apple", name: "iPhone 16 Pro", price: 1890, aspect: 2.05, radius: 0.17, camera: { x: 0.06, y: 0.025, w: 0.44, h: 0.215, round: 0.28 }, lenses: PRO_LENSES },
  { id: "iphone-16", brand: "Apple", name: "iPhone 16", price: 1790, aspect: 2.05, radius: 0.17, camera: { x: 0.06, y: 0.025, w: 0.27, h: 0.2, round: 0.45 }, lenses: [[0.5, 0.28, 0.32], [0.5, 0.72, 0.32]] },
  { id: "iphone-15-pro", brand: "Apple", name: "iPhone 15 Pro", price: 1890, soldOut: true, aspect: 2.05, radius: 0.17, camera: { x: 0.06, y: 0.025, w: 0.43, h: 0.21, round: 0.28 }, lenses: PRO_LENSES },
  { id: "iphone-15", brand: "Apple", name: "iPhone 15", price: 1790, aspect: 2.05, radius: 0.17, camera: { x: 0.06, y: 0.025, w: 0.38, h: 0.185, round: 0.28 }, lenses: [[0.3, 0.3, 0.22], [0.7, 0.7, 0.22]] },
  { id: "galaxy-s24", brand: "Samsung", name: "Galaxy S24", price: 1790, aspect: 2.08, radius: 0.13, camera: { x: 0.09, y: 0.035, w: 0.15, h: 0.3, round: 0.5 }, lenses: [[0.5, 0.17, 0.42], [0.5, 0.5, 0.42], [0.5, 0.83, 0.42]] },
  { id: "galaxy-s24-ultra", brand: "Samsung", name: "Galaxy S24 Ultra", price: 1990, aspect: 2.1, radius: 0.05, camera: { x: 0.08, y: 0.03, w: 0.15, h: 0.34, round: 0.5 }, lenses: [[0.5, 0.14, 0.4], [0.5, 0.38, 0.4], [0.5, 0.62, 0.4], [0.5, 0.86, 0.4]] },
  { id: "galaxy-a55", brand: "Samsung", name: "Galaxy A55", price: 1590, soldOut: true, aspect: 2.1, radius: 0.12, camera: { x: 0.09, y: 0.035, w: 0.15, h: 0.3, round: 0.5 }, lenses: [[0.5, 0.17, 0.42], [0.5, 0.5, 0.42], [0.5, 0.83, 0.42]] },
  { id: "pixel-9", brand: "Google", name: "Pixel 9", price: 1790, aspect: 2.05, radius: 0.15, camera: { x: 0.14, y: 0.06, w: 0.72, h: 0.085, round: 0.5 }, lenses: [[0.32, 0.5, 0.36], [0.6, 0.5, 0.36]] },
  { id: "pixel-8a", brand: "Google", name: "Pixel 8a", price: 1590, aspect: 2.05, radius: 0.15, camera: { x: 0.06, y: 0.06, w: 0.88, h: 0.08, round: 0.5 }, lenses: [[0.2, 0.5, 0.34], [0.38, 0.5, 0.34]] },
  { id: "nothing-2", brand: "Other", name: "Nothing Phone (2)", price: 1690, aspect: 2.1, radius: 0.14, camera: { x: 0.07, y: 0.03, w: 0.26, h: 0.13, round: 0.5 }, lenses: [[0.3, 0.5, 0.3], [0.72, 0.5, 0.3]] },
  { id: "oneplus-12", brand: "Other", name: "OnePlus 12", price: 1690, aspect: 2.15, radius: 0.13, camera: { x: 0.26, y: 0.035, w: 0.48, h: 0.22, round: 0.5 }, lenses: [[0.5, 0.25, 0.22], [0.27, 0.6, 0.22], [0.73, 0.6, 0.22]] },
];

export const BRANDS: { id: Brand; label: string }[] = [
  { id: "Apple", label: "Apple" },
  { id: "Samsung", label: "Samsung" },
  { id: "Google", label: "Google" },
  { id: "Other", label: "Other phones" },
];

export const getModel = (id?: string | null) => PHONE_MODELS.find((m) => m.id === id);

export const CASE_DESIGNS: { id: string; art: ArtId; price: number }[] = [
  { id: "c-arch", art: "arch", price: 0 },
  { id: "c-blobs", art: "blobs", price: 0 },
  { id: "c-waves", art: "waves", price: 0 },
  { id: "c-checker", art: "checker", price: 0 },
  { id: "c-flowers", art: "flowers", price: 200 },
  { id: "c-night", art: "nightStars", price: 200 },
  { id: "c-stripes", art: "stripes", price: 200 },
  { id: "c-floral", art: "floral", price: 200 },
];

export const getCaseDesign = (id?: string) => CASE_DESIGNS.find((d) => d.id === id);
export const CASE_UPLOAD_FEE = 300;
export const CASE_WIDTH_CM = 7.5;

/* ---------------- Stickers ---------------- */

export type StickerShape = "square" | "circle" | "rectangle" | "oval";

export const STICKER_SHAPES: { id: StickerShape; name: string }[] = [
  { id: "square", name: "Square" },
  { id: "circle", name: "Circle" },
  { id: "rectangle", name: "Rectangle" },
  { id: "oval", name: "Oval" },
];

export interface StickerSize {
  id: string;
  shape: StickerShape;
  label: string;
  wCm: number;
  hCm: number;
  price: number;
}

export const STICKER_SIZES: StickerSize[] = [
  { id: "sq-3", shape: "square", label: "3 × 3 cm", wCm: 3, hCm: 3, price: 35 },
  { id: "sq-5", shape: "square", label: "5 × 5 cm", wCm: 5, hCm: 5, price: 50 },
  { id: "sq-7", shape: "square", label: "7 × 7 cm", wCm: 7, hCm: 7, price: 70 },
  { id: "ci-3", shape: "circle", label: "⌀ 3 cm", wCm: 3, hCm: 3, price: 35 },
  { id: "ci-5", shape: "circle", label: "⌀ 5 cm", wCm: 5, hCm: 5, price: 50 },
  { id: "ci-7", shape: "circle", label: "⌀ 7 cm", wCm: 7, hCm: 7, price: 70 },
  { id: "re-5", shape: "rectangle", label: "5 × 3 cm", wCm: 5, hCm: 3, price: 45 },
  { id: "re-7", shape: "rectangle", label: "7 × 4 cm", wCm: 7, hCm: 4, price: 65 },
  { id: "ov-5", shape: "oval", label: "5 × 3 cm", wCm: 5, hCm: 3, price: 45 },
  { id: "ov-7", shape: "oval", label: "7 × 4.5 cm", wCm: 7, hCm: 4.5, price: 65 },
];

export const getStickerSize = (id?: string | null) => STICKER_SIZES.find((s) => s.id === id);
export const STICKER_DESIGNS: ArtId[] = ["sunSmile", "rainbow", "mushroom", "daisy", "heart", "star", "goodVibes", "leaves"];
export const MAX_STICKER_DESIGNS = 5;
export const MIN_STICKERS = 5;
export const DEFAULT_STICKER_QTY = 10;

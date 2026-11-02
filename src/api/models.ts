/* Types and parsers for API responses, ported from the mobile app's *Models.ts. */

import i18n from "../i18n";

export const BUILDER_TYPES = ["JEWELRY", "BOUQUET", "GIFT", "APPAREL", "CASE", "STICKER", "MUG"] as const;
export type BuilderType = (typeof BUILDER_TYPES)[number];

/** SubCategory type of "Your own design": the customer uploads the image. */
export const CUSTOM_UPLOAD = "CUSTOM_UPLOAD";

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v : null);
const whole = (v: unknown): v is number => Number.isInteger(v) && (v as number) > 0;
const fraction = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;

function invalid(): never {
  throw new Error(i18n.t("errors.catalogData"));
}

/* ---------------- Catalog ---------------- */

export interface MeasuredSize {
  id: string;
  name: string;
  minMeasurementMm: number;
  maxMeasurementMm: number;
  defaultMeasurementMm: number;
  selectedMeasurementMm?: number;
}

export type StickerShape = "SQUARE" | "CIRCLE" | "RECTANGLE" | "OVAL";
export const STICKER_SHAPES: StickerShape[] = ["SQUARE", "CIRCLE", "RECTANGLE", "OVAL"];

export interface StickerSize {
  id: string;
  name: string;
  shape: StickerShape;
  widthMm: number;
  heightMm: number;
  /** Price of one sticker, in cents. */
  price: number;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  builderType: BuilderType | null;
  builderConfig: { silhouette?: string } | null;
  designCategoryId: string | null;
  sizes: unknown[];
}

export interface Component {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  color: string | null;
  type: string | null;
  price: number;
  stock: number;
  /** false for unlimited printed designs. */
  trackStock: boolean;
  /** Jewelry: the length one piece occupies, in mm; null until configured. */
  effectiveLengthMm: number | null;
  isActive: boolean;
  sortOrder: number;
}

export function parseCategory(value: unknown): Category {
  if (!isObject(value) || typeof value.id !== "string" || typeof value.name !== "string" || typeof value.isActive !== "boolean")
    invalid();
  const builder = BUILDER_TYPES.includes(value.builderType as BuilderType) ? (value.builderType as BuilderType) : null;
  const config = isObject(value.builderConfig) ? { silhouette: str(value.builderConfig.silhouette) ?? undefined } : null;
  return {
    id: value.id,
    name: value.name,
    description: str(value.description),
    imageUrl: str(value.imageUrl),
    isActive: value.isActive,
    sortOrder: Number.isFinite(value.sortOrder) ? (value.sortOrder as number) : 0,
    builderType: builder,
    builderConfig: config,
    designCategoryId: str(value.designCategoryId),
    sizes: Array.isArray(value.sizes) ? value.sizes : [],
  };
}

export function parseComponent(value: unknown): Component {
  const c = parseCategory(value);
  const v = value as Record<string, unknown>;
  if (typeof v.categoryId !== "string" || !Number.isSafeInteger(v.price) || !Number.isSafeInteger(v.stock)) invalid();
  return {
    id: c.id,
    categoryId: v.categoryId,
    name: c.name,
    description: c.description,
    imageUrl: c.imageUrl,
    color: str(v.color),
    type: str(v.type),
    price: v.price as number,
    stock: v.stock as number,
    trackStock: v.trackStock !== false,
    effectiveLengthMm: whole(v.effectiveLengthMm) ? v.effectiveLengthMm : null,
    isActive: c.isActive,
    sortOrder: c.sortOrder,
  };
}

/** Only active items, in the admin's order (like the app's activeList). */
export function activeList<T extends { isActive: boolean; sortOrder: number }>(value: unknown, parse: (v: unknown) => T): T[] {
  if (!Array.isArray(value)) invalid();
  return value
    .map(parse)
    .filter((item) => item.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function measuredSizes(category: Pick<Category, "sizes">): MeasuredSize[] {
  return category.sizes.flatMap((s) => {
    if (!isObject(s) || typeof s.id !== "string" || typeof s.name !== "string") return [];
    if (!whole(s.minMeasurementMm) || !whole(s.maxMeasurementMm) || !whole(s.defaultMeasurementMm)) return [];
    if (s.maxMeasurementMm <= s.minMeasurementMm) return [];
    return [{ id: s.id, name: s.name, minMeasurementMm: s.minMeasurementMm, maxMeasurementMm: s.maxMeasurementMm, defaultMeasurementMm: s.defaultMeasurementMm }];
  });
}

export function parseStickerSize(s: unknown): StickerSize | null {
  if (!isObject(s) || typeof s.id !== "string" || typeof s.name !== "string") return null;
  if (!STICKER_SHAPES.includes(s.shape as StickerShape) || !whole(s.widthMm) || !whole(s.heightMm)) return null;
  if (!Number.isSafeInteger(s.price) || (s.price as number) < 0) return null;
  return { id: s.id, name: s.name, shape: s.shape as StickerShape, widthMm: s.widthMm, heightMm: s.heightMm, price: s.price as number };
}

export const stickerSizes = (category: Pick<Category, "sizes">) => category.sizes.flatMap((s) => parseStickerSize(s) ?? []);

/* ---------------- Products ---------------- */

export interface PrintArea {
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
}

export function parseArea(value: unknown): PrintArea | null {
  if (!isObject(value) || ![value.x, value.y, value.width, value.height].every(fraction)) return null;
  const a = value as unknown as PrintArea;
  if (a.width <= 0 || a.height <= 0) return null;
  return { x: a.x, y: a.y, width: a.width, height: a.height, radius: fraction(value.radius) ? Math.min(value.radius, 0.5) : 0 };
}

export interface SizeStock {
  size: string;
  stock: number;
}

export function parseSizes(value: unknown): SizeStock[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((e) => (isObject(e) && typeof e.size === "string" && Number.isSafeInteger(e.stock) ? [{ size: e.size, stock: e.stock as number }] : []));
}

export type ProductOrigin = "COMPANY" | "CUSTOMER";

export interface ProductItem {
  id: string;
  subCategoryId: string;
  quantity: number;
  position: number | null;
  unitPrice: number;
  customImageUrl?: string | null;
  side?: "FRONT" | "BACK" | null;
  x?: number | null;
  y?: number | null;
  scale?: number | null;
  rotation?: number | null;
  subCategory: Partial<Component> & { name: string };
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  categoryId: string;
  origin?: ProductOrigin;
  price: number;
  stock?: number;
  sizes?: unknown;
  color?: string | null;
  colorHex?: string | null;
  imageUrl?: string | null;
  backImageUrl?: string | null;
  overlayImageUrl?: string | null;
  printAreas?: unknown;
  deviceBrand?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  designPreviewUrl?: string | null;
  backDesignPreviewUrl?: string | null;
  baseProductId?: string | null;
  baseProduct?: { id: string; name: string; price?: number; color?: string | null; colorHex?: string | null; imageUrl?: string | null; printAreas?: unknown } | null;
  selectedSize?: { id: string; name: string; selectedMeasurementMm?: number } & Record<string, unknown>;
  textLayers?: unknown;
  giftPackagingId?: string | null;
  giftPackagingColorId?: string | null;
  giftPackaging?: { id: string; name: string; type: string; shape?: string } | null;
  giftPackagingColor?: { id: string; name: string; hex: string } | null;
  itemCount?: number;
  createdAt?: string;
  category?: { id: string; name: string; builderType?: string | null; builderConfig?: unknown };
  items?: ProductItem[];
}

export function parseProduct(value: unknown): Product {
  if (!isObject(value) || typeof value.id !== "string" || typeof value.name !== "string" || typeof value.categoryId !== "string")
    invalid();
  if (!Number.isSafeInteger(value.price)) invalid();
  return value as unknown as Product;
}

export const parseProducts = (value: unknown) => (Array.isArray(value) ? value.map(parseProduct) : invalid());

/**
 * The picture of a product: a design's preview, or a ready-made product's photo. Never a single
 * component: a design without a preview is drawn live from its items instead (DesignPreview).
 */
export const productImage = (p: Pick<Product, "designPreviewUrl" | "imageUrl" | "origin">) =>
  p.designPreviewUrl ?? (p.origin === "CUSTOMER" ? null : (p.imageUrl ?? null));

/* ---------------- Gift packaging ---------------- */

export interface PackagingColor {
  id: string;
  name: string;
  hex: string;
  priceAdjustment: number;
  stock: number;
  isActive: boolean;
  sortOrder: number;
}

export interface GiftPackaging {
  id: string;
  name: string;
  description: string | null;
  type: "TRANSPARENT" | "OPAQUE";
  shape: "SQUARE" | "RECTANGULAR";
  imageUrl: string | null;
  price: number;
  stock: number;
  isActive: boolean;
  sortOrder: number;
  colors: PackagingColor[];
}

export function parsePackagingList(value: unknown): GiftPackaging[] {
  if (!Array.isArray(value)) invalid();
  const bySort = <T extends { sortOrder: number; name: string }>(a: T, b: T) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
  return value
    .flatMap((p): GiftPackaging[] => {
      if (!isObject(p) || typeof p.id !== "string" || typeof p.name !== "string") return [];
      if (p.type !== "TRANSPARENT" && p.type !== "OPAQUE") return [];
      const colors = p.type === "OPAQUE" && Array.isArray(p.colors) ? p.colors : [];
      return [
        {
          id: p.id,
          name: p.name,
          description: str(p.description),
          type: p.type,
          shape: p.shape === "RECTANGULAR" ? "RECTANGULAR" : "SQUARE",
          imageUrl: str(p.imageUrl),
          price: Number.isSafeInteger(p.price) ? (p.price as number) : 0,
          stock: Number.isSafeInteger(p.stock) ? (p.stock as number) : 0,
          isActive: p.isActive === true,
          sortOrder: Number.isFinite(p.sortOrder) ? (p.sortOrder as number) : 0,
          colors: colors
            .flatMap((c): PackagingColor[] =>
              isObject(c) && typeof c.id === "string" && typeof c.name === "string" && typeof c.hex === "string" && /^#[0-9A-Fa-f]{6}$/.test(c.hex)
                ? [
                    {
                      id: c.id,
                      name: c.name,
                      hex: c.hex,
                      priceAdjustment: Number.isSafeInteger(c.priceAdjustment) ? (c.priceAdjustment as number) : 0,
                      stock: Number.isSafeInteger(c.stock) ? (c.stock as number) : 0,
                      isActive: c.isActive === true,
                      sortOrder: Number.isFinite(c.sortOrder) ? (c.sortOrder as number) : 0,
                    },
                  ]
                : [],
            )
            .sort(bySort),
        },
      ];
    })
    .sort(bySort);
}

export const needsColor = (p: GiftPackaging) => p.type === "OPAQUE" && p.colors.length > 0;
export const colorAvailable = (c: PackagingColor) => c.isActive && c.stock > 0;
export const packagingAvailable = (p: GiftPackaging) => p.isActive && (needsColor(p) ? p.colors.some(colorAvailable) : p.stock > 0);

/* ---------------- Users ---------------- */

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  userName: string | null;
  phone: string;
  address: string;
  postalCode: string;
  country: string;
  notificationsEnabled: boolean;
}

export function parseUser(value: unknown): User {
  if (!isObject(value)) throw new Error(i18n.t("errors.accountData"));
  for (const field of ["id", "email"])
    if (typeof value[field] !== "string" || !value[field]) throw new Error(i18n.t("errors.accountData"));
  // Accounts made with Google can have an empty name until the customer adds it.
  for (const field of ["firstName", "lastName"])
    if (typeof value[field] !== "string") throw new Error(i18n.t("errors.accountData"));
  if (value.isActive === false) throw new Error(i18n.t("errors.accountInactive"));
  return {
    id: value.id as string,
    firstName: value.firstName as string,
    lastName: value.lastName as string,
    email: value.email as string,
    userName: str(value.userName),
    phone: str(value.phone) ?? "",
    address: str(value.address) ?? "",
    postalCode: str(value.postalCode) ?? "",
    country: str(value.country) ?? "",
    notificationsEnabled: value.notificationsEnabled !== false,
  };
}

/** What checkout needs before an order can be placed. */
export const missingDelivery = (u: User) =>
  (["firstName", "lastName", "phone", "country", "address"] as const).filter((f) => !u[f].trim());

/* ---------------- Orders ---------------- */

const STATUS_KEYS = ["ORDERED", "CREATING", "CREATED", "READY_FOR_COURIER", "PICKED_UP_BY_COURIER", "COMPLETED"] as const;
type StatusKey = (typeof STATUS_KEYS)[number];
const isStatusKey = (status: string): status is StatusKey => STATUS_KEYS.includes(status as StatusKey);

/** The order journey in order, with its customer-friendly label and line in the current language. */
export const ORDER_STATUSES = STATUS_KEYS.map((status) => ({
  status,
  get label() {
    return i18n.t(`orderStatus.${status}`);
  },
  get description() {
    return i18n.t(`orderStage.${status}`);
  },
}));

export const statusIndex = (status: string) => ORDER_STATUSES.findIndex((s) => s.status === status);

/** Customer-friendly label; an unknown backend value is shown readably. */
export const statusLabel = (status: string) =>
  isStatusKey(status) ? i18n.t(`orderStatus.${status}`) : status.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export const paymentLabel = (type: string) =>
  type === "CASH_ON_DELIVERY" ? i18n.t("payment.cashOnDelivery") : type.replaceAll("_", " ").toLowerCase();

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentType: string;
  paymentStatus?: string;
  quantity?: number;
  totalPrice: number;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  address: string;
  postalCode?: string | null;
  customerNotes?: string | null;
  createdAt: string;
  productId: string;
  product: Product;
}

export interface OrderPage {
  data: Order[];
  meta: { page: number; limit?: number; total: number; totalPages: number };
}

/* ---------------- Notifications, stats, community ---------------- */

export interface AppNotification {
  id: string;
  orderId: string | null;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface PublicStats {
  registeredUsers: number;
  completedOrders: number;
  products: number;
  categories: number;
}

export interface CommunityGallery {
  categories: { id: string; name: string }[];
  categoryId: string | null;
  creations: { id: string; productId: string; name: string; categoryId: string; categoryName: string; designPreviewUrl: string | null; completedAt: string }[];
}

export interface CommunityCreation {
  completedOrderId: string;
  product: Product & { createdBy?: { firstName: string; lastName: string; userName?: string | null } };
}

/* ---------------- Saving designs ---------------- */

export type TextFont = "SERIF" | "SANS" | "SCRIPT";
export type TextWeight = "LIGHT" | "REGULAR" | "BOLD";

export interface TextLayerInput {
  id: string;
  text: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  color?: string;
  font?: TextFont;
  weight?: TextWeight;
  italic?: boolean;
  side?: "FRONT" | "BACK";
}

export interface ProductItemInput {
  subCategoryId: string;
  quantity: number;
  position: number;
  side?: "FRONT" | "BACK";
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  customDesignIndex?: number;
}

export interface ProductInput {
  categoryId: string;
  name: string;
  description?: string;
  items: ProductItemInput[];
  selectedSizeId?: string;
  selectedMeasurementMm?: number;
  baseProductId?: string;
  giftPackagingId?: string;
  giftPackagingColorId?: string;
  textLayers?: TextLayerInput[];
}

export function parseTextLayers(value: unknown): TextLayerInput[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw): TextLayerInput[] => {
    if (!isObject(raw) || typeof raw.id !== "string" || typeof raw.text !== "string" || !raw.text.trim()) return [];
    const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
    return [
      {
        id: raw.id,
        text: raw.text,
        x: num(raw.x, 0.5),
        y: num(raw.y, 0.5),
        scale: num(raw.scale, 1),
        rotation: num(raw.rotation, 0),
        color: str(raw.color) ?? undefined,
        font: ["SERIF", "SANS", "SCRIPT"].includes(raw.font as string) ? (raw.font as TextFont) : undefined,
        weight: ["LIGHT", "REGULAR", "BOLD"].includes(raw.weight as string) ? (raw.weight as TextWeight) : undefined,
        italic: raw.italic === true,
        side: raw.side === "FRONT" || raw.side === "BACK" ? raw.side : undefined,
      },
    ];
  });
}

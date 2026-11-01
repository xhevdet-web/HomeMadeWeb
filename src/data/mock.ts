/* All static content for the site. Prices are stored in cents. */

export function money(cents: number) {
  return `€${(cents / 100).toFixed(2)}`;
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export const DELIVERY_PRICE = 200;
export const PAYMENT_METHOD = "Cash on Delivery";

/* ---------------- User ---------------- */

export interface User {
  firstName: string;
  lastName: string;
  email: string;
  userName: string;
  phone: string;
  address: { street: string; postalCode: string; country: string };
}

export const user: User = {
  firstName: "Arta",
  lastName: "Krasniqi",
  email: "arta@example.com",
  userName: "arta.k",
  phone: "+383 44 123 456",
  address: { street: "Rruga Agim Ramadani 12", postalCode: "10000", country: "Kosovo" },
};

export const initials = (u: User) => `${u.firstName[0]}${u.lastName[0]}`;

/* ---------------- Studios ---------------- */

export type BuilderType = "JEWELRY" | "GIFT" | "MUG" | "APPAREL" | "CASE" | "STICKER";
export type StudioSlug = "bracelet" | "necklace" | "gifts" | "mugs" | "apparel" | "cases" | "stickers";
export type CategoryGroup = "Jewelry" | "Home" | "Apparel" | "Tech" | "Gifts";

export interface Studio {
  slug: StudioSlug;
  name: string;
  builderType: BuilderType;
  image: string;
  line: string;
  text: string;
  description: string;
  fromPrice: number;
  group: CategoryGroup;
  /** Accent meta line on the Create page. */
  meta: string;
}

export const STUDIOS: Studio[] = [
  {
    slug: "bracelet", name: "Bracelet", builderType: "JEWELRY", image: "/images/bracelet.jpg",
    line: "Bead by bead.", text: "Pick your beads, letters and charms. Spell a name, a date, a feeling.",
    description: "Choose a size, then string beads and charms piece by piece.",
    fromPrice: 1490, group: "Jewelry", meta: "3 sizes · 15–19 cm",
  },
  {
    slug: "necklace", name: "Necklace", builderType: "JEWELRY", image: "/images/necklace.jpg",
    line: "Wear your story.", text: "Names, initials and pendants shaped in gold and silver, just for you.",
    description: "Choose a size, then string beads and charms piece by piece.",
    fromPrice: 2990, group: "Jewelry", meta: "Gold or silver · 40–50 cm",
  },
  {
    slug: "gifts", name: "Gifts", builderType: "GIFT", image: "/images/gifts.jpg",
    line: "Made to be opened.", text: "Personal boxes and keepsakes they will remember long after the ribbon.",
    description: "Fill a box with treats and decorations, and add a personal note.",
    fromPrice: 2490, group: "Gifts", meta: "Design your own",
  },
  {
    slug: "mugs", name: "Mugs", builderType: "MUG", image: "/images/mugs.jpg",
    line: "Morning, personalised.", text: "Your artwork, photo or words printed on a mug made for daily rituals.",
    description: "Upload your photos or pick our designs, arrange them and see them on your mug.",
    fromPrice: 1290, group: "Home", meta: "11 oz · Wrap-around print",
  },
  {
    slug: "apparel", name: "Apparel", builderType: "APPAREL", image: "/images/apparel.jpg",
    line: "Wear your design.", text: "Hoodies and tees with your own graphics, printed to last.",
    description: "Pick your piece and size, then add logos, graphics or your own artwork.",
    fromPrice: 1990, group: "Apparel", meta: "Hoodies & tees · XS–XXL",
  },
  {
    slug: "cases", name: "Cases", builderType: "CASE", image: "/images/cases.jpg",
    line: "Protect in style.", text: "Phone cases designed by you, for the device you carry every day.",
    description: "Choose your phone, then add your own photo or one of our designs.",
    fromPrice: 1790, group: "Tech", meta: "iPhone & Samsung models",
  },
  {
    slug: "stickers", name: "Stickers", builderType: "STICKER", image: "/images/stickers.jpg",
    line: "Stick it anywhere.", text: "Die-cut stickers from your doodles, logos and inside jokes.",
    description: "Pick a shape and size, then turn up to five of your own images into stickers.",
    fromPrice: 590, group: "Home", meta: "Up to 5 designs",
  },
];

export const CATEGORY_GROUPS: ("All" | CategoryGroup)[] = ["All", "Jewelry", "Home", "Apparel", "Tech", "Gifts"];

export const getStudio = (slug: string) => STUDIOS.find((s) => s.slug === slug);

/* ---------------- Designs ---------------- */

export interface Design {
  id: string;
  name: string;
  studio: StudioSlug;
  image: string;
  price: number;
  meta: string;
  materials?: string[];
  /** A company product the user saved, not their own design. */
  readyMade?: boolean;
}

export const DESIGNS: Design[] = [
  {
    id: "d1", name: "Summer Initials Bracelet", studio: "bracelet", image: "/images/bracelet.jpg", price: 2490,
    meta: "24 beads · 17.5 cm",
    materials: ["Amber ×8", "Pearl ×6", "Letter J ×1", "Ocean agate ×4", "Gold spacer ×5"],
  },
  {
    id: "d2", name: "Samantha Name Necklace", studio: "necklace", image: "/images/necklace.jpg", price: 3990,
    meta: "Gold script · 45 cm chain",
    materials: ["Gold plated ×1", "Script font", "Lobster clasp"],
  },
  {
    id: "d3", name: "Mom's Birthday Mug", studio: "mugs", image: "/images/mugs.jpg", price: 1690,
    meta: "2 images · 11 oz",
    materials: ["Gloss finish", "Wrap-around print"],
  },
  {
    id: "d4", name: "Logo Hoodie", studio: "apparel", image: "/images/apparel.jpg", price: 3490,
    meta: "Black · M · Front & back",
    materials: ["Heavy cotton", "Logo front", "Tiger back", "Rust ink"],
  },
  {
    id: "d5", name: "Sunset Arch Case", studio: "cases", image: "/images/cases.jpg", price: 1990,
    meta: "iPhone 15 Pro · Matte",
    materials: ["Your photo", "Matte finish"],
  },
  {
    id: "d6", name: "Who Dares Wins Gift Box", studio: "gifts", image: "/images/gifts.jpg", price: 4490,
    meta: "Closed box · 5 keepsakes",
    materials: ["Linen journal", "Scented candle", "Matches", "Message card", "Satin ribbon"],
    readyMade: true,
  },
];

export const getDesign = (id: string) => DESIGNS.find((d) => d.id === id);

/** The unsaved design shown in "Continue my design" on the Create page. */
export const lastDraft = {
  name: "Good Vibes Sticker Pack",
  studio: "stickers" as StudioSlug,
  image: "/images/stickers.jpg",
  lastEdited: "2 days ago",
};

/* ---------------- Orders ---------------- */

export type OrderStatus =
  | "ORDERED"
  | "CREATING"
  | "CREATED"
  | "READY_FOR_COURIER"
  | "PICKED_UP_BY_COURIER"
  | "COMPLETED";

export const ORDER_STATUSES: { status: OrderStatus; label: string; description: string }[] = [
  { status: "ORDERED", label: "Ordered", description: "We received your order and will start on it soon." },
  { status: "CREATING", label: "Being made", description: "Our maker is crafting your piece by hand." },
  { status: "CREATED", label: "Created", description: "Your piece is finished and getting a final check." },
  { status: "READY_FOR_COURIER", label: "Ready for courier", description: "Packed with care and waiting for the courier." },
  { status: "PICKED_UP_BY_COURIER", label: "With courier", description: "Your piece is on its way to you." },
  { status: "COMPLETED", label: "Completed", description: "Delivered. We hope you love it!" },
];

export const statusIndex = (s: OrderStatus) => ORDER_STATUSES.findIndex((o) => o.status === s);
export const statusInfo = (s: OrderStatus) => ORDER_STATUSES[statusIndex(s)];

/** What is being ordered: a sample design or one saved from a studio. */
export interface OrderItem {
  name: string;
  meta: string;
  image: string;
  unitPrice: number;
  editHref: string;
  /** Query string that identifies the item, e.g. `design=d1`. */
  ref: string;
  /** Set for designs saved in a studio this session; they render a live thumbnail. */
  savedId?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  designId?: string;
  item: OrderItem;
  quantity: number;
  createdAt: string;
  totalPrice: number;
  payment: typeof PAYMENT_METHOD;
  status: OrderStatus;
  note?: string;
}

export function designItem(d: Design): OrderItem {
  return { name: d.name, meta: d.meta, image: d.image, unitPrice: d.price, editHref: `#/studios/${d.studio}/design?load=${d.id}`, ref: `design=${d.id}` };
}

/** Resolves `?design=` from the URL into one of the sample designs. Saved designs are resolved by the studio store. */
export function resolveItem(query: URLSearchParams): OrderItem {
  return designItem(getDesign(query.get("design") ?? "") ?? DESIGNS[0]);
}

function makeOrder(n: number, designId: string, createdAt: string, quantity: number, status: OrderStatus, note?: string): Order {
  const item = designItem(getDesign(designId)!);
  return {
    id: `hc-${n}`,
    orderNumber: `HC-${n}`,
    designId,
    item,
    quantity,
    createdAt,
    totalPrice: item.unitPrice * quantity + DELIVERY_PRICE,
    payment: PAYMENT_METHOD,
    status,
    note,
  };
}

export const ORDERS: Order[] = [
  makeOrder(10487, "d3", "2026-10-28T10:20:00Z", 2, "CREATING", "Please ring twice, the doorbell is quiet."),
  makeOrder(10485, "d2", "2026-10-24T15:05:00Z", 1, "CREATED"),
  makeOrder(10484, "d5", "2026-10-20T09:40:00Z", 1, "READY_FOR_COURIER"),
  makeOrder(10483, "d4", "2026-10-16T18:12:00Z", 1, "PICKED_UP_BY_COURIER", "Leave it with the neighbour at no. 14 if I'm out."),
  makeOrder(10482, "d1", "2026-10-12T12:00:00Z", 1, "COMPLETED"),
];

export const NEW_ORDER_ID = "hc-10488";

/** The order "created" by Place Order on the checkout page. */
export function placedOrder(item: OrderItem, quantity: number): Order {
  return {
    id: NEW_ORDER_ID,
    orderNumber: "HC-10488",
    item,
    quantity,
    createdAt: new Date().toISOString(),
    totalPrice: item.unitPrice * quantity + DELIVERY_PRICE,
    payment: PAYMENT_METHOD,
    status: "ORDERED",
  };
}

export const getOrder = (id: string) => ORDERS.find((o) => o.id === id);

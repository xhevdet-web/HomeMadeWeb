# Task: add static pages to the HomeCreator website

You are working in the `HomeMadeWeb/` folder. It is a Vite + React 19 + TypeScript + Tailwind v4 site. Today it has **only the homepage**, all in `src/App.tsx`, with design tokens in `src/index.css`.

The site is the web version of our mobile app (`HomeMade Creations/`, Expo / React Native). Customers design custom products (bracelets, necklaces, gifts, mugs, apparel, phone cases, stickers), save them, order them, and follow the order until it is delivered.

Add these pages: **Studios, Create, My Designs, Orders (with checkout and order tracking), Profile**.

## Most important rule: STATIC ONLY

This pass is for visual design only. I will review the pages and change things before we connect anything.

- No API calls, no `fetch`, no auth, no backend, no state libraries (Redux, Zustand, React Query).
- All content comes from hard-coded mock data in `src/data/mock.ts`.
- Buttons and links move between pages. Anything else (save, upload, place order, sign out, toggles) can be a no-op or change local `useState` only, so it *looks* interactive.
- No drag-and-drop, no canvas editing, no image upload. A studio shows a **picture** of the editor, not a working editor.
- Do not add npm dependencies. Write routing yourself (see below).

## Match the existing homepage design exactly

Every new page must look like it belongs to the current homepage. Read `src/App.tsx` and `src/index.css` first and reuse what is there:

- **Colours:** only the tokens in `index.css`: `bg-background`, `bg-card`, `bg-secondary`, `text-foreground`, `text-muted-foreground`, `text-primary` (apricot), `bg-primary` / `text-primary-foreground`, `border-border`. Dark navy theme only. Do not add new hex colours. If you need a success colour for "Completed", add one token (`--success`, soft green) to `:root` and `@theme`.
- **Type:** `font-display` (Fraunces) for headings, product names and prices. `font-sans` (Manrope) for body text. Headings follow the homepage pattern: one plain phrase, then an italic primary phrase, e.g. `My <em className="font-normal text-primary">designs.</em>`
- **Eyebrow labels:** the `eyebrow` utility (uppercase, wide tracking, primary colour) above every page title.
- **Cards:** `rounded-[2rem] border border-border bg-card` for large panels. Use smaller radii (`rounded-2xl`) for list items and thumbnails.
- **Buttons:** primary = `rounded-full bg-primary px-7 py-3.5 font-semibold text-primary-foreground hover:scale-105 transition-transform`; add `shadow-glow` on the single main action of a page. Secondary = `rounded-full border border-border hover:bg-secondary`.
- **Layout:** `mx-auto max-w-7xl px-6`. Pages start below the fixed nav (`pt-32`). Generous spacing like the homepage.
- **Motion:** use the existing `animate-rise` with staggered `animationDelay` for page headers. Respect `prefers-reduced-motion` (already handled in CSS). No new heavy scroll effects. The sticky category stack stays on the homepage only.
- **Images:** reuse `/public/images/*.jpg` (bracelet, necklace, gifts, mugs, apparel, cases, stickers, hero) as product and design thumbnails.
- **Responsive:** must work at 375px phone width (one column, no horizontal scroll) and on desktop.
- **Accessibility:** semantic HTML, real `<button>` / `<a>`, alt text, visible focus states, labels on form fields.

## Code structure

`App.tsx` is one big file. Split it without changing how the homepage looks or behaves:

```
src/
  main.tsx
  App.tsx                 // layout (Nav + current page + Footer) and the router switch
  router.ts               // tiny hash router: useRoute() + navigate()
  data/mock.ts            // all mock data, typed
  components/             // Logo, Nav, Footer, Button, PageHeader, StatusPill, OrderProgress, ...
  pages/
    HomePage.tsx          // the current homepage, moved here unchanged
    StudiosPage.tsx
    StudioPage.tsx        // one template, configured per studio
    CreatePage.tsx
    DesignsPage.tsx
    OrdersPage.tsx
    OrderDetailPage.tsx
    CheckoutPage.tsx
    ProfilePage.tsx
```

**Routing:** hash-based, so it works on any static host without server config. Write a ~30 line hook that listens to `hashchange`, and scroll to top on route change.

| Route | Page |
|---|---|
| `#/` | Home (existing) |
| `#/studios` | Studios overview |
| `#/studios/:slug` | One studio (`bracelet`, `necklace`, `gifts`, `mugs`, `apparel`, `cases`, `stickers`) |
| `#/create` | Create (start a new design) |
| `#/designs` | My Designs |
| `#/checkout` | Checkout for one design |
| `#/orders` | My Orders |
| `#/orders/:id` | Order detail / tracking |
| `#/profile` | Profile |

The homepage uses in-page anchors (`#categories`, `#stats`, `#create`). Rename them to `#/` + scroll, or use ids that don't clash with the router. They must keep working.

## Shared layout changes

**Nav** (keep the existing look and the blur-on-scroll behaviour):
- Links: `Studios`, `My Designs`, `Orders`, `Profile`. Highlight the active page in `text-foreground`; the others stay `text-muted-foreground`.
- Right side: a round avatar with initials (`AK`) linking to Profile, plus the existing primary button renamed **"Start creating"** → `#/create`.
- Mobile (< md): the links are hidden today. Add a simple menu button that opens a full-width panel with the same links.
- On pages other than Home, the nav always shows its "scrolled" style (solid blurred background), because there is no hero image behind it.

**Homepage links:** each category card button "Design a bracelet →" goes to `#/studios/bracelet` (and so on). "Create your own →" and "Explore categories" go to `#/create` and `#/studios`. Otherwise do not change the homepage.

**Footer:** keep it; add small links to Studios, My Designs, Orders, Profile.

## Mock data (`src/data/mock.ts`)

Typed and realistic. Prices are shown in euros with 2 decimals (`€24.90`). Store prices in cents and format with a `money()` helper, like the app does.

- **user:** firstName `Arta`, lastName `Krasniqi`, email `arta@example.com`, userName `arta.k`, phone `+383 44 123 456`, address `{ street: "Rruga Agim Ramadani 12", postalCode: "10000", country: "Kosovo" }`.
- **studios (7):** slug, name, builderType (`JEWELRY | GIFT | MUG | APPAREL | CASE | STICKER`), image, line and text (copy them from the homepage `CATEGORIES`), studio description (below), "from" price.
- **designs (6):** id, name (e.g. "Summer Initials Bracelet", "Mom's Birthday Mug", "Logo Hoodie"), studio slug, image, price, meta line (e.g. "24 beads · 17.5 cm", "2 images · 11 oz", "Black · M · Front & back"), optional material chips (e.g. "Pearl ×8", "Gold letter A ×1").
- **orders (5):** id, orderNumber (`HC-10482`), design reference, createdAt, totalPrice, payment `Cash on Delivery`, status. Use a different status for each so every state is visible.
- **order statuses:** in this order, with labels and descriptions:

| Status | Label | Description |
|---|---|---|
| `ORDERED` | Ordered | We received your order and will start on it soon. |
| `CREATING` | Being made | Our maker is crafting your piece by hand. |
| `CREATED` | Created | Your piece is finished and getting a final check. |
| `READY_FOR_COURIER` | Ready for courier | Packed with care and waiting for the courier. |
| `PICKED_UP_BY_COURIER` | With courier | Your piece is on its way to you. |
| `COMPLETED` | Completed | Delivered. We hope you love it! |

- **delivery price:** €2.00. Payment is **Cash on Delivery** only.

## Pages

### 1. Studios — `#/studios`

- Header: eyebrow `CREATIVE STUDIOS`, title `Seven studios. <em>One idea: yours.</em>`, one line of intro.
- A grid of 7 studio cards (1 column on phones, 2 on tablets, 3 on desktop). Each card has the image (top, rounded), the italic primary `line`, the name in big `font-display`, a one-line description, "from €X", and a "Open studio →" link to `#/studios/:slug`.
- Hover: slight image zoom and border lightening. Keep it calm.

Studio descriptions (from the app):

| Studio | Description |
|---|---|
| Bracelet / Necklace | Choose a size, then string beads and charms piece by piece. |
| Gifts | Fill a box with treats and decorations, and add a personal note. |
| Mugs | Upload your photos or pick our designs, arrange them and see them on your mug. |
| Apparel | Pick your piece and size, then add logos, graphics or your own artwork. |
| Cases | Choose your phone, then add your own photo or one of our designs. |
| Stickers | Pick a shape and size, then turn up to five of your own images into stickers. |

### 2. Studio page — `#/studios/:slug` (one template, configured per studio)

A static **mock-up** of the design editor:

- **Top:** back link "← All studios", eyebrow `CREATIVE STUDIO`, the studio name as title, its description.
- **Step indicator** (like the app): `1 Choose base → 2 Design → 3 Review`, with step 2 active.
- **Main area, two columns on desktop and stacked on mobile:**
  - **Left, large:** the "canvas": a `bg-card rounded-[2rem]` stage with a soft radial glow (`bg-glow`) and the studio image centred as if it were the live design. Small floating toolbar on top (Undo, Redo, Clear) as icon buttons. They do nothing.
  - **Right, the tools panel:** what is in it depends on the studio:
    - **Bracelet / Necklace:** size selector (chips `S 15–16 cm`, `M 16.5–17.5 cm`, `L 18–19 cm`, one selected), a length line `17.5 cm`, tabs `Beads / Letters / Charms`, a grid of round bead swatches (coloured circles with name and price), and a "Your bracelet" list of placed beads with counts.
    - **Gifts:** packaging choice (`Transparent: See what's inside` / `Closed: Keep it a surprise`), shape (`Square` / `Rectangular`), a row of box colour swatches, tabs `Items / Decorations / Filler`, an item grid, and a "Personal note" textarea.
    - **Mugs:** upload drop-zone (visual only: "Upload image · JPEG, PNG or WebP, up to 5 MB"), "or pick one of our designs" grid, a layers list (`Image 1`, `Image 2`), and the note "Keep important parts inside the dashed area" (draw a dashed safe area on the canvas).
    - **Apparel:** selected piece card ("Classic Hoodie · Black · M" with "Change"), `Front / Back` toggle, colour swatches, size chips `XS–XXL`, tabs `Logos / Graphics / Text / Your artwork`.
    - **Cases:** phone model selector ("iPhone 15 Pro" with "Change model"), upload drop-zone, "or" divider, a grid of ready designs.
    - **Stickers:** shape chips (`Square / Circle / Rectangle / Oval`), size chips (`5 × 5 cm`, `7.5 × 7.5 cm`, `10 × 10 cm`), design tabs `Design 1 … 5` with "+ Add design", and a quantity stepper per design.
- **Bottom summary bar:** sticky at the bottom of the viewport on mobile, inline on desktop. Shows "Your creation · 24 pieces", the price in `font-display text-primary`, a secondary button **Save design** and a primary button **Preview & order →** (goes to `#/checkout`).

Make the per-studio panels data-driven from one config object. Do not create seven separate page files.

### 3. Create — `#/create`

The start of a new design, like the app's "Create" tab.

- Header: eyebrow `START CREATING`, title `Create your <em>story.</em>`, body: "A bracelet for a memory. A necklace for someone special. Start with a piece and make it yours."
- A "Continue my design" card at the top: thumbnail of the last unsaved design, its name, "Last edited 2 days ago", and a button to its studio.
- The step indicator `1 Choose a category · 2 Explore · 3 Create`, with step 1 active.
- A search input (visual) and filter chips: `All`, `Jewelry`, `Home`, `Apparel`, `Tech`, `Gifts`. Filtering by chip may work with local state.
- A category grid: compact cards (image, name, short description, an accent meta line like "3 sizes · 15–19 cm" or "Design your own"), each linking to its studio.

### 4. My Designs — `#/designs`

Saved designs, ready to edit or order.

- Header: eyebrow `MY DESIGNS`, title `Saved and <em>ready to order.</em>`, subtitle "6 saved designs", and on the right a "+ New design" button → `#/create`.
- Filter chips by studio (All, Bracelet, Mugs, …) using local state.
- A grid of design cards (1 / 2 / 3 columns). Each card has: a square thumbnail on `bg-secondary`, name in `font-display`, meta line in muted text, price in primary, up to 3 material chips plus "+N more", and a footer divided by a top border with **Edit copy** (text button with a pencil icon, links to the studio) on the left and **Order →** (primary pill, links to `#/checkout`) on the right.
- One card shows a "Ready-made" badge and no Edit button (a company product the user saved).
- **Empty state:** show it under the grid in a box labelled "Empty state preview" so I can review it. Sparkle icon, "No saved designs yet", "Create your first piece in the studio. Saved designs appear here, ready to order.", button "Start designing".

### 5. Checkout — `#/checkout`

The step between "Order" and a placed order.

- Step indicator: `Step 1 of 2: Your design` → `Step 2 of 2: Delivery & payment`. Show step 2 active, step 1 done.
- **Left column:**
  - "Deliver to" card: name, street, postal code, country, phone, with "Edit delivery" → `#/profile`.
  - Payment card: "Cash on Delivery" selected (radio look), "Nothing to pay now. Pay when your piece arrives."
  - Collapsible "Add a delivery note: Optional · anything your courier should know" with a textarea.
- **Right column (sticky on desktop):** order summary: design thumbnail, name, meta line, "Edit design" link, quantity stepper (local state), and price lines (Design, Delivery €2.00, **Total due on delivery**). Then a big primary **Place Order** button with `shadow-glow` that goes to `#/orders/<new id>`. Caption below: "Pay cash when your order arrives."

### 6. My Orders — `#/orders`

- Header: eyebrow `MY ORDERS`, title `From workshop <em>to doorstep.</em>`, subtitle "5 orders".
- A list (not a grid) of order rows, each a clickable card → `#/orders/:id`. Each row has: 72px thumbnail, product name in `font-display`, a **status pill** (primary-coloured border by default; green with a ✓ for Completed), a muted line `HC-10482 · 12 Oct 2026`, price in primary plus "Cash on Delivery" muted, a chevron, and below it a **6-segment progress bar** where finished steps are filled with primary.
- Static pagination at the bottom (`‹ 1 2 3 ›`, page 1 active).
- Empty-state preview box: bag icon, "No orders yet", "When you order a design or a ready-made piece, you can follow it here from workshop to doorstep.", button "Start designing".

### 7. Order detail / tracking — `#/orders/:id`

- Optional top banner when coming from checkout: a success card "Thank you, Arta. Your order has been placed." with order number and total.
- Header: "← Back to my orders", product name as title, muted line `Order HC-10482 · Placed 12 Oct 2026`, status pill.
- **Two columns on desktop:**
  - **Left:** big design preview on `bg-card` with glow, then "Your order's journey": a vertical timeline of the 6 statuses. Finished steps get a filled primary dot and check. The current step gets a larger ring, a `NOW` tag, and its description. Upcoming steps are muted.
  - **Right:** Delivery card (address), Payment card ("Cash on Delivery · Due on delivery", "Pay when your order arrives"), "Your note" card, and "Price details" (item lines, delivery, total).

### 8. Profile — `#/profile`

Follow the app's settings layout, made wider for desktop: a profile card on the left (sticky), settings groups on the right.

- **Profile card:** a 60px round `bg-primary` avatar with initials `AK`, full name in `font-display`, email and `@arta.k` in muted, "Edit details" button.
- **Notice** (soft card with an alert icon): "Add your phone and address so you can order in one tap." Show it once for review and label it as a conditional state.
- **Settings groups:** a small uppercase muted title, then one `bg-card rounded-2xl border` group whose rows are separated by borders. Each row has a 34px rounded icon tile in primary, a title, an optional muted subtitle or value, and a chevron or a toggle.
  - **Account:** Personal details (`+383 44 123 456`), Delivery address (`Rruga Agim Ramadani 12, 10000, Kosovo`), Change password.
  - **My activity:** My Designs → `#/designs`, My Orders → `#/orders`.
  - **Preferences:** Dark mode (toggle, on), Notifications (toggle, subtitle "Order updates and news"), Language (value "English", options English / Shqip).
  - **Support:** Help & FAQ, Contact us, Terms of service, Privacy policy.
  - **Session:** Sign out, shown in a danger/red tone with no chevron.
- Under the groups, centred muted text: "HomeCreator · Version 1.0.0".
- **Personal details form**, shown inline when "Edit details" is clicked (local state). Two cards: `PERSONAL INFORMATION` (First name, Last name, Phone, Email read-only) and `DELIVERY ADDRESS` (Country, Address textarea, Postal code). Then a primary **Save** button. Inputs: `bg-background border border-border rounded-xl`, primary focus ring.

## Done when

- `npm run build` passes with no TypeScript errors.
- The homepage looks and behaves exactly as before; only its links changed.
- Every route above renders, is reachable from the nav or from page buttons, and works at 375px and 1440px widths.
- No network requests besides fonts and local images.
- Short summary at the end: the files you created, and anything you were unsure about, so I can review it.

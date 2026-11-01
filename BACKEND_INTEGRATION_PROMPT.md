# Task: connect the HomeCreator website to the real backend

You are working in `HomeMadeWeb/`, a Vite + React 19 + TypeScript + Tailwind v4 site with a hash router in `src/router.ts`. Every page and the seven studios exist, but they run on mock data (`src/data/mock.ts`, `src/data/studioCatalog.ts`) and an in-memory "saved designs" store.

Replace the mock data with the **real API**, the same one our mobile app (`../HomeMade Creations/`) uses. The backend is NestJS in `../homeMadeApi/`.

**Read these before you start:**
- `../HomeMade Creations/src/api/`: `apiSlice.ts`, `endpoints/*.ts`, `authModels.ts`, `catalogModels.ts`, `commerceModels.ts`, `builderModels.ts`. These are the request shapes and parsers that already work.
- `../HomeMade Creations/src/services/*Design.ts`: how each studio builds the payload it saves.
- `../homeMadeApi/docs/*.md`: products, orders, canvas studios (gift), cases studio, authentication.

## The one product difference from the app

| | Mobile app | Website |
|---|---|---|
| First screen | Login | Homepage. Everything public is browsable without an account. |
| Designing in a studio | After login | **Anyone, without login.** Studios load the real catalog from public endpoints. |
| Save design, Order, My Designs, Orders, Profile, Notifications | Logged in | **Login required.** |

**When a signed-out visitor clicks "Save design" or "Continue to order":**
1. Open a **login modal** over the studio. It is a modal, not a page change, so the design in memory is never lost. The modal has a "Create an account" tab for registering.
2. After a successful login or registration, **continue the action automatically**: save the design (`POST /products`), then go on to the preview or checkout as the button promised.
3. If the visitor closes the modal, the design stays exactly as it was.

**Drafts:** keep every studio draft in the studio context, and mirror the non-image parts to `localStorage` (key `hc.drafts.v1`) so a reload doesn't wipe a design. Uploaded files can't be stored that way. After a reload, show "Re-upload your image" in their place.

**Protected routes:** `#/designs`, `#/orders`, `#/orders/:id`, `#/checkout`, `#/profile` and `#/notifications` show the login modal when signed out and render the page after login. Closing the modal goes to `#/`.

## Configuration

- `VITE_API_URL` in `.env`, e.g. `http://localhost:3000/api/v1`. This is the API root **including `/api/v1`**, like the app's `EXPO_PUBLIC_API_URL`.
- Add a `.env.example`, and `.env` to `.gitignore`.
- **Backend prerequisite (tell me in your summary):** CORS only allows `http://localhost:8081` by default (`homeMadeApi/src/config/setup-app.ts`). Add the website's origin to `CORS_ORIGINS` in `homeMadeApi/.env`, e.g. `CORS_ORIGINS=http://localhost:8081,http://localhost:5173`. Do not change backend code for this.

## API client (`src/api/`)

**No new state library is required.** A small `fetch` wrapper plus a few hooks is enough. If you prefer, `@tanstack/react-query` is the one dependency allowed. Mirror the app's `baseQuery` behaviour:

- Send `Accept: application/json`, plus `Content-Type: application/json` for JSON bodies. **Never set Content-Type for `FormData`.**
- `Authorization: Bearer <accessToken>` on authenticated calls.
- **Timeout:** 15 s, or 45 s for multipart uploads. Use `AbortController`, and abort when a component unmounts.
- **Errors:** NestJS sends `{ message: string | string[] }`. Join arrays with spaces and show the server message as it is.
  - Network failure → "We can't reach the server. Check your connection and try again."
  - Timeout → "The request took too long. Please try again."
  - **401 on an authenticated call:** clear the session and open the login modal with "Your session has ended. Please sign in again."
- **Catalog lists:** keep only `isActive` items and sort by `sortOrder`, like the app's `activeList`.
- **Prices:** always in **cents** from the API. Format with the existing `money()`. **Never send prices.** The backend calculates them.
- **Loading and error states:** every list shows a skeleton while loading, an error with a "Try again" button, and an empty state. Reuse the existing `EmptyState` component.

## Authentication

- **Login:** `POST /auth/login` with body `{ identifier, password }`.
  - `identifier` is the email or username, trimmed and lowercased.
  - The response is `{ accessToken, expiresIn, user }`. `expiresIn` is in seconds. **There is no refresh token.**
  - Store `expiresAt = Date.now() + expiresIn*1000`, then verify with `GET /auth/me` (like the app's `validate`).
- **Token storage:** follow the app's web rule in `services/authStorage.web.ts`, *"Never persist bearer tokens in browser storage"*. Keep the token **in memory only**. Reloading the page signs the user out; drafts survive because they are in `localStorage`. Schedule a sign-out when the token expires.
- **Register:** `POST /auth/register` with body `{ firstName, lastName, email, password, userName?, phone?, country?, address?, postalCode? }`.
  - Trim everything. Lowercase `email` and `userName`.
  - Password: **12–128 characters**. Show the live rule checklist like the app's `PasswordChecks`.
  - `userName`: 3–30 characters, `^[a-z0-9_.-]+$`.
  - Registration does **not** return a token, so call login straight after with the same credentials.
- **Current user:** `GET /auth/me` (auth). The user has flat address fields `address`, `postalCode`, `country`. Map them the way the app's `parseUser` does. Reject `isActive === false`.
- **Change password:** `PATCH /auth/change-password` (auth) with body `{ currentPassword, newPassword, confirmPassword }`.
- **Update profile:** `PATCH /users/me` (auth) with body `{ firstName?, lastName?, phone?, country?, address?, postalCode?, notificationsEnabled? }`. Send only changed fields; `postalCode` can be `null`. **Never** use `PATCH /users/:id`, which is admin-only.
- **Sign out:** clear the in-memory session. There is no backend call.
- **Nav:** signed out, show **Sign in** plus the "Start creating" button. Signed in, show the avatar with initials, a notifications bell with the unread count, and a menu (Profile, My Designs, Orders, Sign out).

## Every endpoint the website uses

`🔓` public · `🔐` needs a Bearer token · *(opt)* the token is sent when available (optional auth)

### Auth and account

| Method | Path | Auth | Used for |
|---|---|---|---|
| POST | `/auth/login` | 🔓 | Login modal |
| POST | `/auth/register` | 🔓 | Register tab |
| GET | `/auth/me` | 🔐 | Verify the session after login and load the profile |
| PATCH | `/auth/change-password` | 🔐 | Profile → Change password |
| PATCH | `/users/me` | 🔐 | Profile form, delivery details before checkout, notifications toggle |

### Catalog (all public, so studios work signed out)

| Method | Path | Auth | Used for |
|---|---|---|---|
| GET | `/categories` | 🔓 | Homepage categories, Studios page, Create page, stats |
| GET | `/categories/:id` | 🔓 | Studio header, sizes (`sizes`), `builderType`, `builderConfig` |
| GET | `/categories/:id/sub-categories` | 🔓 | Studio components: beads/charms (with `effectiveLengthMm`), gift items, apparel/case/mug/sticker designs (`type`, `price`, `stock`, `trackStock`, `color`, `imageUrl`) |
| GET | `/sub-categories?categoryId=` | 🔓 | Same list, filtered; used for the shared design library (`designCategoryId`) |
| GET | `/sub-categories/:id` | 🔓 | One component |
| GET | `/products?categoryId=&origin=COMPANY&isActive=true&search=` | *(opt)* | Ready-made pieces per category, apparel **bases**, case **phone models**, the blank **mug** with `printAreas`, homepage stats |
| GET | `/products/:id` | *(opt)* | Product details, and reopening a saved design ("Edit copy") |
| GET | `/categories/:categoryId/products` | *(opt)* | Alternative per-category product list |
| GET | `/gift-packaging` | 🔓 | Gift studio step 1: packaging types, shapes, colours, prices. Inactive ones are returned too, so hide them in the picker but keep them for showing saved gifts. |

### Designs (login required)

| Method | Path | Auth | Used for |
|---|---|---|---|
| POST | `/products` | 🔐 | **Save design.** Multipart, see below. |
| GET | `/users/:userId/products` | 🔐 | My Designs, using the signed-in user's id |
| GET | `/products/creations/from-others?categoryId=` | 🔐 | "Created by others" on a category or studio page. Show it only when signed in. |
| GET | `/products/creations/community?categoryId=` | 🔐 | Community gallery on the homepage when signed in. Hide the section when signed out. |

### Orders (login required)

| Method | Path | Auth | Used for |
|---|---|---|---|
| POST | `/orders` | 🔐 | Place order: `{ productId, paymentType: "CASH_ON_DELIVERY", size?, quantity?, customerNotes? }` |
| GET | `/orders?page=&limit=20` | 🔐 | My Orders. The response is `{ data, meta: { page, limit, total, totalPages } }`, newest first. |
| GET | `/orders/:id` | 🔐 | Order detail and tracking, and the confirmation after checkout |

### Notifications (login required)

| Method | Path | Auth | Used for |
|---|---|---|---|
| GET | `/notifications` | 🔐 | Notifications page / dropdown |
| GET | `/notifications/unread-count` | 🔐 | Bell badge (`{ count }`). Poll every 60 s while the tab is visible. |
| PATCH | `/notifications/:id/read` | 🔐 | Mark one read (optimistic) |
| PATCH | `/notifications/read-all` | 🔐 | Mark all read (optimistic) |

### Support

| Method | Path | Auth | Used for |
|---|---|---|---|
| POST | `/contact` | 🔓 | Contact form: `{ name, email, subject, message, orderNumber? }`. The endpoint is rate-limited, so show its 429 message. |

**Do not use** admin endpoints: `POST/PATCH/DELETE` on categories, sub-categories and gift-packaging, `/users` (list or CRUD), `PATCH /orders/:id/status`, and so on.

## Saving a design: `POST /products` (multipart `FormData`)

Build it exactly like the app's `productFormData` (`src/api/endpoints/productSlice.ts`):

| Field | Value |
|---|---|
| `categoryId` | the studio's category id |
| `name` | design name (default "My {category}") |
| `description` | optional |
| `items` | `JSON.stringify([...])`, one entry per placed component: `{ subCategoryId, quantity, position, side?, x?, y?, scale?, rotation?, customDesignIndex? }` |
| `selectedSizeId` | jewelry/sticker size, or the apparel base size |
| `selectedMeasurementMm` | bracelet/necklace exact length in mm |
| `baseProductId` | **apparel** garment, **case** phone model, **mug** blank product |
| `giftPackagingId`, `giftPackagingColorId` | **gift** packaging (the colour is for closed packaging) |
| `textLayers` | `JSON.stringify([...])`, gift and apparel only, max 6: `{ id, text (1–80), x, y, scale, rotation, color "#RRGGBB", font "SERIF"\|"SANS"\|"SCRIPT", weight "LIGHT"\|"REGULAR"\|"BOLD", italic, side? }` (`side` "FRONT"/"BACK" is apparel only) |
| `designPreview` | PNG of the finished design, made from the studio's SVG/DOM (see below) |
| `backDesignPreview` | apparel back side, only when the back has content |
| `customDesigns` | the customer's own uploaded files, in the order referenced by `customDesignIndex`. Apparel accepts PNG only; cases, mugs and stickers accept JPEG/PNG/WebP up to 5 MB. |

Per studio, copy the item rules from the app's `services/*Design.ts` and the backend docs:

- **Jewelry:** group consecutive identical pieces into one item `{ subCategoryId, quantity, position }`. The backend checks the length (±2 mm of `selectedMeasurementMm`) and the **€5.00 minimum**.
- **Gift:** one item per placed piece with `quantity: 1` and **required** `x, y` (0–1), plus `scale` (0.1–5) and `rotation` (−360…360). `position` is the stacking order (0 = back).
- **Apparel:** items carry `side`. Own artwork uses `customDesignIndex`.
- **Case:** exactly one item. `scale: 1` means "covers the printable area". Own photo uses `customDesignIndex: 0`.
- **Mug / Sticker:** follow `services/mugDesign.ts` and `services/stickerDesign.ts`. Sticker sizes come from `category.sizes`, and the mug print area from the blank product's `printAreas`.

**Preview image:** render the studio's SVG to a PNG blob on a transparent background, 840 × 840 for jewelry, like the app. Image elements must be inlined (fetch → blob → data URL) so the canvas isn't tainted; the API's image host needs CORS for this.

**After saving:**
- The response is the saved product: use its `id`, `price` and `designPreviewUrl`.
- Show "Saved to My Designs." and continue the action that was clicked.
- **Saving never reserves stock.**
- Editing a saved design and saving again creates a **new** product. Customers can't `PATCH`.

## Checkout and orders

- **Before placing an order:** the user needs `firstName`, `lastName`, `phone`, `country` and `address`. If any are missing, show the delivery form (which calls `PATCH /users/me`) inside checkout, then continue.
- **Place order:** `POST /orders` with `paymentType: "CASH_ON_DELIVERY"`.
  - Add `size` only for a ready-made product sold in sizes. Add `quantity` for mugs, stickers and ready-made products. Add trimmed `customerNotes` if it isn't empty.
  - **Never retry automatically.** There is no idempotency key. If the result is uncertain (timeout or network error), say: "We could not confirm whether your order was placed. Check My Orders before doing anything else." and disable the button.
- **On success:** go to `#/orders/:id` with the "Thank you" banner, using the order's `totalPrice` and `orderNumber`.
- **Order statuses** (in this order): `ORDERED`, `CREATING`, `CREATED`, `READY_FOR_COURIER`, `PICKED_UP_BY_COURIER`, `COMPLETED`. Keep the existing labels and descriptions. Show an unknown status readably (`replaceAll('_',' ')`).
- **Preview images:** prefer `order.product.designPreviewUrl`, then `order.product.imageUrl`.

## Homepage: make it dynamic and keep the current design

**Do not change the homepage layout, animations or the existing images in `/public/images/`.**

### Category stack, now from `GET /categories`

- Show **only active categories**, ordered by `sortOrder`.
- **Images:** keep the local photos. Match each API category to a local image by `builderType` (and `builderConfig.silhouette` for necklace) or by name:
  - `bracelet.jpg` ← JEWELRY bracelet
  - `necklace.jpg` ← JEWELRY + silhouette NECKLACE
  - `gifts.jpg` ← GIFT
  - `mugs.jpg` ← MUG
  - `apparel.jpg` ← APPAREL
  - `cases.jpg` ← CASE
  - `stickers.jpg` ← STICKER
  
  A category with no local image (e.g. BOUQUET, or a new one) falls back to the API `imageUrl`, then to a neutral placeholder.
- **Text:** keep the current hand-written `line` and `text` for matched categories. For others use the API `description`, or "Design something that's completely yours."
- **Counter and title:** `01 / 07` uses the real count. "Seven ways to create" becomes the real count in words ("Six ways to create").
- **Buttons:** "Design a {name} →" opens that category's studio. An inactive or deleted category simply doesn't appear.
- **While loading:** keep one skeleton card with the same size and radius. **On error:** fall back to the current static list so the homepage never looks broken.

### Stats section, "Made by hand. Loved by thousands."

We have **no ratings** in the backend, and there is **no public endpoint for customers or completed orders** (`GET /orders` and `/users` are scoped or admin-only). Replace the four fake numbers with real counts from public endpoints, keeping the same tiles and counter animation:

| Tile | Source |
|---|---|
| **Product categories** | number of active categories from `GET /categories` |
| **Design elements** (beads, charms, designs and gift items to create with) | number of active components from `GET /sub-categories` |
| **Ready-made pieces** | number of active company products from `GET /products?origin=COMPANY&isActive=true` |
| **Packaging styles** (gift boxes and colours) | number of active packaging colours across active packaging from `GET /gift-packaging` (each packaging includes `colors`) |

- Remove the ★ rating tile.
- Load the stats lazily when the section scrolls into view.
- **If a request fails, hide that one tile.** Never show a fake number.
- Make the tile list a config array, so "Happy creators" and "Orders completed" can come back as soon as the backend offers a public stats endpoint. Mention that in your summary as a backend suggestion: `GET /stats/public → { customers, completedOrders }`.

## Studios: real catalog instead of mock data

Swap `studioCatalog.ts` for API data. Keep the studio UI and behaviour you built.

- **Routing:** keep readable studio URLs `#/studios/:slug`. Build the slug from the category name (`slugify(name)`) and resolve it to the category id from `GET /categories`. If the slug doesn't match any category, show NotFound.
- **Which studio opens:** decide by `category.builderType` (JEWELRY, GIFT, APPAREL, CASE, STICKER, MUG; BOUQUET can reuse the gift canvas or be hidden), **never by name**. Necklace vs bracelet comes from `builderConfig.silhouette`.
- **Per studio:**
  - **Jewelry:** sizes from `category.sizes` (`minMeasurementMm`, `maxMeasurementMm`, `defaultMeasurementMm`). Components from `/categories/:id/sub-categories`, using `effectiveLengthMm`. A component without a length is shown as "Not available yet".
  - **Gifts:** `/gift-packaging` for step 1. Components grouped by their `type`, as in the app's `helper/canvasStudio.ts` GIFT groups.
  - **Apparel:** bases from `GET /products?categoryId=&origin=COMPANY`, with sizes and stock per size. Designs from the category's sub-categories plus `designCategoryId`'s library. The upload fee comes from the CUSTOM_UPLOAD component's price.
  - **Cases:** phone models are COMPANY products of the CASE category. Designs and the own-photo price come from sub-categories (see `docs/cases-studio-api.md`).
  - **Mugs:** the blank mug is the COMPANY product with `printAreas`. Designs come from sub-categories.
  - **Stickers:** shapes and sizes from `category.sizes`, each with a per-sticker `price`.
- **Stock:** use `stock` and `trackStock: false` (unlimited) for "N left", "Sold out" and "All in use", exactly like the app.
- **Edit copy (My Designs):** load `GET /products/:id`, restore the studio state like the app's `load*Design` functions, and save as a new product.

## Code structure

```
src/api/
  client.ts          // fetch wrapper, errors, timeout, auth header
  auth.ts            // login, register, me, changePassword, updateProfile
  catalog.ts         // categories, subCategories, products, giftPackaging
  designs.ts         // createProduct (FormData builder), userProducts, creations
  orders.ts          // createOrder, orders, order
  notifications.ts
  contact.ts
  models.ts          // types + parsers (port from the app's *Models.ts)
src/auth/
  AuthContext.tsx    // session in memory, expiry timer, requireAuth(action)
  LoginModal.tsx     // Sign in / Create account tabs
src/hooks/useApi.ts  // small query hook: data, loading, error, retry
```

- Delete `src/data/mock.ts` and `studioCatalog.ts` once nothing imports them.
- Keep the homepage's hand-written category copy and local image mapping in `src/data/homeCategories.ts`.

## Done when

1. With the API running and CORS set, the homepage shows **only active categories** in API order with the **current local photos**. The stats show real counts with no rating tile.
2. Signed out: you can open every studio, see real components and prices, and design freely. "Save design" opens the login modal; after logging in, the design is saved and shows up in **My Designs** with its preview.
3. Registering a new account logs you in and finishes the pending action.
4. Checkout with a missing address asks for it, saves it via `PATCH /users/me`, and places the order. It appears in **My Orders** with the correct status and progress, and the detail page shows the timeline.
5. Profile edits, change password, the notifications bell and mark-as-read all work.
6. An expired or invalid token opens the login modal without losing the current page or draft.
7. `npm run build` passes, there are no secrets in the repo, and there are no admin endpoints in the code.

At the end, write a short summary: what changed, the backend prerequisites (CORS, image-host CORS for previews), and the backend suggestion for public stats.

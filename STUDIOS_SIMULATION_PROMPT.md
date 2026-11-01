# Task: turn the studio mock-ups into working (simulated) design studios

You are working in `HomeMadeWeb/`, a Vite + React 19 + TypeScript + Tailwind v4 site with a small hash router (`src/router.ts`).

All main pages already exist: Home, Studios, Create, My Designs, Checkout, Orders, Order detail, Profile.

`src/pages/StudioPage.tsx` is **only a picture** of an editor today. It shows one photo plus a panel of tool blocks configured in `STUDIO_TOOLS` in `src/data/mock.ts`, and nothing on the canvas reacts.

Replace it with **seven working studios**, one per category, that behave like the studios in our mobile app (`../HomeMade Creations/src/screen/`). Customers should be able to really design a bracelet, fill a gift box, put a photo on a mug, and so on, see the result update live, save it, preview it and continue to checkout.

## Scope: simulated, front-end only

- **Still no backend.** No `fetch`, no API, no auth. All catalog data (beads, items, designs, phone models, sizes, prices, stock) is mock data in `src/data/studioCatalog.ts`.
- **Everything in the studio works in the browser:** adding, moving, resizing, rotating, layering, deleting, undo/redo, live price, limits, validation messages and preview.
- **Uploads stay local:** read the chosen file with `URL.createObjectURL` and check its type and size. Nothing leaves the browser.
- **"Save design"** adds the design to an in-memory designs store, so it appears at the top of **My Designs** for the rest of the session with a thumbnail, name, meta line and price. **"Continue to order"** opens `#/checkout` with that design. Reloading the page may reset everything. That is fine.
- **No new npm dependencies.** Write drag, resize and rotate yourself with Pointer Events. Draw canvases with SVG or absolutely positioned DOM, not `<canvas>`, so they stay sharp and accessible.
- **Do not change** the look of the other pages, the nav, the homepage or the design tokens.
- **Skip the Bouquet studio** from the app; it is not on the website.

## Keep the existing design language

Reuse what is already in the project: `components/Button`, `Controls` (`ChipGroup`, `Stepper`, `inputClass`), `Icon` (add icons as needed), `Page` / `PageHeader` / `SectionLabel`, `StepIndicator`, the tokens in `index.css`, `rounded-[2rem]` cards, `bg-glow` stage, `font-display` for names and prices, and `eyebrow` labels.

The current mock-up layout is the target layout and is already approved:

- **Desktop:** canvas on the left (sticky), tools panel on the right (`420px`).
- **Mobile:** canvas first, then tools.
- A summary bar at the bottom that is sticky on phones.
- A floating toolbar over the canvas: Undo, Redo, Clear.

Keep that structure and make it work.

## Routes and flow

Every studio follows the app's three steps, shown with `StepIndicator`: **1 Choose base → 2 Design → 3 Preview**.

| Route | Step |
|---|---|
| `#/studios/:slug` | Step 1: choose base (size, packaging, phone model, garment, sticker shape and size). For **mugs** there is no base step, so redirect to `/design`. |
| `#/studios/:slug/design` | Step 2: the live studio. If step 1 has not been done, send the customer back to it with a short notice. |
| `#/studios/:slug/preview` | Step 3: the final look, a summary, quantity (where the app has it), price lines, and the buttons **Back to the studio**, **Save design** and **Continue to order**. |

Keep each studio's draft in a React context at `App` level, keyed by slug, so moving between steps, or leaving and coming back, keeps the design.

Each studio card's "Continue my design" (Create page) and each "Edit copy" (My Designs) should open the matching studio with that design loaded. For the existing mock designs, load something sensible from their meta.

## Shared studio engine (build once, use in every studio)

Put it in `src/studio/`:

1. **`useHistory(reducer)`**: a state wrapper with `undo`, `redo`, `canUndo`, `canRedo` and `reset`. Every design change goes through it. Toolbar buttons are disabled when they can't act.
   - Shortcuts: `Ctrl/Cmd+Z` and `Ctrl/Cmd+Shift+Z`.
   - **Clear** empties the design and shows a toast "Canvas cleared. Undo to bring it back."
2. **`<PlacementLayer>`**: free placement used by Gifts, Mugs, Apparel, Cases and Stickers.
   - Each element has `{ id, kind: "image" | "text", x, y, scale, rotation, z }`. Positions are fractions (0–1) of the area, so they survive resizing.
   - **Click** selects an element and shows a box with a corner handle (drag the handle to resize and rotate) plus a small floating action bar: Smaller, Larger, Rotate left, Rotate right, Bring forward, Send backward, Duplicate, Delete.
   - **Drag** moves the element. Elements are **clamped inside their bounds**: the gift box interior, the print area, or the sticker shape. Two-finger pinch and rotate on touch is a nice-to-have.
   - **Keyboard:** Tab to select, arrows move (Shift for bigger steps), `+`/`-` scale, `[`/`]` rotate, `Delete` removes, `Esc` deselects.
   - Clicking empty canvas deselects.
3. **`<TextTool>`**: add text, max **6 texts**, **80 characters** each.
   - Fonts: **Classic** (Fraunces), **Modern** (Manrope), **Script** (any script-style Google font you load in `index.html`).
   - Weight: Light / Regular / Bold. Italic toggle. Size slider.
   - Colours: Navy, Rose, Gold, Black, White.
   - Caption: "Personalised text is free."
4. **`<UploadButton>`**: hidden file input with a styled drop-zone that supports drag-and-drop too.
   - It takes `accept`, `maxBytes` (5 MB) and an `onImage(url, width, height)` callback.
   - Errors from the app: "Choose a JPEG, PNG or WebP image." and "This image is larger than 5 MB. Choose a smaller one."
   - **Low-quality warning:** if the image's pixels per printed cm at the current scale fall under a threshold, show "This image may appear blurry when printed" under the canvas.
5. **`<StudioSummaryBar>`**: "Your creation · {summary}", live price in `font-display text-primary` (animate the number on change), **Save design** and **Preview →**. Disabled states say why, for example "Add at least one item to your design."
6. **Toasts**: a small toast host, bottom centre, `aria-live="polite"`, for messages like "Amber added to your bracelet." and "Saved to My Designs."
7. **Stock**: catalog items carry `stock`. Show "N left" when low, "Sold out" (disabled) at 0, and "All N in use" when the design already uses every available piece.

Prices are in cents, formatted with the existing `money()`.

## The seven studios

### Bracelet: `bracelet` (builder JEWELRY)

**Step 1, size.** Cards S `15–16 cm`, M `16.5–17.5 cm`, L `18–19 cm`, each showing "Usually X cm". After choosing a card, a **length slider in 0.5 cm steps** inside that range (with −/+ buttons) shows "Your bracelet length 17.5 cm". The button **Continue to the studio** stays disabled until a size is chosen.

**Step 2, studio.**
- The canvas draws the bracelet as an SVG **circle cord** (fixed copper colour). Beads sit along it **at real scale**: each catalog piece has `lengthMm`, and the beads are spread around the cord in order.
- Above the canvas, a **length meter**: `142 / 175 mm` with a progress bar. When the used length is within **±2 mm** of the chosen length, the bar turns green and says "Complete".
- **Picker tabs:** `All / Beads / Letters / Charms / Spacers`, plus material filter chips (Glass, Pearl, Agate, Gold, Silver).
- Each picker item shows a round swatch (colour, letter or small charm icon), name, price and size (`8 mm`).
- **Click adds** the piece to the end. A piece that would go past the length + 2 mm is refused with "Doesn't fit · 6 mm left", and items that can't fit are dimmed.
- **Click a bead on the bracelet** to select it (ring highlight). While a bead is selected:
  - Clicking a picker item **replaces** it, and the picker hint changes to "Tap to replace".
  - It can be moved left or right, or removed.
  - Dragging a bead along the cord reorders it.
- Beside the stage, a **placed sequence** list: small dots in order with counts, like "Pearl ×8".
- Text over the canvas: empty "Add your first bead", then "Tap to add".
- **Price** = the sum of the pieces. It can't be ordered under **€5.00**; say so in the summary bar.
- **Preview** shows the bracelet larger, then size, length, a "Beads & price details" list grouped per bead (name × qty, line price) and the total. Saving is allowed at any length, but **Continue to order** requires "Complete".

Mock catalog: about 12 beads (6 mm, 8 mm, 10 mm), letters A–Z (7 mm, white with black letter, €0.30), about 6 charms (12 mm: heart, star, moon, clover, coin, evil eye), and 2 spacers (3 mm gold or silver).

### Necklace: `necklace` (builder JEWELRY)

Same engine as Bracelet, with different settings:
- Sizes: Choker `35–40 cm`, Princess `43–48 cm`, Matinee `50–60 cm`, in 0.5 cm steps.
- The cord is drawn as a **U-shaped curve** with a clasp at the top, not a circle.
- Charms can also be large **pendants** (20–25 mm).

### Gifts: `gifts` (builder GIFT)

**Step 1, packaging.** Heading "How should your gift arrive?", in three short steps:
1. "How should it arrive?": **Transparent** ("See what's inside") or **Closed** ("Keep it a surprise").
2. "Shape & style": **Square** or **Rectangular**, each with "from €X".
3. "Box color": 6 colour swatches.

The button is "Choose a box color to continue" until all three are chosen, then **Start designing**.

**Step 2, studio.**
- The canvas draws the chosen box as SVG in the chosen colour.
  - **Transparent:** items show through a glassy front.
  - **Closed:** items are drawn on top of an open lid view, labelled "Inside".
- Items are placed with `<PlacementLayer>`, clamped inside the box interior.
- **Picker groups:** `Items / Decorations / Filler / Bags & boxes`, plus a `Text` tab that opens `<TextTool>` for the gift message. Each item has a price and stock.
- Mock items (draw them as simple inline SVG illustrations, about 15 in total):
  - Items: candle, mini mug, chocolate bar, cookies, teddy bear, tea tin
  - Decorations: ribbon bow, heart, gift tag, dried rose, card
  - Filler: paper shred, straw nest
- A list "In your gift" shows every element with ×count, and clicking a row selects that element on the canvas.
- A summary chip shows the packaging with a **Change** link back to step 1, keeping the items.
- **Price** = packaging + colour (if extra) + the items. Text is free.

### Mugs: `mugs` (builder MUG)

No base step.

**Studio.**
- The canvas is the **flat printable wrap**: a rounded rectangle at the aspect of **20 × 9 cm**, labelled "Printable area: 20 × 9 cm", with a **dashed safe area** and the note "Keep important parts of your design inside the dashed area."
- **One image at a time** (`MAX_MUG_ELEMENTS = 1`), plus text.
  - Add the image by **upload** ("Upload image · JPEG, PNG or WebP, up to 5 MB") or from **Our designs**: about 8 built-in SVG artworks such as a floral wreath, a "Best Mom" lettering, a mountains line-art and a coffee doodle.
  - Picking a design **replaces** the current image. Hint: "Tap a design to put it on your mug. It replaces the current image."
- Actions for the image: zoom, rotate, Replace image, Reset, Delete. The low-quality warning applies.
- A layers list titled "Your images (front first)".
- Summary bar: "Price per mug €12.90", with **Preview on mug**.

**Preview, "Your custom mug".**
- A CSS/SVG mug mockup with the print wrapped on it, and view buttons **Left side / Front / Right side** that slide the wrap horizontally inside a cylinder mask with a subtle shading gradient.
- **Quantity** stepper 1–100, captioned "Identical mugs with this design".
- Price per mug and total.

### Apparel: `apparel` (builder APPAREL)

**Step 1, base.** Heading "Start from a piece you love".
- Pick a piece: Classic Hoodie €34.90, Oversized Tee €19.90, Crewneck Sweatshirt €29.90.
- Pick a colour: Black, White, Navy, Sand, Forest.
- Pick a size: XS–XXL, with one size marked "Sold out".
- Note: "Your size is only reserved when you place the order."
- Button: **Continue to Apparel Studio**.

**Step 2, studio.**
- The canvas shows a garment **SVG silhouette** in the chosen colour (hoodie, tee and sweatshirt shapes) with a **Front / Back** toggle. Each side has its own dashed **PRINT AREA** and its own elements.
- A chip shows the selected piece ("Classic Hoodie · Black · M") with **Change**.
- **Designs tray** with tabs `Icons / Logos / Lettering / Illustrations`, about 12 SVG designs with prices (€2–€5), and a `Text` tab.
- **Upload your own design:** PNG only, with the error "Only PNG images can be uploaded. Save your design as a .png file and try again." It costs **€4.00 once**, however many times it is placed.
- Hints from the app: "Tap a design to add it to the front. It stays inside the print area."
- The footer reads "{piece} + {n} designs", or "Add a logo, graphic, text or your own artwork" when empty.
- **Price** = base piece + each placed design + the upload fee (once).
- **Preview** shows front and back side by side, then piece / colour / size, a list of designs per side, and the total.

### Cases: `cases` (builder CASE)

**Step 1, phone.** Heading "Choose your phone": "Pick your phone model. Each case is made for its exact shape and camera."
- Brand tabs: Apple / Samsung / Google / Other phones.
- Models as cards with prices, e.g. iPhone 16 Pro €18.90, iPhone 15 €17.90, Galaxy S24 €17.90, Pixel 9 €17.90. One model is "Sold out".

**Step 2, studio.**
- The canvas is the case outline for that model (an SVG rounded rectangle with the right corner radius and a **camera cut-out** in the right place per model) and a **dashed safe area**.
- Note: "Your design is printed inside the dashed line, around the camera. Keep important parts away from the edges."
- **Add your design:**
  - **Upload your photo** (JPEG/PNG/WebP, up to 5 MB, **+€3.00**), **or** "Choose one of our designs" (a grid of about 8 SVG designs, some free, some "+€2.00 extra").
  - One design at a time. Choosing another replaces it.
- The image **covers** the case by default and can be dragged, zoomed (buttons + wheel), rotated and reset, but must always cover the case area. Also **Change image** and **Remove image**.
- A model chip with **Change model** keeps the image ("This phone model is no longer available. Choose another one; your image stays.").
- **Price** = model + design.
- **Preview** shows the case large with a soft shadow and a slight 3D tilt on hover, and "This is how your case will look. We print it by hand once you order."

### Stickers: `stickers` (builder STICKER)

**Step 1, shape and size.** Heading "Choose your shape and size": "All designs in one set share the same shape and size."
- Shape: **Square / Circle / Rectangle / Oval**.
- Size: each has a per-sticker price; the **max is 7 × 7 cm**. For example Square 3×3 €0.35, 5×5 €0.50, 7×7 €0.70; Rectangle 5×3, 7×4; Circle ⌀3, ⌀5, ⌀7; Oval 5×3, 7×4.5.
- Button: **Use this size**.

**Step 2, studio.**
- The canvas is the **sticker shape** at its aspect, with a white die-cut border, slightly rounded corners for square and rectangle, and a dashed safe area 3 mm inside the edge.
- **Up to 5 designs** shown as tabs ("Design 1 … 5", with a ✓ when a design has an image) and **+ Add**. Each design holds **one image**, either uploaded or from "Our designs" (about 8 SVG artworks).
- The image fills the shape and can be dragged, zoomed, rotated and reset. Actions: Replace image, Delete design.
- "Change shape or size" goes back to step 1 with a confirm: "Your designs stay, but each image is re-centred to fit the new shape and size."
- A summary card "Your set" shows the size line and "{n} designs".

**Preview, "Your sticker set".**
- All designs as stickers on a sheet.
- "How many of each?" with a stepper per design: default **10**, between 1 and 1000.
- Totals: Unique designs, Total stickers, Price per sticker, Total.
- **Minimum 5 stickers per order:** "Orders start at 5 stickers. Add {n} more to continue; you can still save your set." Continue to order is disabled until the minimum is met.
- Preview is blocked until every design has an image: "Add an image to every design before previewing your set."

## Code structure

```
src/
  data/studioCatalog.ts      // all studio mock data, typed (beads, items, artworks, models, sizes, garments)
  studio/                    // shared engine
    StudioContext.tsx        // drafts per slug + savedDesigns store
    useHistory.ts
    PlacementLayer.tsx
    TextTool.tsx
    UploadButton.tsx
    StudioShell.tsx          // header, StepIndicator, canvas/tools grid, summary bar
    StudioSummaryBar.tsx
    Toasts.tsx
    artworks.tsx             // inline SVG artworks and gift items
  studios/
    jewelry/  (BraceletBase, JewelryStudio, JewelryPreview, cord geometry)
    gifts/    (GiftPackaging, GiftStudio, GiftPreview)
    mugs/     (MugStudio, MugPreview)
    apparel/  (ApparelBase, ApparelStudio, ApparelPreview, silhouettes)
    cases/    (CaseModels, CaseStudio, CasePreview)
    stickers/ (StickerSetup, StickerStudio, StickerPreview)
  pages/StudioPage.tsx       // routes slug + step to the right component
```

- Remove `STUDIO_TOOLS` and its tool-block types once nothing uses them.
- Make `DesignsPage` and `CheckoutPage` read from the new saved-designs store, alongside the existing mock designs.
- Keep components small. Each studio's own logic (fit, bounds, price) is a plain function next to it, so it can be unit-tested later.

## Quality

- Works with **mouse, touch and keyboard**. Every icon button has an `aria-label`. The canvas has an `aria-label` that describes the current design, e.g. "Bracelet with 18 components".
- Smooth on mid-range phones: transform elements with `translate/rotate/scale` only, and use `requestAnimationFrame` for drags.
- Works at **375px**. On phones the tools panel can become a bottom section with horizontally scrolling tabs. Nothing scrolls the page sideways.
- Respect `prefers-reduced-motion`.
- `npm run build` passes with no TypeScript errors.

## Done when you can do all of this in the browser

1. **Bracelet:** choose M, set 17 cm, add beads until a bead is refused as too long, select a bead and replace it, reorder one, undo twice, reach "Complete", preview, save. It appears in **My Designs**, and Order opens checkout with the right price.
2. **Necklace:** choose a length, add a pendant and beads, preview.
3. **Gifts:** pick Transparent + Rectangular + a colour, add 4 items and a text message, move/resize/rotate/layer them (none can leave the box), change the packaging and keep the items, preview, save.
4. **Mugs:** upload a photo, zoom and rotate it, replace it with one of our designs, preview Left/Front/Right, set quantity 3, continue to order.
5. **Apparel:** pick a hoodie in Navy, size M, add a logo on the front and your own PNG on the back (fee charged once), try a JPG and see the PNG-only error, preview both sides.
6. **Cases:** pick a model, upload a photo, zoom and rotate it, switch model and keep the image, preview.
7. **Stickers:** pick Circle ⌀5, make 3 designs, try to preview with an empty design (blocked), set quantities under 5 total (blocked) and then above, save and order.

At the end, write a short summary: files added or removed, anything simplified compared to this brief, and anything you were unsure about.

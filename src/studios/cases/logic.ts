import i18n from "../../i18n";
import type { Category, Component, Product, ProductInput } from "../../api/models";
import { imageSize, loadImage, renderPng, drawElements } from "../../studio/capture";
import type { CaseDraft } from "../../studio/drafts";
import { containScale, coverScale, imageElement, newId, type Bounds, type PlacedElement } from "../../studio/elements";
import { apiFraction, apiRotation, apiScale, designName, uploadsOf, type StudioData } from "../data";
import {
  areaAspect,
  bleedBox,
  cameraCutPath,
  coverScaleFor,
  parseCaseTemplate,
  pixelFrame,
  printableShape,
  shapePath,
  type CaseArea,
  type CaseTemplate,
} from "./geometry";

/** Until a model's printable area is configured, artwork fills the whole template. */
const FULL_AREA: CaseArea = { x: 0.02, y: 0.01, width: 0.96, height: 0.98, radius: 0.14 };

/** Template ratio (width ÷ height) drawn before a model has a template photo. */
export const PLACEHOLDER_RATIO = 0.49;

/**
 * The CASE category's COMPANY products are of two kinds, and the API guarantees which: a phone
 * model (no baseProductId, a print area) is a blank to design on; a ready-made case points at the
 * model it fits through baseProductId and is sold as it is.
 */
export const isPhoneModel = (p: Product) => !p.baseProductId;
export const phoneModels = (data: StudioData) => data.products.filter(isPhoneModel);
export const readyCases = (data: StudioData) => data.products.filter((p) => !isPhoneModel(p));

/** The draft's phone model; never a ready-made case, which can't be designed on. */
export const modelOf = (d: CaseDraft, data: StudioData) => phoneModels(data).find((p) => p.id === d.modelId) ?? null;

/** The model's template: printable area, camera, bleed and safe area, the same for every screen. */
export const caseTemplate = (model: Product | null): CaseTemplate => parseCaseTemplate(model?.printAreas, FULL_AREA);

/**
 * How artwork fits a model at a template ratio: `ofArea` is the printable area's height ÷ width,
 * `bounds` the box (printable fractions) artwork must always cover, i.e. the area plus its bleed.
 */
export interface CaseFit {
  ofArea: number;
  bounds: Bounds;
}
export function caseFit(model: Product | null, ratio: number): CaseFit {
  const t = caseTemplate(model);
  return { ofArea: areaAspect(t.area, ratio), bounds: bleedBox(t, ratio) };
}

export const isSoldOut = (m: Product) => m.isActive === false || (m.stock ?? 0) <= 0;

export { areaAspect };

const BRAND_ORDER = ["APPLE", "SAMSUNG", "GOOGLE", "XIAOMI", "HUAWEI"];
const BRAND_NAMES: Record<string, string> = { APPLE: "Apple", SAMSUNG: "Samsung", GOOGLE: "Google", XIAOMI: "Xiaomi", HUAWEI: "Huawei" };

/** Models grouped by brand: well-known brands first, others alphabetically, "Other phones" last. */
export function brandGroups(models: Product[]) {
  const groups = new Map<string, Product[]>();
  for (const m of models) {
    const brand = m.deviceBrand?.trim() || "OTHER";
    groups.set(brand, [...(groups.get(brand) ?? []), m]);
  }
  const rank = (b: string) => {
    const i = BRAND_ORDER.indexOf(b);
    return i === -1 ? (b === "OTHER" ? BRAND_ORDER.length + 1 : BRAND_ORDER.length) : i;
  };
  return [...groups.entries()]
    .sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b))
    .map(([brand, list]) => ({
      brand,
      label: brand === "OTHER" ? i18n.t("cases.otherPhones") : (BRAND_NAMES[brand] ?? brand.charAt(0) + brand.slice(1).toLowerCase().replaceAll("_", " ")),
      models: list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)),
    }));
}

export const caseImage = (d: CaseDraft) => d.elements[0];

export const casePrice = (d: CaseDraft, model: Product | null, byId: Map<string, Component>) =>
  (model?.price ?? 0) + (byId.get(caseImage(d)?.ref ?? "")?.price ?? 0);

/**
 * How far a case image can zoom: out until the whole design shows, in to 5× "just covers the
 * area"; within the API's 0.1–5 (relative to that cover scale). Uncovered parts show the case itself.
 */
export function caseScaleRange(aspect: number, fit: CaseFit) {
  const cover = coverScale(aspect, fit.ofArea);
  return { min: Math.max(containScale(aspect, fit.ofArea), 0.1 * cover), max: 5 * cover };
}

/** The image covers the printable area and its bleed by default (centred, cover, never stretched). */
export const coverImage = (aspect: number, fit: CaseFit, props: Partial<PlacedElement>) =>
  imageElement({ ...props, aspect, scale: coverScaleFor(aspect, fit.bounds, fit.ofArea) });

/** Exactly one item; API scale 1 means "just covers the printable area". */
export async function caseInput(category: Category, d: CaseDraft, model: Product, ofArea: number): Promise<{ input: ProductInput; uploads: Blob[] }> {
  const el = caseImage(d);
  if (!el) throw new Error(i18n.t("cases.addPhotoOrOurDesign"));
  return {
    input: {
      categoryId: category.id,
      name: designName(category),
      baseProductId: model.id,
      items: [
        {
          subCategoryId: el.ref!,
          quantity: 1,
          position: 0,
          x: apiFraction(el.x),
          y: apiFraction(el.y),
          scale: apiScale(el.scale / coverScale(el.aspect, ofArea)),
          rotation: apiRotation(el.rotation),
          ...(el.uploaded ? { customDesignIndex: 0 } : {}),
        },
      ],
    },
    uploads: await uploadsOf([el]),
  };
}

/**
 * The flattened case: template + artwork clipped to the printable shape, minus the camera, +
 * overlay. Uses the same paths as the studio; guides (safe area, outlines) are never drawn.
 * Throws when it can't be drawn.
 */
export async function captureCase(d: CaseDraft, model: Product) {
  const size = model.imageUrl ? await imageSize(model.imageUrl) : { width: 49, height: 100 };
  const W = 600;
  const H = (W * size.height) / size.width;
  const ratio = size.width / size.height;
  const t = caseTemplate(model);
  const { area } = t;
  const frame = pixelFrame(W, H);
  return renderPng(W, H, async (ctx) => {
    if (model.imageUrl) ctx.drawImage(await loadImage(model.imageUrl), 0, 0, W, H);
    else {
      // No template photo yet: a plain case shape, as the studio draws it.
      ctx.fillStyle = "#1f2233";
      ctx.beginPath();
      ctx.roundRect(0, 0, W, H, W * 0.16);
      ctx.fill();
    }
    ctx.save();
    ctx.clip(new Path2D(shapePath(printableShape(t, ratio), frame)));
    // The camera opening is cut out, as in the studio and the app: the template's camera stays visible.
    const cut = cameraCutPath(t, ratio, frame);
    if (cut) ctx.clip(new Path2D(cut), "evenodd");
    await drawElements(ctx, d.elements, area.width * W, area.height * H, area.x * W, area.y * H);
    ctx.restore();
    if (model.overlayImageUrl) ctx.drawImage(await loadImage(model.overlayImageUrl), 0, 0, W, H);
  });
}

export async function caseFromProduct(p: Product, data: StudioData, display = false): Promise<CaseDraft> {
  const model = phoneModels(data).find((m) => m.id === (p.baseProductId ?? p.baseProduct?.id)) ?? null;
  const item = p.items?.[0];
  if (!item) return { kind: "CASE", modelId: model?.id ?? null, elements: [] };
  const ratio = model?.imageUrl ? await imageSize(model.imageUrl).then((s) => s.width / s.height) : PLACEHOLDER_RATIO;
  const ofArea = areaAspect(caseTemplate(model).area, ratio);
  const uploaded = !!item.customImageUrl;
  // Edit copy needs the upload again (it can't be fetched back); a read-only preview shows the saved one.
    const src = uploaded && !display ? undefined : (item.customImageUrl ?? item.subCategory?.imageUrl ?? undefined);
  const size = src ? await imageSize(src) : { width: 1, height: 1 };
  const aspect = size.height / size.width;
  return {
    kind: "CASE",
    modelId: model?.id ?? null,
    elements: [
      imageElement({
        id: newId(),
        src,
        ref: item.subCategoryId,
        name: item.subCategory?.name,
        uploaded,
        missing: uploaded && !display,
        aspect,
        x: item.x ?? 0.5,
        y: item.y ?? 0.5,
        scale: (item.scale ?? 1) * coverScale(aspect, ofArea),
        rotation: item.rotation ?? 0,
      }),
    ],
  };
}

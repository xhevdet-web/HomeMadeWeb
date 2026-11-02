import i18n from "../../i18n";
import { parseArea, type Category, type Component, type PrintArea, type Product, type ProductInput } from "../../api/models";
import { imageSize, loadImage, renderPng, drawElements } from "../../studio/capture";
import type { CaseDraft } from "../../studio/drafts";
import { coverScale, imageElement, newId, type PlacedElement } from "../../studio/elements";
import { apiFraction, apiRotation, apiScale, designName, uploadsOf, type StudioData } from "../data";

/** Until a model's printable area is configured, artwork fills the whole template. */
const FULL_AREA: PrintArea = { x: 0.02, y: 0.01, width: 0.96, height: 0.98, radius: 0.14 };

export const modelOf = (d: CaseDraft, data: StudioData) => data.products.find((p) => p.id === d.modelId) ?? null;

export function caseAreas(model: Product | null) {
  const raw = (model?.printAreas ?? {}) as { front?: unknown; camera?: unknown };
  return { area: parseArea(raw.front) ?? FULL_AREA, camera: parseArea(raw.camera) };
}

export const isSoldOut = (m: Product) => m.isActive === false || (m.stock ?? 0) <= 0;

/** Height ÷ width of the printable area, given the template's w/h ratio. */
export const areaAspect = (area: PrintArea, templateRatio: number) => area.height / area.width / templateRatio;

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

/** The image covers the printable area by default. */
export const coverImage = (aspect: number, ofArea: number, props: Partial<PlacedElement>) =>
  imageElement({ ...props, aspect, scale: coverScale(aspect, ofArea) });

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

/** The flattened case: template + artwork clipped to the printable area + overlay. Throws when it can't be drawn. */
export async function captureCase(d: CaseDraft, model: Product) {
  const size = model.imageUrl ? await imageSize(model.imageUrl) : { width: 49, height: 100 };
  const W = 600;
  const H = (W * size.height) / size.width;
  const { area, camera } = caseAreas(model);
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
    ctx.beginPath();
    ctx.roundRect(area.x * W, area.y * H, area.width * W, area.height * H, (area.radius ?? 0) * area.width * W);
    // The camera opening is cut out, as in the studio and the app: the template's camera stays visible.
    if (camera) ctx.roundRect(camera.x * W, camera.y * H, camera.width * W, camera.height * H, (camera.radius ?? 0) * camera.width * W);
    ctx.clip("evenodd");
    await drawElements(ctx, d.elements, area.width * W, area.height * H, area.x * W, area.y * H);
    ctx.restore();
    if (model.overlayImageUrl) ctx.drawImage(await loadImage(model.overlayImageUrl), 0, 0, W, H);
  });
}

export async function caseFromProduct(p: Product, data: StudioData, display = false): Promise<CaseDraft> {
  const model = data.products.find((m) => m.id === (p.baseProductId ?? p.baseProduct?.id)) ?? null;
  const item = p.items?.[0];
  if (!item) return { kind: "CASE", modelId: model?.id ?? null, elements: [] };
  const ratio = model?.imageUrl ? await imageSize(model.imageUrl).then((s) => s.width / s.height) : 0.49;
  const ofArea = areaAspect(caseAreas(model).area, ratio);
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

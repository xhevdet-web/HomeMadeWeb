import { CaptureError, checkPng } from "../studio/capture";
import { request } from "./client";
import { parseProduct, parseProducts, type CommunityCreation, type CommunityGallery, type ProductInput } from "./models";

export interface DesignFiles {
  /** Required: every customer design is saved with its preview image. */
  preview: Blob;
  /** Apparel only, when the back has designs. */
  backPreview?: Blob | null;
  /** The customer's own uploads, in the order referenced by `customDesignIndex`. */
  customDesigns?: Blob[];
}

/** Multipart body for a new design, built exactly like the app's `productFormData`. Prices are never sent. */
export function productFormData(input: ProductInput, files: DesignFiles) {
  if (!files?.preview) throw new CaptureError("No design preview was captured");
  const preview = checkPng(files.preview);
  const data = new FormData();
  data.append("categoryId", input.categoryId);
  data.append("name", input.name);
  if (input.description) data.append("description", input.description);
  data.append("items", JSON.stringify(input.items));
  if (input.selectedSizeId) data.append("selectedSizeId", input.selectedSizeId);
  if (input.selectedMeasurementMm) data.append("selectedMeasurementMm", String(input.selectedMeasurementMm));
  if (input.baseProductId) data.append("baseProductId", input.baseProductId);
  if (input.giftPackagingId) data.append("giftPackagingId", input.giftPackagingId);
  if (input.giftPackagingColorId) data.append("giftPackagingColorId", input.giftPackagingColorId);
  if (input.textLayers?.length) data.append("textLayers", JSON.stringify(input.textLayers));
  data.append("designPreview", preview, "design-preview.png");
  if (files.backPreview) data.append("backDesignPreview", checkPng(files.backPreview), "back-design-preview.png");
  for (const [index, file] of (files.customDesigns ?? []).entries()) {
    const ext = file.type === "image/jpeg" ? "jpg" : file.type === "image/webp" ? "webp" : "png";
    data.append("customDesigns", file, `custom-design-${index}.${ext}`);
  }
  return data;
}

/** Saves a design as a new CUSTOMER product. Saving never reserves stock. */
export const createProduct = (form: FormData) => request<unknown>("/products", { method: "POST", body: form, auth: true }).then(parseProduct);

export const userProducts = (userId: string, signal?: AbortSignal) =>
  request<unknown>(`/users/${encodeURIComponent(userId)}/products`, { auth: true, signal }).then(parseProducts);

export const creationsFromOthers = (categoryId: string, signal?: AbortSignal) =>
  request<{ data?: unknown }>("/products/creations/from-others", { params: { categoryId }, auth: true, signal }).then((v) =>
    Array.isArray(v?.data) ? (v.data as CommunityCreation[]) : [],
  );

export const communityGallery = (categoryId?: string, signal?: AbortSignal) =>
  request<Partial<CommunityGallery>>("/products/creations/community", { params: { categoryId }, auth: true, signal }).then(
    (v): CommunityGallery => ({
      categories: Array.isArray(v?.categories) ? v.categories : [],
      categoryId: typeof v?.categoryId === "string" ? v.categoryId : null,
      creations: Array.isArray(v?.creations) ? v.creations : [],
    }),
  );

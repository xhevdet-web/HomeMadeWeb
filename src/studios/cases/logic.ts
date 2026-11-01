import { CASE_UPLOAD_FEE, getCaseDesign, getModel, type PhoneModel } from "../../data/studioCatalog";
import type { DesignInfo } from "../../studio/StudioContext";
import type { CaseDraft } from "../../studio/drafts";
import { ART } from "../../studio/artworks";
import { coverScale, imageElement, type PlacedElement } from "../../studio/elements";

export const caseImage = (d: CaseDraft) => d.elements[0];

export function designPrice(img?: PlacedElement) {
  if (!img) return 0;
  return img.uploaded ? CASE_UPLOAD_FEE : (getCaseDesign(img.ref)?.price ?? 0);
}

export const casePrice = (d: CaseDraft) => (getModel(d.modelId)?.price ?? 0) + designPrice(caseImage(d));

export function designLabel(img?: PlacedElement) {
  if (!img) return "No design yet";
  if (img.uploaded) return "Your photo";
  return img.art ? ART[img.art].name : "Design";
}

/** The image covers the whole case by default. */
export function coverImage(model: PhoneModel, props: Partial<PlacedElement> & { aspect: number }) {
  return imageElement({ ...props, scale: coverScale(props.aspect, model.aspect) });
}

export function caseInfo(d: CaseDraft): DesignInfo {
  return { meta: `${getModel(d.modelId)?.name ?? "Phone"} · ${designLabel(caseImage(d))}`, price: casePrice(d) };
}

export function sampleCase(): CaseDraft {
  const model = getModel("iphone-15-pro")!;
  return { modelId: model.id, elements: [coverImage(model, { art: "arch", ref: "c-arch", aspect: 1 })] };
}

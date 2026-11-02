import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { createPortal } from "react-dom";
import { productImage, type Category, type Product } from "../api/models";
import { Icon } from "../components/Icon";
import { studioBuilder, studioHref, useStudioCategories } from "../data/homeCategories";
import { corsImage } from "../studio/capture";
import type { AnyDraft } from "../studio/drafts";
import { PlacementLayer } from "../studio/PlacementLayer";
import { ApparelThumb } from "./apparel/silhouettes";
import { CaseThumb } from "./cases/CaseCanvas";
import { useStudioData, type StudioData } from "./data";
import { GiftThumb } from "./gifts/GiftBox";
import { JewelryCanvas } from "./jewelry/JewelryCanvas";
import { TYPICAL_MM, cordOf, toPiece } from "./jewelry/logic";
import { MugEditor, MugPrintImage } from "./mugs/MugMockup";
import { blankMug, mugArea } from "./mugs/logic";
import { moduleFor } from "./registry";
import { StickerThumb } from "./stickers/StickerCanvas";
import { sizeOf } from "./stickers/logic";

interface Props {
  product: Product;
  /** Found from the categories list when not given. */
  category?: Category;
  className?: string;
  /** Tap the image to open it full size. */
  lightbox?: boolean;
  /** Shows "Preview image missing…" with Edit copy when the design is drawn live. */
  missingNote?: boolean;
  /** Small thumbnails (order lists). */
  compact?: boolean;
}

/**
 * The picture of a design everywhere on the website (My Designs, checkout, orders): its saved
 * preview image, or for designs saved without one, the design drawn live from its items.
 * Never a single component.
 */
export function DesignPreview({ product, category, className = "aspect-square w-full", lightbox = false, missingNote = false, compact = false }: Props) {
  const { t } = useTranslation();
  const round = compact ? "rounded-xl" : "rounded-[1.5rem]";
  const categories = useStudioCategories();
  const cat = category ?? categories.data?.find((c) => c.id === product.categoryId);
  const url = productImage(product);
  const [open, setOpen] = useState<string | null>(null);
  // A mug design shows on the studio's mug: its saved print wrapped on the blank mug it was made for.
  const mug = product.origin !== "COMPANY" && (cat ? studioBuilder(cat) : product.category?.builderType) === "MUG" ? mugArea(product.baseProduct) : null;

  if (url && mug) {
    const shown = (
      <div className="w-full">
        <MugEditor area={mug} view="front" guides={false} label={t("preview.onMug", { name: product.name })}>
          <MugPrintImage src={url} />
        </MugEditor>
      </div>
    );
    return (
      <>
        <div className={`relative flex items-center justify-center overflow-hidden ${round} bg-secondary ${compact ? "p-1" : "p-4"} ${className}`}>
          {lightbox ? (
            // Full size shows the flat print, so every detail can be checked.
            <button type="button" onClick={() => setOpen(url)} className="block w-full cursor-zoom-in" aria-label={t("preview.openPrint", { name: product.name })}>
              {shown}
            </button>
          ) : (
            shown
          )}
        </div>
        {open && <Lightbox src={open} alt={product.name} onClose={() => setOpen(null)} />}
      </>
    );
  }

  if (url) {
    // Apparel with a designed back shows both sides.
    const sides = product.backDesignPreviewUrl ? [{ src: url, label: t("preview.front") }, { src: product.backDesignPreviewUrl, label: t("preview.back") }] : [{ src: url, label: "" }];
    return (
      <>
        <div className={sides.length > 1 ? "grid grid-cols-2 gap-3" : ""}>
          {sides.map((side) => {
            const alt = side.label ? `${product.name}, ${side.label}` : product.name;
            return (
              <div key={side.src} className={`relative overflow-hidden ${round} bg-secondary ${className}`}>
                {lightbox ? (
                  <button type="button" onClick={() => setOpen(side.src)} className="block h-full w-full cursor-zoom-in" aria-label={t("preview.openFull", { name: alt })}>
                    <img {...corsImage} src={side.src} alt={alt} className="h-full w-full object-contain" />
                  </button>
                ) : (
                  <img {...corsImage} src={side.src} alt={alt} loading="lazy" className="h-full w-full object-contain" />
                )}
                {side.label && <span className="absolute top-2 left-2 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-semibold tracking-[0.15em] uppercase">{side.label}</span>}
              </div>
            );
          })}
        </div>
        {open && <Lightbox src={open} alt={product.name} onClose={() => setOpen(null)} />}
      </>
    );
  }

  const editable = product.origin !== "COMPANY" && !!cat && !!studioBuilder(cat);
  return (
    <div>
      <div className={`relative flex items-center justify-center overflow-hidden ${round} bg-secondary ${compact ? "p-1" : "p-4"} ${className}`}>
        {product.origin === "COMPANY" || !cat ? (
          !compact && <span className="text-sm text-muted-foreground">{t("preview.none")}</span>
        ) : studioBuilder(cat) === "JEWELRY" ? (
          <LiveJewelry product={product} category={cat} />
        ) : (
          <LiveStudio product={product} category={cat} />
        )}
      </div>
      {missingNote && product.origin !== "COMPANY" && (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <Icon name="alert" size={14} className="text-primary" />
          {t("preview.missing")}
          {editable && (
            <a href={`${studioHref(cat!, "design")}?load=${product.id}`} className="font-semibold text-primary hover:underline">
              {t("designs.editCopy")}
            </a>
          )}
        </p>
      )}
    </div>
  );
}

/** Beads from the saved items, in their saved order, on the saved length. */
function LiveJewelry({ product, category }: { product: Product; category: Category }) {
  const pieces = [...(product.items ?? [])]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .flatMap((item) =>
      Array.from({ length: Math.max(1, item.quantity) }, () =>
        toPiece({
          id: item.subCategoryId,
          name: item.subCategory?.name ?? i18n.t("preview.bead"),
          effectiveLengthMm: item.subCategory?.effectiveLengthMm ?? TYPICAL_MM,
          imageUrl: item.subCategory?.imageUrl ?? null,
          color: item.subCategory?.color ?? null,
        }),
      ),
    );
  const used = pieces.reduce((n, p) => n + p.lengthMm, 0);
  const length = Number(product.selectedSize?.selectedMeasurementMm) || used || 180;
  return <JewelryCanvas kind={cordOf(category)} pieces={pieces} lengthMm={length} label={i18n.t("preview.withComponents", { name: product.name, count: pieces.length })} className="h-full w-full" />;
}

/** The other studios: the saved design restored read-only and drawn with the studio's own canvas. */
function LiveStudio({ product, category }: { product: Product; category: Category }) {
  const { data } = useStudioData(category);
  const [draft, setDraft] = useState<AnyDraft | null>(null);
  const module = moduleFor(studioBuilder(category));

  useEffect(() => {
    if (!data || !module) return;
    let live = true;
    module
      .fromProduct(product, category, data, true)
      .then((d) => live && setDraft(d))
      .catch(() => live && setDraft(null));
    return () => {
      live = false;
    };
  }, [data, module, product, category]);

  if (!draft || !data) return <span className="h-full w-full animate-pulse rounded-2xl bg-card" aria-label={i18n.t("preview.drawing")} role="img" />;
  return <Drawn draft={draft} data={data} category={category} />;
}

function Drawn({ draft, data, category }: { draft: AnyDraft; data: StudioData; category: Category }): ReactNode {
  switch (draft.kind) {
    case "GIFT":
      return (
        <div className="w-full">
          <GiftThumb draft={draft} data={data} />
        </div>
      );
    case "APPAREL":
      return (
        <div className={`grid w-full gap-3 ${draft.back.length ? "grid-cols-2" : "grid-cols-1"}`}>
          <ApparelThumb draft={draft} data={data} category={category} side="front" />
          {draft.back.length > 0 && <ApparelThumb draft={draft} data={data} category={category} side="back" />}
        </div>
      );
    case "CASE":
      return <CaseThumb draft={draft} data={data} />;
    case "MUG": {
      const area = mugArea(blankMug(data));
      return area ? (
        <div className="w-full">
          <MugEditor area={area} view="front" guides={false} label={i18n.t("preview.yourMug")}>
            <PlacementLayer elements={draft.elements} label={i18n.t("preview.mugPrint")} readOnly />
          </MugEditor>
        </div>
      ) : null;
    }
    case "STICKER":
      return <StickerThumb draft={draft} size={sizeOf(category, draft)} />;
    default:
      return null;
  }
}

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={alt} className="fixed inset-0 z-[70] flex items-center justify-center bg-background/90 p-4 backdrop-blur-md" onClick={onClose}>
      <img {...corsImage} src={src} alt={alt} className="max-h-full max-w-full rounded-2xl bg-secondary object-contain" />
      <button type="button" onClick={onClose} aria-label={i18n.t("common.close")} className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card">
        <Icon name="close" size={18} />
      </button>
    </div>,
    document.body,
  );
}

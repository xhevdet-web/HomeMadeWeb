import { useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { Category, Product } from "../api/models";
import { fitsLabel, isCustom, isSoldOut, priceLabel, productAction, productPictures } from "../lib/products";
import { corsImage } from "../studio/capture";
import { Icon } from "./Icon";
import { ActionButton, ProductBadge, productShadow, productStage } from "./ProductCard";

/**
 * Full-size product viewer: the photo (click to zoom where you click), front/back thumbnails,
 * details and the product's button. Arrows (and ←/→) step through `products`; Escape closes.
 */
export function ProductViewer({ products, index, categoryOf, onIndex, onClose }: {
  products: Product[];
  index: number;
  categoryOf: (p: Product) => Category | null | undefined;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const product = products[index];
  const category = categoryOf(product);
  const pics = productPictures(product);
  const [pic, setPic] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const many = products.length > 1;
  const soldOut = isSoldOut(product);

  const go = (step: number) => onIndex((index + step + products.length) % products.length);

  useEffect(() => {
    setPic(0);
    setZoom(null);
  }, [index]);
  useEffect(() => setZoom(null), [pic]);

  // Focus, scroll lock, and focus back to the card when it closes.
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      before?.focus();
    };
  }, []);

  // Keys are read on the window: a focused thumbnail can disappear when the product changes.
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      if (zoom) setZoom(null);
      else onClose();
    } else if (many && e.key === "ArrowRight") go(1);
    else if (many && e.key === "ArrowLeft") go(-1);
    else if (e.key === "Tab") {
      // Keep focus inside the dialog.
      const items = [...(dialog.current?.querySelectorAll<HTMLElement>("button, a[href]") ?? [])];
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  };
  const keyHandler = useRef(onKey);
  useEffect(() => {
    keyHandler.current = onKey;
  });
  useEffect(() => {
    const listen = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener("keydown", listen);
    return () => window.removeEventListener("keydown", listen);
  }, []);
  // If the focused control went away (e.g. the back-photo thumbnail), keep focus in the dialog.
  useEffect(() => {
    if (!dialog.current?.contains(document.activeElement)) dialog.current?.focus();
  }, [index]);

  const toggleZoom = (e: MouseEvent<HTMLButtonElement>) => {
    if (zoom) return setZoom(null);
    const box = e.currentTarget.getBoundingClientRect();
    // Keyboard clicks have no pointer position: zoom into the centre.
    const x = e.clientX ? ((e.clientX - box.left) / box.width) * 100 : 50;
    const y = e.clientY ? ((e.clientY - box.top) / box.height) * 100 : 50;
    setZoom({ x, y });
  };

  const arrow =
    "absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white/85 text-[#121319] shadow-sm backdrop-blur-md transition-colors hover:bg-white";

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="viewer-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="animate-rise relative grid max-h-[100dvh] w-full max-w-5xl overflow-y-auto rounded-t-[2rem] border border-border bg-card shadow-glow outline-none sm:max-h-[92dvh] sm:rounded-[2rem] lg:grid-cols-[1.45fr_1fr] lg:overflow-hidden"
      >
        <button
          ref={closeButton}
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="absolute top-3 right-3 z-20 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background/80 backdrop-blur-md transition-colors hover:bg-secondary"
        >
          <Icon name="close" size={18} />
        </button>

        {/* Photo */}
        <div className={`relative aspect-square overflow-hidden ${productStage} lg:aspect-auto lg:min-h-[36rem]`}>
          <ProductBadge product={product} category={category} />
          {many && (
            <span className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-[#121319]/80 px-3 py-1 text-xs font-semibold text-[#f5f1ea]" aria-live="polite">
              {t("studio.productCount", { current: index + 1, total: products.length })}
            </span>
          )}
          {pics.length ? (
            <button
              type="button"
              onClick={toggleZoom}
              aria-label={zoom ? t("studio.zoomOut") : t("studio.zoomIn")}
              className={`absolute inset-0 h-full w-full ${zoom ? "cursor-zoom-out" : "cursor-zoom-in"}`}
            >
              <img
                {...corsImage}
                src={pics[pic]}
                alt={product.name}
                decoding="async"
                className={`h-full w-full object-contain p-[10%] ${productShadow} transition-transform duration-300 ease-out ${soldOut ? "opacity-50" : ""}`}
                style={zoom ? { transform: "scale(2.2)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
              />
            </button>
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-[#8a7f74]">{t("products.noPhoto")}</span>
          )}
          {many && !zoom && (
            <>
              <button type="button" onClick={() => go(-1)} aria-label={t("studio.previousProduct")} className={`${arrow} left-3`}>
                <Icon name="chevronLeft" size={18} />
              </button>
              <button type="button" onClick={() => go(1)} aria-label={t("studio.nextProduct")} className={`${arrow} right-3`}>
                <Icon name="chevronRight" size={18} />
              </button>
            </>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col p-6 sm:p-8 lg:overflow-y-auto">
          {category && <p className="eyebrow text-xs">{category.name}</p>}
          <h2 id="viewer-title" className="mt-3 pr-12 font-display text-2xl font-semibold tracking-tight sm:text-3xl lg:pr-0">
            {product.name}
          </h2>
          <p className={`mt-2 text-xl font-semibold ${soldOut ? "text-muted-foreground" : "text-primary"}`}>{priceLabel(product, isCustom(product, category))}</p>
          {fitsLabel(product, category) && <p className="mt-1 text-sm font-medium text-foreground/80">{fitsLabel(product, category)}</p>}
          {product.description && <p className="mt-4 text-sm leading-relaxed whitespace-pre-line text-muted-foreground sm:text-base">{product.description}</p>}

          {pics.length > 1 && (
            <div className="mt-6 flex gap-3" role="group" aria-label={t("studio.pictures")}>
              {pics.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setPic(i)}
                  aria-pressed={i === pic}
                  aria-label={i === 0 ? t("studio.pictureFront") : t("studio.pictureBack")}
                  className={`relative h-20 w-20 overflow-hidden rounded-xl border-2 ${productStage} transition-colors ${i === pic ? "border-primary" : "border-border hover:border-primary/50"}`}
                >
                  <img {...corsImage} src={src} alt="" className="h-full w-full object-contain p-2" />
                </button>
              ))}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 lg:mt-auto lg:pt-8">
            <ActionButton action={productAction(product, category)} className="min-h-12 rounded-full text-base" />
            {pics.length > 0 && <p className="text-center text-xs text-muted-foreground">{t("studio.zoomHint")}</p>}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

import { useEffect, useRef, useState, type DragEvent } from "react";
import i18n from "../i18n";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { ImageFileError, prepareImage, type ImageErrorCode } from "./imageFile";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface UploadedImage {
  url: string;
  width: number;
  height: number;
}

/**
 * Local image picker with drag-and-drop. The photo stays in the browser until the design is
 * saved; large phone photos are resized and rotated upright first (see imageFile.ts), and the
 * customer always sees whether the photo is being prepared, was refused, or why.
 */
export function UploadButton({
  onImage,
  accept = IMAGE_TYPES,
  typeError = i18n.t("upload.typeError"),
  label = i18n.t("upload.label"),
  hint = i18n.t("upload.hint"),
  variant = "zone",
}: {
  onImage: (img: UploadedImage) => void;
  /** ["image/png"] for designs that need transparency; anything else accepts phone photos. */
  accept?: string[];
  typeError?: string;
  label?: string;
  hint?: string;
  variant?: "zone" | "button";
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const pngOnly = accept.length > 0 && accept.every((type) => type === "image/png");
  /** The latest pick; an older photo still being prepared is ignored when it finishes. */
  const pick = useRef(0);
  useEffect(() => () => void (pick.current = -1), []);

  const message = (code: ImageErrorCode) =>
    code === "type" ? typeError : code === "heic" ? i18n.t("upload.heic") : code === "tooLarge" ? i18n.t("upload.tooLarge") : code === "processing" ? i18n.t("upload.processingFailed") : i18n.t("upload.unreadable");

  const handle = async (file?: File) => {
    if (!file) return;
    const id = ++pick.current;
    setError(null);
    setBusy(true);
    try {
      const prepared = await prepareImage(file, { pngOnly });
      if (id !== pick.current) return;
      onImage({ url: URL.createObjectURL(prepared.blob), width: prepared.width, height: prepared.height });
    } catch (e) {
      if (id !== pick.current) return;
      if (import.meta.env.DEV) console.warn("[upload] refused", e);
      setError(message(e instanceof ImageFileError ? e.code : "processing"));
    } finally {
      if (id === pick.current) setBusy(false);
    }
  };

  const drop = {
    onDragOver: (e: DragEvent) => {
      e.preventDefault();
      setOver(true);
    },
    onDragLeave: () => setOver(false),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      setOver(false);
      void handle(e.dataTransfer.files[0]);
    },
  };

  return (
    <div>
      <input
        ref={input}
        type="file"
        // Phones: "image/*" lets iOS convert HEIC to JPEG itself and doesn't hide photos that an
        // Android gallery labels oddly; the file's bytes are checked when it arrives.
        accept={pngOnly ? "image/png" : "image/*"}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const file = e.target.files?.[0];
          // Cleared at once, so choosing the same photo again (after removing it) fires again.
          e.target.value = "";
          void handle(file);
        }}
      />
      {variant === "zone" ? (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          aria-busy={busy}
          {...drop}
          className={`flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors disabled:cursor-progress ${
            over || busy ? "border-primary bg-primary/10" : "border-border hover:border-primary/60 hover:bg-secondary/40"
          }`}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
            {busy ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" /> : <Icon name="upload" size={20} />}
          </span>
          <span className="font-semibold">{busy ? i18n.t("upload.processing") : label}</span>
          <span className="text-xs text-muted-foreground">{busy ? i18n.t("upload.processingHint") : hint}</span>
        </button>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => input.current?.click()} disabled={busy} {...drop}>
          <Icon name="upload" size={15} /> {busy ? i18n.t("upload.processing") : label}
        </Button>
      )}
      {busy && (
        <span role="status" className="sr-only">
          {i18n.t("upload.processing")}
        </span>
      )}
      {error && (
        <p role="alert" className="mt-2 flex items-start gap-2 text-sm text-destructive">
          <Icon name="alert" size={16} className="mt-0.5" />
          {error}
        </p>
      )}
    </div>
  );
}

export function QualityWarning({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <p role="alert" className="flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm">
      <Icon name="alert" size={16} className="text-primary" />
      {i18n.t("upload.lowQuality")}
    </p>
  );
}

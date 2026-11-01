import { useRef, useState, type DragEvent } from "react";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export interface UploadedImage {
  url: string;
  width: number;
  height: number;
}

/** Local-only image picker with drag-and-drop. The file never leaves the browser. */
export function UploadButton({
  onImage,
  accept = IMAGE_TYPES,
  maxBytes = MAX_UPLOAD_BYTES,
  typeError = "Choose a JPEG, PNG or WebP image.",
  label = "Upload image",
  hint = "JPEG, PNG or WebP, up to 5 MB",
  variant = "zone",
}: {
  onImage: (img: UploadedImage) => void;
  accept?: string[];
  maxBytes?: number;
  typeError?: string;
  label?: string;
  hint?: string;
  variant?: "zone" | "button";
}) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  const handle = (file?: File) => {
    if (!file) return;
    if (!accept.includes(file.type)) return setError(typeError);
    if (file.size > maxBytes) return setError("This image is larger than 5 MB. Choose a smaller one.");
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setError(null);
      onImage({ url, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError("We couldn't read this image. Try another one.");
    };
    img.src = url;
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
      handle(e.dataTransfer.files[0]);
    },
  };

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept={accept.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          handle(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {variant === "zone" ? (
        <button
          type="button"
          onClick={() => input.current?.click()}
          {...drop}
          className={`flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-7 text-center transition-colors ${
            over ? "border-primary bg-primary/10" : "border-border hover:border-primary/60 hover:bg-secondary/40"
          }`}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Icon name="upload" size={20} />
          </span>
          <span className="font-semibold">{label}</span>
          <span className="text-xs text-muted-foreground">{hint}</span>
        </button>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => input.current?.click()} {...drop}>
          <Icon name="upload" size={15} /> {label}
        </Button>
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
      This image may appear blurry when printed.
    </p>
  );
}

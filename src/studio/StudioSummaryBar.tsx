import { useEffect, useRef, useState } from "react";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { money } from "../data/mock";

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Price that counts to its new value when it changes. */
export function AnimatedPrice({ cents, className = "" }: { cents: number; className?: string }) {
  const [shown, setShown] = useState(cents);
  const shownRef = useRef(cents);

  useEffect(() => {
    const from = shownRef.current;
    if (from === cents || reducedMotion()) {
      shownRef.current = cents;
      setShown(cents);
      return;
    }
    let frame = 0;
    let t0: number | null = null;
    const tick = (t: number) => {
      t0 ??= t;
      const k = Math.min(1, (t - t0) / 350);
      const v = Math.round(from + (cents - from) * (1 - Math.pow(1 - k, 3)));
      shownRef.current = v;
      setShown(v);
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [cents]);

  return (
    <span className={className} aria-live="off">
      {money(shown)}
    </span>
  );
}

/** "Your creation · …", live price, Save design and the step's main action. Sticky on phones. */
export function StudioSummaryBar({
  summary,
  price,
  priceLabel,
  onSave,
  saveBlocked,
  primaryLabel = "Preview",
  onPrimary,
  primaryBlocked,
  note,
}: {
  summary: string;
  price: number;
  priceLabel?: string;
  onSave: () => void;
  /** Why saving is disabled, if it is. */
  saveBlocked?: string | null;
  primaryLabel?: string;
  onPrimary: () => void;
  primaryBlocked?: string | null;
  /** A hint that does not block anything. */
  note?: string | null;
}) {
  const reason = primaryBlocked ?? saveBlocked ?? note;
  return (
    <div className="sticky bottom-0 z-30 -mx-6 mt-6 border-t border-border bg-background/90 px-6 py-4 backdrop-blur-xl lg:static lg:mx-0 lg:rounded-[2rem] lg:border lg:bg-card lg:px-8 lg:py-6 lg:backdrop-blur-none">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-baseline justify-between gap-4 sm:block">
          <p className="truncate text-sm text-muted-foreground">Your creation · {summary}</p>
          <p className="flex items-baseline gap-2">
            {priceLabel && <span className="text-sm text-muted-foreground">{priceLabel}</span>}
            <AnimatedPrice cents={price} className="font-display text-2xl font-semibold text-primary sm:text-3xl" />
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <Button variant="secondary" size="bar" onClick={onSave} disabled={!!saveBlocked}>
            Save design
          </Button>
          <Button size="bar" glow onClick={onPrimary} disabled={!!primaryBlocked}>
            {primaryLabel} <Icon name="arrowRight" size={16} />
          </Button>
        </div>
      </div>
      {reason && (
        <p className="mt-2 text-xs text-muted-foreground sm:text-right" role={primaryBlocked || saveBlocked ? "note" : undefined}>
          {reason}
        </p>
      )}
    </div>
  );
}

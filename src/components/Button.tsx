import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { Icon } from "./Icon";

/**
 * The site's button system. Use one `primary` per section for the main action, `secondary` for
 * alternatives (customise, save, browse), `tertiary` for light navigation, and `neutral` for
 * housekeeping (cancel, done, retry, delete).
 *
 * Hover styles only apply on devices that can hover (Tailwind v4's `hover:`), so touch screens
 * get the `active:` press feedback instead of a hover look that sticks after a tap.
 */
export type Variant = "primary" | "secondary" | "tertiary" | "neutral";
type Size = "pill" | "sm" | "md" | "lg" | "bar" | "nav" | "cta";
type Arrow = "right" | "left" | false;

const MOTION = "transition-[background-color,color,border-color,box-shadow,translate,scale] duration-200 ease-out";

const VARIANTS: Record<Variant, string> = {
  primary: `bg-btn text-btn-ink hover:-translate-y-0.5 hover:bg-btn-hover hover:shadow-glow active:translate-y-0 active:scale-[0.98] disabled:hover:translate-y-0 disabled:hover:bg-btn ${MOTION}`,
  secondary: `border border-btn text-btn hover:bg-btn hover:text-btn-ink active:scale-[0.98] disabled:hover:bg-transparent disabled:hover:text-btn ${MOTION}`,
  tertiary: `text-btn active:opacity-75 ${MOTION}`,
  neutral: `border border-border text-foreground hover:bg-secondary active:scale-[0.98] disabled:hover:bg-transparent ${MOTION}`,
};

const SIZES: Record<Size, string> = {
  /** Small toolbar buttons (footer, toasts). */
  pill: "h-10 px-4 text-xs",
  sm: "px-5 py-2.5 text-sm",
  md: "px-7 py-3.5",
  lg: "px-8 py-4",
  /** Compact on phones, regular from `sm` up (summary bars). */
  bar: "px-4 py-3 text-sm sm:px-7 sm:py-3.5 sm:text-base",
  /** The header's call to action. */
  nav: "h-9 px-4 text-sm",
  /** Homepage and section calls to action: compact on phones. */
  cta: "px-6 py-3 text-sm sm:px-7 sm:py-3.5 sm:text-base",
};

/** Tertiary buttons are text links: no padding to the sides, so they line up with the text around them. */
const TERTIARY_SIZES: Record<Size, string> = {
  pill: "h-10 text-xs",
  sm: "py-1.5 text-sm",
  md: "py-2",
  lg: "py-2.5 text-lg",
  bar: "py-3 text-sm sm:text-base",
  nav: "h-9 text-sm",
  cta: "py-3 text-sm sm:py-3.5 sm:text-base",
};

interface Style {
  variant?: Variant;
  size?: Size;
  glow?: boolean;
  className?: string;
}

/** Only a variant's colours, hover and press states, for buttons with their own shape (product cards, sheets, toasts). */
export const buttonLook = (variant: Variant) => `${VARIANTS[variant]} disabled:cursor-not-allowed disabled:opacity-45`;

export function buttonClass({ variant = "primary", size = "md", glow = false, className = "" }: Style = {}) {
  const sizing = variant === "tertiary" ? TERTIARY_SIZES[size] : SIZES[size];
  return `group inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-45 ${VARIANTS[variant]} ${sizing} ${glow ? "shadow-glow" : ""} ${className}`;
}

/** Tertiary buttons carry an arrow that slides on hover; `arrow={false}` leaves it out. */
function withArrow(variant: Variant | undefined, arrow: Arrow | undefined, children: ReactNode) {
  const side = arrow ?? (variant === "tertiary" ? "right" : false);
  if (!side) return children;
  const icon = (
    <Icon
      name={side === "right" ? "arrowRight" : "arrowLeft"}
      size={16}
      className={`shrink-0 transition-transform duration-200 ease-out ${side === "right" ? "group-hover:translate-x-1" : "group-hover:-translate-x-1"}`}
    />
  );
  return side === "right" ? (
    <>
      {children}
      {icon}
    </>
  ) : (
    <>
      {icon}
      {children}
    </>
  );
}

type Extra = Style & { arrow?: Arrow };

export function ButtonLink({ variant, size, glow, className, arrow, children, ...props }: Extra & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a {...props} className={buttonClass({ variant, size, glow, className })}>
      {withArrow(variant, arrow, children)}
    </a>
  );
}

export function Button({ variant, size, glow, className, arrow, type = "button", children, ...props }: Extra & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} {...props} className={buttonClass({ variant, size, glow, className })}>
      {withArrow(variant, arrow, children)}
    </button>
  );
}

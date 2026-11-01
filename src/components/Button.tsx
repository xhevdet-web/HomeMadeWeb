import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";
type Size = "sm" | "md" | "lg" | "bar";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground transition-transform duration-300 hover:scale-105",
  secondary: "border border-border transition-colors hover:bg-secondary",
};

const SIZES: Record<Size, string> = {
  sm: "px-5 py-2.5 text-sm",
  md: "px-7 py-3.5",
  lg: "px-8 py-4",
  /** Compact on phones, regular from `sm` up (summary bars). */
  bar: "px-4 py-3 text-sm sm:px-7 sm:py-3.5 sm:text-base",
};

interface Style {
  variant?: Variant;
  size?: Size;
  glow?: boolean;
  className?: string;
}

export function buttonClass({ variant = "primary", size = "md", glow = false, className = "" }: Style = {}) {
  return `inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:scale-100 disabled:hover:bg-transparent ${VARIANTS[variant]} ${SIZES[size]} ${glow ? "shadow-glow" : ""} ${className}`;
}

export function ButtonLink({ variant, size, glow, className, ...props }: Style & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} className={buttonClass({ variant, size, glow, className })} />;
}

export function Button({ variant, size, glow, className, type = "button", ...props }: Style & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} {...props} className={buttonClass({ variant, size, glow, className })} />;
}

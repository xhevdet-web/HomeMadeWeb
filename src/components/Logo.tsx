import i18n from "../i18n";

// The HM Craft logo, cut out of the brand artwork on a transparent background (public/brand).
// "compact" leaves out the tagline (used in the sign-in dialog); "header" and "full" keep it.
const LOGOS = {
  compact: { src: "/brand/hm-craft-logo.png", width: 513, height: 150, className: "h-9 sm:h-10" },
  full: { src: "/brand/hm-craft-logo-full.png", width: 753, height: 220, className: "h-12 sm:h-14" },
  // The full logo, with tagline, at header size.
  header: { src: "/brand/hm-craft-logo-full.png", width: 753, height: 220, className: "h-10 sm:h-12" },
} as const;

export function Logo({ variant = "compact" }: { variant?: keyof typeof LOGOS }) {
  const logo = LOGOS[variant];
  return (
    <a href="#/" className="flex shrink-0 items-center" aria-label={i18n.t("controls.logo")}>
      <img src={logo.src} alt="" width={logo.width} height={logo.height} decoding="async" className={`${logo.className} w-auto select-none`} draggable={false} />
    </a>
  );
}

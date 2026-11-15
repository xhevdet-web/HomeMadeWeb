import { useTranslation } from "react-i18next";
import { SUPPORT_EMAIL } from "../lib/contact";
import { prefersReducedMotion } from "../hooks/useInView";
import { Button, ButtonLink } from "./Button";
import { Icon } from "./Icon";
import { LanguageToggle } from "./LanguageToggle";
import { Logo } from "./Logo";
import { ActiveDot, FOOTER_LINKS } from "./Nav";

/** The footer's link columns, picked from FOOTER_LINKS by section so the links stay in one place. */
const COLUMNS: { title: "footer.explore" | "footer.account" | "footer.help"; sections: string[] }[] = [
  { title: "footer.explore", sections: ["", "products", "studios", "about"] },
  { title: "footer.account", sections: ["designs", "orders", "profile"] },
  { title: "footer.help", sections: ["contact"] },
];

const linkClass = "inline-flex items-center gap-2 py-1 text-sm transition-colors";

export function Footer({ section }: { section: string }) {
  const { t } = useTranslation();
  const toTop = () => window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });

  return (
    <footer className="relative overflow-hidden border-t border-border bg-card/40">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/60 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-12 py-14 sm:py-16 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)] lg:gap-16">
          {/* Brand */}
          <div className="max-w-sm">
            <Logo variant="full" />
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{t("footer.tagline")}</p>
            <ButtonLink href="#/create" variant="secondary" size="sm" arrow="right" className="mt-6">
              {t("nav.startCreating")}
            </ButtonLink>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            {COLUMNS.map((col) => (
              <nav key={col.title} aria-label={t(col.title)} className={col.title === "footer.help" ? "col-span-2 sm:col-span-1" : ""}>
                <h2 className="text-xs font-semibold tracking-[0.2em] text-foreground uppercase">{t(col.title)}</h2>
                <ul className="mt-4 space-y-1.5">
                  {FOOTER_LINKS.filter((l) => col.sections.includes(l.section ?? "")).map((l) => {
                    const active = section === l.section;
                    return (
                      <li key={l.href}>
                        <a
                          href={l.href}
                          aria-current={active ? "page" : undefined}
                          className={`${linkClass} ${active ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          {active && <ActiveDot />}
                          {t(l.label)}
                        </a>
                      </li>
                    );
                  })}
                  {col.title === "footer.help" && (
                    <li>
                      <a href={`mailto:${SUPPORT_EMAIL}`} className={`${linkClass} max-w-full text-muted-foreground hover:text-foreground`} title={t("footer.writeUs")}>
                        <Icon name="mail" size={15} className="shrink-0 text-primary" />
                        <span className="whitespace-nowrap">{SUPPORT_EMAIL}</span>
                      </a>
                    </li>
                  )}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col gap-4 border-t border-border py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground sm:text-sm">{t("footer.rights", { year: new Date().getFullYear() })}</p>
          <div className="flex items-center gap-3">
            <LanguageToggle label up />
            <Button variant="neutral" size="pill" onClick={toTop}>
              <Icon name="arrowUp" size={14} />
              {t("footer.backToTop")}
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
}

import { useTranslation } from "react-i18next";
import { LanguageToggle } from "./LanguageToggle";
import { Logo } from "./Logo";
import { ActiveDot, activeLink, FOOTER_LINKS } from "./Nav";

export function Footer({ section }: { section: string }) {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 sm:flex-row sm:items-center">
        <Logo variant="full" />
        <ul className="-mx-2.5 flex flex-wrap gap-y-1 text-sm">
          {FOOTER_LINKS.map((l) => {
            const active = section === l.section;
            return (
              <li key={l.href}>
                <a
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1.5 whitespace-nowrap transition-colors ${
                    active ? `${activeLink} font-semibold` : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {active && <ActiveDot />}
                  {t(l.label)}
                </a>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-4">
          <LanguageToggle label up />
          <p className="max-w-60 text-sm text-muted-foreground">{t("footer.rights", { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  );
}

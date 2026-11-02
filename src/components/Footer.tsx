import { useTranslation } from "react-i18next";
import { LanguageToggle } from "./LanguageToggle";
import { Logo } from "./Logo";
import { FOOTER_LINKS } from "./Nav";

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-6 sm:flex-row sm:items-center">
        <Logo />
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {FOOTER_LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="text-muted-foreground transition-colors hover:text-foreground">
                {t(l.label)}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-4">
          <LanguageToggle label up />
          <p className="text-sm text-muted-foreground">{t("footer.rights", { year: new Date().getFullYear() })}</p>
        </div>
      </div>
    </footer>
  );
}

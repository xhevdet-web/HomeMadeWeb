import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { LANGUAGES, setLanguage, type SiteLanguage } from "../i18n";
import { Icon } from "./Icon";

/** Each language in its own name, so it is recognisable whichever language is showing. */
const NAMES: Record<SiteLanguage, string> = { sq: "Shqip", en: "English" };

/**
 * Language select: shows the current language (globe + SQ / EN, or its name with `label`)
 * and opens a list of both, the current one checked. `up` opens it above, for the footer.
 */
export function LanguageToggle({ className = "", label = false, up = false, ghost = false }: { className?: string; label?: boolean; up?: boolean; ghost?: boolean }) {
  const { t, i18n } = useTranslation();
  const current: SiteLanguage = i18n.language === "en" ? "en" : "sq";
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const options = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    options.current[LANGUAGES.indexOf(current)]?.focus();
    const close = (e: PointerEvent | globalThis.KeyboardEvent) => {
      if (e instanceof globalThis.KeyboardEvent ? e.key === "Escape" : !root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
    };
  }, [open, current]);

  const choose = (language: SiteLanguage) => {
    setOpen(false);
    setLanguage(language);
  };

  const onListKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const at = options.current.indexOf(document.activeElement as HTMLButtonElement);
    const step = e.key === "ArrowDown" ? 1 : -1;
    options.current[(at + step + LANGUAGES.length) % LANGUAGES.length]?.focus();
  };

  return (
    <div ref={root} className={`relative ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t("language.label")}: ${NAMES[current]}`}
        title={t("language.label")}
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-full text-xs font-bold transition-colors hover:bg-secondary ${
          // ghost: borderless, for the header toolbar.
          ghost ? `h-9 px-2.5 text-muted-foreground hover:text-foreground ${open ? "bg-secondary text-foreground" : ""}` : "h-10 border border-border px-3"
        }`}
      >
        <Icon name="globe" size={ghost ? 15 : 16} />
        {label ? NAMES[current] : current.toUpperCase()}
        <Icon name="chevronDown" size={14} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          role="listbox"
          aria-label={t("language.label")}
          onKeyDown={onListKey}
          className={`absolute z-50 w-44 overflow-hidden rounded-2xl border border-border bg-card py-2 shadow-glow ${up ? "bottom-full mb-2" : "top-full mt-2"} ${label ? "left-0" : "right-0"}`}
        >
          {LANGUAGES.map((language, i) => (
            <button
              key={language}
              ref={(el) => {
                options.current[i] = el;
              }}
              type="button"
              role="option"
              aria-selected={language === current}
              lang={language}
              onClick={() => choose(language)}
              className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors outline-none hover:bg-secondary focus-visible:bg-secondary ${
                language === current ? "font-semibold" : "text-muted-foreground"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="w-6 text-xs font-bold text-muted-foreground">{language.toUpperCase()}</span>
                {NAMES[language]}
              </span>
              {language === current && <Icon name="check" size={16} className="text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

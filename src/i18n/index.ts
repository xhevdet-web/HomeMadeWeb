import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { translationEN } from "../translations/translation-en";
import { translationAL } from "../translations/translation-al";

/** Supported website languages (ISO 639-1: Albanian is `sq`), like the app. */
export const LANGUAGES = ["sq", "en"] as const;
export type SiteLanguage = (typeof LANGUAGES)[number];
export const isSiteLanguage = (value: unknown): value is SiteLanguage => LANGUAGES.includes(value as SiteLanguage);

/** Albanian unless the visitor chose English before. */
const DEFAULT_LANGUAGE: SiteLanguage = "sq";
const STORAGE_KEY = "homecreator-language";

function savedLanguage(): SiteLanguage {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isSiteLanguage(saved) ? saved : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

// The one i18next instance of the website. Resources are bundled, so it is ready before the
// first render, already in the saved language.
const i18n = createInstance();
void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: translationEN },
    sq: { translation: translationAL },
  },
  lng: savedLanguage(),
  fallbackLng: "en",
  supportedLngs: [...LANGUAGES],
  initAsync: false,
  interpolation: { escapeValue: false },
  returnNull: false,
});

const applyToDocument = (language: string) => {
  document.documentElement.lang = language;
};
applyToDocument(i18n.language);
i18n.on("languageChanged", applyToDocument);

/** Switches the whole website and remembers the choice in this browser. */
export function setLanguage(language: SiteLanguage) {
  void i18n.changeLanguage(language);
  try {
    localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Private mode or blocked storage: the choice lasts for this visit.
  }
}

/** Locale for dates and numbers in the current language, e.g. 27 Oct 2026 / 27 tet 2026. */
export const dateLocale = (language: string = i18n.language) => (language === "sq" ? "sq-AL" : "en-GB");

export default i18n;

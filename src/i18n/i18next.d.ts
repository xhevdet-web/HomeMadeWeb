import "i18next";
import type { translationEN } from "../translations/translation-en";

// Type-checks every t("…") key against the English translation, as in the app.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: typeof translationEN };
    returnNull: false;
  }
}

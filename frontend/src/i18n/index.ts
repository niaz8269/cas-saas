import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"

import ar from "./locales/ar.json"
import en from "./locales/en.json"
import fr from "./locales/fr.json"
import id from "./locales/id.json"
import zh from "./locales/zh.json"

export const LANG_STORAGE_KEY = "cas-lang"

/**
 * App i18n (public site + student/agent portals; the admin stays English).
 * Resources are bundled so init is synchronous — no Suspense needed. English
 * is the source of truth; the other four locales are progressively filled and
 * fall back to English for any missing key (returnEmptyString keeps blanks on
 * the fallback too, so a scaffolded-but-empty value still shows English).
 */
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      zh: { translation: zh },
      ar: { translation: ar },
      fr: { translation: fr },
      id: { translation: id },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "zh", "ar", "fr", "id"],
    returnEmptyString: false,
    detection: {
      order: ["querystring", "localStorage", "navigator"],
      lookupQuerystring: "lng",
      caches: ["localStorage"],
      lookupLocalStorage: LANG_STORAGE_KEY,
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })

export default i18n

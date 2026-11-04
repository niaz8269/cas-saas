import i18n from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"

import en from "./locales/en.json"

export const LANG_STORAGE_KEY = "cas-lang"

/**
 * App i18n (public site + student/agent portals; the admin stays English).
 * English is bundled so init is synchronous (no Suspense). The other four
 * locales are separate chunks, fetched when a language is detected or chosen;
 * until then, and for any missing key, English shows (returnEmptyString keeps
 * blanks on the fallback too, so a scaffolded-but-empty value still shows English).
 */
const LOADERS: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
  zh: () => import("./locales/zh.json"),
  ar: () => import("./locales/ar.json"),
  fr: () => import("./locales/fr.json"),
  id: () => import("./locales/id.json"),
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en } },
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

/** Fetch a locale's strings once; English is always present. */
export async function loadLanguage(code: string): Promise<void> {
  const lng = code.slice(0, 2)
  const load = LOADERS[lng]
  if (!load || i18n.hasResourceBundle(lng, "translation")) return
  const mod = await load()
  i18n.addResourceBundle(lng, "translation", mod.default, true, true)
}

// Load the strings before switching, so the page never flashes missing keys.
const switchLanguage = i18n.changeLanguage.bind(i18n)
i18n.changeLanguage = async (lng, callback) => {
  if (lng) await loadLanguage(lng)

  return switchLanguage(lng, callback)
}

// A language remembered from an earlier visit (or the browser's) loads in the background.
const detected = i18n.resolvedLanguage ?? i18n.language
if (detected && detected.slice(0, 2) !== "en") void i18n.changeLanguage(detected)

export default i18n

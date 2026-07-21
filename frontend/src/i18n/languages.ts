export type LangCode = "en" | "zh" | "ar" | "fr" | "id"

export interface LangDef {
  code: LangCode
  /** English name (for aria/tooltip). */
  label: string
  /** Endonym shown in the menu. */
  native: string
  /** flagcdn ISO code, or null for the generic Arabic mark. */
  flag: string | null
  dir: "ltr" | "rtl"
}

/** The five languages CAS supports, in switcher order (English first/default). */
export const LANGUAGES: LangDef[] = [
  { code: "en", label: "English", native: "English", flag: "gb", dir: "ltr" },
  { code: "zh", label: "Chinese", native: "中文", flag: "cn", dir: "ltr" },
  { code: "ar", label: "Arabic", native: "العربية", flag: null, dir: "rtl" },
  { code: "fr", label: "French", native: "Français", flag: "fr", dir: "ltr" },
  { code: "id", label: "Indonesian", native: "Bahasa Indonesia", flag: "id", dir: "ltr" },
]

/**
 * Resolve any i18next language tag to one of our five. Matches on the base
 * subtag (so "en-US" → en). IMPORTANT: pass i18n.language (the chosen
 * language), not i18n.resolvedLanguage — the latter collapses to the English
 * fallback while a locale's dictionary is still empty, which would keep the
 * flag + direction stuck on English.
 */
export const langDef = (code: string | undefined): LangDef => {
  const base = (code || "en").split("-")[0].toLowerCase()

  return LANGUAGES.find((l) => l.code === base) ?? LANGUAGES[0]
}

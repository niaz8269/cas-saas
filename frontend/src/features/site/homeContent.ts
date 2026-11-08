/** What the admin panel can change on the home page, and how the site reads it. */

export interface HomeContent {
  /** Pictures, shared by every language. */
  images?: Record<string, string>
  /** Per language: text fields and lists. Anything missing falls back to the standard text. */
  [locale: string]: { texts?: Record<string, string>; lists?: Record<string, Record<string, string>[]> } | Record<string, string> | undefined
}

export interface HomeSectionData {
  key: string
  type: string
  content: HomeContent | null
}

export const LOCALES = ["en", "zh", "ar", "fr", "id"] as const
export type Locale = (typeof LOCALES)[number]

/** "en-US" -> "en"; anything unknown -> "en". */
export function baseLocale(language: string | undefined): Locale {
  const base = (language ?? "en").slice(0, 2).toLowerCase()

  return (LOCALES as readonly string[]).includes(base) ? (base as Locale) : "en"
}

export interface SectionContent {
  /** Changed text, or undefined to use the standard text. */
  text: (field: string) => string | undefined
  /** A changed list, or undefined to use the standard one. */
  list: <T extends Record<string, string>>(name: string) => T[] | undefined
  /** A changed picture, or undefined. */
  image: (name: string) => string | undefined
}

/** Read one section's changes for a language. Empty text counts as "not changed". */
export function sectionContent(content: HomeContent | null | undefined, locale: Locale): SectionContent {
  const mine = (content?.[locale] ?? {}) as { texts?: Record<string, string>; lists?: Record<string, Record<string, string>[]> }

  return {
    text: (field) => {
      const v = mine.texts?.[field]

      return typeof v === "string" && v.trim() !== "" ? v : undefined
    },
    list: <T extends Record<string, string>>(name: string) => {
      const v = mine.lists?.[name]

      return Array.isArray(v) && v.length > 0 ? (v as unknown as T[]) : undefined
    },
    image: (name) => {
      const v = content?.images?.[name]

      return typeof v === "string" && v !== "" ? v : undefined
    },
  }
}

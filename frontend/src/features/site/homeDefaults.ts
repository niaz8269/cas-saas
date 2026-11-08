/**
 * The standard home page content: the i18n keys and links the site uses when nothing was changed in the
 * admin panel. The admin editor reads the same lists to show staff what is currently on the page.
 */

export interface LinkItem { label: string; to: string }
export interface HighlightItem { title: string; body: string; tag: string; to: string; image?: string }

export const DEFAULT_SECTION_ORDER = ["hero", "cities", "weekly", "highlights", "outstanding", "featured", "more", "testimonials", "share", "cta", "why"] as const

/** [i18n key, link] */
export const POPULAR_SEARCHES: [string, string][] = [
  ["home.popularSearches.chineseLanguage", "/site/programs?q=Chinese"],
  ["home.popularSearches.mbbs", "/site/programs?q=MBBS"],
  ["home.popularSearches.internationalTrade", "/site/programs?q=Trade"],
  ["home.popularSearches.engineering", "/site/programs?q=Engineering"],
]

/** [title key, body key, link, tag key] */
export const HIGHLIGHTS: [string, string, string, string][] = [
  ["home.highlights.medicalTitle", "home.highlights.medicalBody", "/site/universities?moe=1", "home.highlights.medicalTag"],
  ["home.highlights.deadlinesTitle", "home.highlights.deadlinesBody", "/site/universities?topic=deadlines", "home.highlights.deadlinesTag"],
  ["home.highlights.languageTitle", "home.highlights.languageBody", "/site/programs?language=Chinese", "home.highlights.languageTag"],
  ["home.highlights.valueTitle", "home.highlights.valueBody", "/site/programs?maxFee=20000", "home.highlights.valueTag"],
  ["home.highlights.fullScholarshipTitle", "home.highlights.fullScholarshipBody", "/site/scholarships?type=full", "home.highlights.fullScholarshipTag"],
  ["home.highlights.partialScholarshipTitle", "home.highlights.partialScholarshipBody", "/site/scholarships?type=partial", "home.highlights.partialScholarshipTag"],
]

/** [label key, link] for each tab's list. */
export const FEATURED_TAB1: [string, string][] = [
  ["home.featured.questions.recognition", "/site/faq?q=recognition"],
  ["home.featured.questions.costs", "/site/pricing#costs"],
  ["home.featured.questions.csca", "/site/faq?q=csca"],
  ["home.featured.questions.scholarship", "/site/faq?q=scholarships"],
]
export const FEATURED_TAB2: [string, string][] = [
  ["home.featured.trending.mbbsEnglish", "/site/programs?language=English"],
  ["home.featured.trending.engineering", "/site/programs?q=Engineering&level=master"],
  ["home.featured.trending.business", "/site/programs?q=Business"],
  ["home.featured.trending.fullTuition", "/site/scholarships?q=full-tuition"],
]

import type { TFunction } from "i18next"

import { FEATURED_TAB1, FEATURED_TAB2, HIGHLIGHTS, POPULAR_SEARCHES } from "@/features/site/homeDefaults"

/**
 * What staff can change in each section of the home page. `standard` shows what is on the site today,
 * so a blank field means "keep the standard text".
 */

export type InputKind = "text" | "textarea" | "link"

export interface FieldDef {
  key: string
  label: string
  kind: InputKind
  standard: (t: TFunction) => string
}

export interface ListDef {
  key: string
  label: string
  help?: string
  max: number
  fields: { key: string; label: string; kind: InputKind }[]
  standard: (t: TFunction) => Record<string, string>[]
}

export interface ImageDef {
  key: string
  label: string
  help?: string
}

export interface SectionDef {
  title: string
  description: string
  fields: FieldDef[]
  lists?: ListDef[]
  images?: ImageDef[]
  /** The top banner: edit only, never moved or hidden. */
  pinned?: boolean
}

const f = (key: string, label: string, i18nKey: string, kind: InputKind = "text"): FieldDef => ({ key, label, kind, standard: (t) => t(i18nKey) })
const link = (key: string, label: string, to: string): FieldDef => ({ key, label, kind: "link", standard: () => to })

export const SECTION_DEFS: Record<string, SectionDef> = {
  hero: {
    title: "Top banner",
    description: "The full-screen picture, headline and search at the top of the page.",
    pinned: true,
    fields: [
      f("title", "Headline", "home.hero.title"),
      f("motto", "Line under the headline", "home.hero.motto"),
      f("searchLabel", "Small label above the search box", "home.search.label"),
      f("searchPlaceholder", "Search box hint", "home.search.placeholder"),
      f("searchButton", "Search button", "home.search.button"),
      f("popularLabel", "Label before the shortcuts", "home.search.popular"),
    ],
    lists: [{
      key: "popular", label: "Shortcut buttons under the search", max: 8, help: "Quick links such as Chinese Language or MBBS.",
      fields: [{ key: "label", label: "Label", kind: "text" }, { key: "to", label: "Link", kind: "link" }],
      standard: (t) => POPULAR_SEARCHES.map(([k, to]) => ({ label: t(k), to })),
    }],
    images: [{ key: "hero", label: "Background picture", help: "A wide photo, at least 1600 pixels across. Leave empty to keep the standard Beijing photo." }],
  },
  cities: {
    title: "Study by city",
    description: "Cards for the cities with the most universities. The cities themselves come from your university list.",
    fields: [f("title", "Title", "home.cities.title"), f("subtitle", "Subtitle", "home.cities.subtitle", "textarea"), f("seeMore", "\"See more\" link text", "home.cities.seeMore")],
  },
  weekly: {
    title: "Program of the week",
    description: "A different open English-taught program each week, chosen automatically.",
    fields: [f("title", "Title", "home.weekly.title"), f("supportLine", "Support line", "home.weekly.fullSupport"), f("applyLabel", "Button text", "home.weekly.applyForSeat"), link("applyLink", "Button link", "/site/study-plan")],
  },
  highlights: {
    title: "Highlights",
    description: "Six photo cards linking to useful pages.",
    fields: [f("title", "Title", "home.highlights.title"), f("subtitle", "Subtitle", "home.highlights.subtitle", "textarea"), f("learnMore", "\"Learn more\" text", "home.highlights.learnMore")],
    lists: [{
      key: "items", label: "Cards", max: 9,
      fields: [
        { key: "title", label: "Title", kind: "text" }, { key: "body", label: "Text", kind: "textarea" }, { key: "tag", label: "Small tag", kind: "text" },
        { key: "to", label: "Link", kind: "link" },
      ],
      standard: (t) => HIGHLIGHTS.map(([title, body, to, tag]) => ({ title: t(title), body: t(body), tag: t(tag), to })),
    }],
  },
  outstanding: {
    title: "Outstanding programs",
    description: "The dark band with five programs. Which programs show is chosen automatically.",
    fields: [f("title", "Title", "home.outstanding.title"), f("subtitle", "Subtitle", "home.outstanding.subtitle", "textarea"), f("viewAll", "Button text", "home.outstanding.viewAll"), link("viewAllLink", "Button link", "/site/programs?sort=popular")],
  },
  featured: {
    title: "Featured content",
    description: "The big guide card and the two tabs of quick links.",
    fields: [
      f("title", "Section title", "home.featured.title"),
      f("guideBadge", "Guide card: badge", "home.featured.guideBadge"), f("guideTitle", "Guide card: title", "home.featured.guideTitle"),
      f("guideBody", "Guide card: text", "home.featured.guideBody", "textarea"), f("guideButton", "Guide card: link text", "home.featured.readGuide"),
      link("guideLink", "Guide card: link", "/site/why-china?read=full"),
      f("tab1Label", "First tab name", "home.featured.tabs.questions"), f("tab2Label", "Second tab name", "home.featured.tabs.trending"),
    ],
    lists: [
      { key: "tab1", label: "First tab links", max: 10, fields: [{ key: "label", label: "Text", kind: "text" }, { key: "to", label: "Link", kind: "link" }], standard: (t) => FEATURED_TAB1.map(([k, to]) => ({ label: t(k), to })) },
      { key: "tab2", label: "Second tab links", max: 10, fields: [{ key: "label", label: "Text", kind: "text" }, { key: "to", label: "Link", kind: "link" }], standard: (t) => FEATURED_TAB2.map(([k, to]) => ({ label: t(k), to })) },
    ],
  },
  more: {
    title: "More universities",
    description: "A grid of universities with open admission. The universities come from your university list.",
    fields: [f("title", "Title", "home.more.title"), f("viewAll", "\"View all\" text", "home.more.viewAll"), link("viewAllLink", "\"View all\" link", "/site/universities?sort=name")],
  },
  testimonials: {
    title: "Student testimonials (globe)",
    description: "The globe of student photos. It appears once a student testimonial is approved; manage them under Testimonials.",
    fields: [],
  },
  share: {
    title: "Share your experience band",
    description: "The invitation for students and partners to send a testimonial.",
    fields: [f("title", "Title", "home.share.title"), f("body", "Text", "home.share.body", "textarea"), f("studentLabel", "First button", "home.share.student"), f("partnerLabel", "Second button", "home.share.partner")],
  },
  cta: {
    title: "Closing call to action",
    description: "The box near the bottom with two buttons.",
    fields: [
      f("title", "Title", "home.cta.title"), f("subtitle", "Text", "home.cta.subtitle", "textarea"),
      f("primaryLabel", "First button text", "home.cta.findProgram"), link("primaryLink", "First button link", "/site/programs?sort=fee"),
      f("secondaryLabel", "Second button text", "home.cta.freeConsultation"), link("secondaryLink", "Second button link", "/site/contact?topic=consultation"),
    ],
  },
  why: {
    title: "Why apply with CAS",
    description: "The grey block before the footer.",
    fields: [f("title", "Title", "home.why.title")],
    lists: [{
      key: "items", label: "Points", max: 8,
      fields: [{ key: "title", label: "Title", kind: "text" }, { key: "body", label: "Text", kind: "textarea" }, { key: "linkLabel", label: "Link text (optional)", kind: "text" }, { key: "linkTo", label: "Link (optional)", kind: "link" }],
      standard: (t) => [
        { title: t("home.why.freeTitle"), body: t("home.why.freeBody"), linkLabel: t("home.why.freeLink"), linkTo: "/site/pricing" },
        { title: t("home.why.easyTitle"), body: t("home.why.easyBody"), linkLabel: "", linkTo: "" },
        { title: t("home.why.supportTitle"), body: t("home.why.supportBody"), linkLabel: t("home.why.supportLink"), linkTo: "/site/contact" },
      ],
    }],
  },
  banner: {
    title: "Banner",
    description: "A highlighted box with a title, a short text and a button. Good for open days or deadlines.",
    fields: [
      { key: "title", label: "Title", kind: "text", standard: () => "" }, { key: "body", label: "Text", kind: "textarea", standard: () => "" },
      { key: "buttonLabel", label: "Button text", kind: "text", standard: () => "" }, { key: "buttonLink", label: "Button link", kind: "link", standard: () => "/site/contact" },
    ],
    images: [{ key: "main", label: "Background picture (optional)" }],
  },
  text: {
    title: "Text block",
    description: "A heading and paragraphs. Leave a blank line between paragraphs.",
    fields: [{ key: "title", label: "Title", kind: "text", standard: () => "" }, { key: "body", label: "Text", kind: "textarea", standard: () => "" }],
  },
}

import { useAuthStore } from "@/stores/auth"
import { usePortalAuthStore } from "@/stores/portalAuth"

/**
 * Public website API client. Hits the /api/v1/public/* endpoints. Auth is
 * OPTIONAL: when a visitor is signed in (portal student/agent, or staff) we
 * attach their token so the catalog widens the "audience" — role-based fees
 * and the registered-only specifics. Guests send nothing and see the teaser.
 */
const BASE = "/api/v1"

async function siteApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = usePortalAuthStore.getState().token ?? useAuthStore.getState().token

  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message = (data && (data.message as string)) || `HTTP ${response.status}`
    throw new SiteApiError(response.status, message, data?.errors ?? {})
  }

  return data as T
}

export class SiteApiError extends Error {
  readonly status: number
  readonly errors: Record<string, string[]>

  constructor(status: number, message: string, errors: Record<string, string[]> = {}) {
    super(message)
    this.name = "SiteApiError"
    this.status = status
    this.errors = errors
  }
}

export interface SiteUniversityRef {
  name: string
  slug: string | null
  city?: string | null
  cover_url?: string | null
  cover_credit?: string | null
  cover_downloadable?: boolean
}

export interface SiteProgram {
  id: number
  name: string
  name_zh?: string | null
  csc_listed?: boolean
  // Registered with the Ministry of Education; international-student details not confirmed yet.
  registry_only?: boolean
  level: string
  teaching_language: string | null
  duration_months: number | null
  tuition_fee: string | number | null
  currency: string | null
  requirements: string[] | null
  university?: SiteUniversityRef
  // Audience gating (Phase 1): fees are registered-only; rate follows role.
  fee_locked?: boolean
  service_charge?: { amount: number; currency: string } | null
}

export interface SiteIntake {
  id: number
  name: string
  start_date: string | null
  application_open_date: string | null
  application_deadline: string | null
  status?: string
  seats: number | null
  program: string | null
}

export interface SiteScholarship {
  id: number
  name: string
  slug: string | null
  type: string | null
  coverage: string | null
  amount: string | number | null
  currency: string | null
  description: string | null
  eligibility: string | null
  how_to_apply: string | null
  deadline: string | null
  application_open_date: string | null
  photo_url?: string | null
  photo_credit?: string | null
  university?: SiteUniversityRef
  /** Audience gating (Phase 1): amount/deadline/how-to-apply are registered-only. */
  details_locked?: boolean
}

export interface SiteRepProfessor {
  name: string | null
  title: string | null
  photo_url: string | null
}

export interface SitePhotoCredit {
  university: string
  slug: string
  credit: string | null
  source_url: string | null
  kind: "campus" | "city"
  text_source_url: string | null
}

export type SiteCityGroup = "history" | "places" | "geography" | "economy" | "culture" | "education" | "transport" | "people"

export interface SiteCityProfile {
  summary: string | null
  sections: (SiteOverviewSection & { group: SiteCityGroup })[]
  source_url: string | null
}

export interface SiteFaq {
  q: string
  a: string
}

/** The questions of a fixed page, from the same source the server prints for crawlers. */
export const getPageFaqs = (path: string) => siteApi<{ data: SiteFaq[] }>(`/public/page-faqs?path=${encodeURIComponent(path)}`)

export interface SiteCity {
  city: string
  faqs?: SiteFaq[]
  province: string | null
  sections: SiteOverviewSection[]
  /** What the city is like (history, places to visit, climate, ...); null until it has been built. */
  profile?: SiteCityProfile | null
  universities: SiteUniversityCard[]
}

export function getSiteCity(slug: string) {
  return siteApi<SiteCity>(`/public/cities/${encodeURIComponent(slug)}`)
}

export function getSitePhotoCredits() {
  return siteApi<{ data: SitePhotoCredit[] }>("/public/photo-credits")
}

export interface SiteCityStat {
  city: string
  count: number
  photo_url: string | null
  photo_credit: string | null
  photo_is_city: boolean
}

export interface SiteOverviewSection {
  h: string
  level: number
  blocks: { t: "p" | "li"; x: string }[]
}

export interface SiteGuideBlock {
  h: string
  t: string[]
}

export interface SiteGuide {
  blocks: SiteGuideBlock[]
  links: [string, string][]
}

export interface SiteUniversityCard {
  id: number
  name: string
  name_zh?: string | null
  slug: string | null
  city: string | null
  province?: string | null
  address: string | null
  country: string | null
  logo_url: string | null
  emblem_url?: string | null
  cover_url: string | null
  /** A small (480 px) copy of the cover for cards, when one has been made. */
  cover_thumb_url?: string | null
  cover_credit?: string | null
  cover_downloadable?: boolean
  /** True when the cover is a photo of the city because no campus photo was available. */
  cover_is_city?: boolean
  founded_year?: number | null
  institution_type?: string | null
  student_count?: string | null
  wikipedia_url?: string | null
  moe_listed: boolean
  moe_mbbs_year?: string | null
  /** Real closing date of the nearest open admission window (YYYY-MM-DD), when there is one. */
  open_deadline?: string | null
  nearest_airport: string | null
  about: string | null
  overview?: SiteOverviewSection[] | null
  requirements: string[]
  representative_professor: SiteRepProfessor | null
  programs_count?: number
  /** Programs with details for international students. */
  confirmed_programs_count?: number
  /** Majors the university has registered with the Ministry of Education. */
  registered_majors_count?: number
  /** The first few program names, so a card shows what the university teaches. */
  programs_preview?: string[]
}

export interface SiteUniversityDetail extends SiteUniversityCard {
  guide?: SiteGuide | null
  programs: SiteProgram[]
  intakes: SiteIntake[]
  scholarships: SiteScholarship[]
  /** Audience gating (Phase 1): intake deadlines are registered-only. */
  deadlines_locked?: boolean
}

export interface Paginated<T> {
  data: T[]
  // Set when the search found nothing as typed and the closest correctly spelled words were searched instead.
  suggestion?: { original: string; query: string } | null
  meta: { current_page: number; last_page: number; total: number; from: number | null; to: number | null }
}

export function getSiteUniversities(params: { q?: string; moe?: boolean; city?: string; province?: string; openIntake?: boolean; ids?: number[]; page?: number; perPage?: number; /** Extras that are only sent when asked for: the city and province lists, and the per-city statistics. */ include?: ("lists" | "city_stats")[] } = {}) {
  const search = new URLSearchParams()
  if (params.q) search.set("q", params.q)
  if (params.include?.length) search.set("include", params.include.join(","))
  if (params.moe) search.set("filter[moe_listed]", "1")
  if (params.city) search.set("filter[city]", params.city)
  if (params.province) search.set("filter[province]", params.province)
  if (params.ids?.length) search.set("filter[ids]", params.ids.join(","))
  if (params.openIntake) search.set("filter[open_intake]", "1")
  if (params.perPage) search.set("per_page", String(params.perPage))
  if (params.page && params.page > 1) search.set("page", String(params.page))
  const qs = search.toString()

  return siteApi<Paginated<SiteUniversityCard> & { cities?: string[]; provinces?: string[]; city_stats?: SiteCityStat[] }>(`/public/universities${qs ? `?${qs}` : ""}`)
}

export const getSiteUniversity = (slug: string) =>
  siteApi<{ data: SiteUniversityDetail; faqs?: SiteFaq[] }>(`/public/universities/${slug}`)

export function getSitePrograms(params: { q?: string; level?: string; language?: string; maxFee?: string; openIntake?: boolean; csc?: boolean; city?: string; province?: string; sort?: string; ids?: number[]; page?: number } = {}) {
  const search = new URLSearchParams()
  if (params.csc) search.set("filter[csc]", "1")
  if (params.city) search.set("filter[city]", params.city)
  if (params.province) search.set("filter[province]", params.province)
  if (params.sort) search.set("sort", params.sort)
  if (params.q) search.set("q", params.q)
  if (params.level) search.set("filter[level]", params.level)
  if (params.language) search.set("filter[language]", params.language)
  if (params.maxFee) search.set("filter[max_fee]", params.maxFee)
  if (params.openIntake) search.set("filter[open_intake]", "1")
  if (params.ids?.length) search.set("filter[ids]", params.ids.join(","))
  if (params.page && params.page > 1) search.set("page", String(params.page))
  const qs = search.toString()

  return siteApi<Paginated<SiteProgram>>(`/public/programs${qs ? `?${qs}` : ""}`)
}

export function getSiteScholarships(params: { q?: string; type?: string; ids?: number[]; page?: number } = {}) {
  const search = new URLSearchParams()
  if (params.q) search.set("q", params.q)
  if (params.ids?.length) search.set("filter[ids]", params.ids.join(","))
  if (params.type) search.set("filter[type]", params.type)
  if (params.page && params.page > 1) search.set("page", String(params.page))
  const qs = search.toString()

  return siteApi<Paginated<SiteScholarship> & { types?: string[] }>(`/public/scholarships${qs ? `?${qs}` : ""}`)
}

// ── Content: blogs / news / events ─────────────────────────────────────────

export interface SitePost {
  id: number
  type: "news" | "blog" | "event"
  title: string
  slug: string
  excerpt: string | null
  body?: string | null
  cover_image_url: string | null
  category: string | null
  published_at: string | null
  author: string | null
  event_date: string | null
  location: string | null
  register_url: string | null
}

export function getSitePosts(params: { type?: string; q?: string; ids?: number[]; page?: number; lang?: string } = {}) {
  const search = new URLSearchParams()
  if (params.ids?.length) search.set("ids", params.ids.join(","))
  if (params.type) search.set("type", params.type)
  if (params.q) search.set("q", params.q)
  if (params.page && params.page > 1) search.set("page", String(params.page))
  if (params.lang) search.set("lang", params.lang)
  const qs = search.toString()

  return siteApi<Paginated<SitePost>>(`/public/posts${qs ? `?${qs}` : ""}`)
}

export const getSitePost = (slug: string, lang?: string) =>
  siteApi<{ data: SitePost }>(`/public/posts/${slug}${lang ? `?lang=${lang}` : ""}`)

export interface EnquiryPayload {
  first_name: string
  last_name?: string
  email?: string
  phone?: string
  country?: string
  message?: string
  interested_university_id?: number
  source_url?: string
  form_type?: "enquiry" | "study_plan" | "contact" | "home_popup"
  details?: Record<string, string>
}

export interface SiteCostBand { programs: number; low: number; median: number; high: number }
export interface SiteCostGuide {
  currency: string
  levels: { bachelor: SiteCostBand | null; master: SiteCostBand | null; phd: SiteCostBand | null; mbbs: SiteCostBand | null }
  scholarships: { government: number; full: number; partial: number }
}

export function getSiteCostGuide() {
  return siteApi<SiteCostGuide>("/public/cost-guide")
}

export const postEnquiry = (payload: EnquiryPayload) =>
  siteApi<{ message: string }>("/public/enquiries", { method: "POST", body: JSON.stringify(payload) })

export interface SiteTestimonial {
  id: number
  audience: "student" | "agent"
  name: string
  headline: string | null
  country: string | null
  country_code: string | null
  quote: string
  photo_url: string | null
  title: string | null
  university: string | null
  degree: string | null
  program: string | null
  intake_year: number | null
  services: string[] | null
  recommend: boolean | null
  partner_since: string | null
  students_referred: string | null
  verified: boolean
}

export interface SiteTestimonialSummary {
  count: number
  recommend_percent: number | null
}

export function getSiteTestimonials(audience: "student" | "agent") {
  return siteApi<{ data: SiteTestimonial[]; summary: SiteTestimonialSummary }>(`/public/testimonials?audience=${audience}`)
}

import type { HomeSectionData } from "@/features/site/homeContent"

/** The home page's sections in order, with any changes made in the admin panel. */
export function getSiteHome() {
  return siteApi<{ data: HomeSectionData[] }>("/public/home")
}

// ── Home page: what staff chose by hand ────────────────────────────────────

export type HomeSpotlightIds = Record<"hero_universities" | "update_universities" | "update_programs" | "update_scholarships" | "update_posts", number[]>

/** Ids of the items staff picked, in their order. An empty list means the site picks automatically. */
export const getHomeSpotlight = () => siteApi<{ data: HomeSpotlightIds }>("/public/home-spotlight")

export interface SiteTopic {
  slug: string
  title: string
  description: string
  h1: string
  eyebrow: string
  intro: string
  sections: { h: string; p?: string[]; ul?: string[] }[]
  faq: { q: string; a: string }[]
  search: string
  answer: string
  updated: string
  facts: null | {
    programs: number
    universities: number
    tuition: null | { min: number; max: number; currency: string; programs: number }
    deadlines: { university: string; slug: string; date: string }[]
  }
  related_links: { title: string; path: string }[]
}

export const getSiteTopics = () => siteApi<{ data: { slug: string; title: string; eyebrow: string }[] }>("/public/topics")
export const getSiteTopic = (slug: string) => siteApi<{ data: SiteTopic }>(`/public/topics/${slug}`)

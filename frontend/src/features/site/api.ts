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

export interface SiteCity {
  city: string
  province: string | null
  sections: SiteOverviewSection[]
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
  nearest_airport: string | null
  about: string | null
  overview?: SiteOverviewSection[] | null
  requirements: string[]
  representative_professor: SiteRepProfessor | null
  programs_count?: number
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
  meta: { current_page: number; last_page: number; total: number; from: number | null; to: number | null }
}

export function getSiteUniversities(params: { q?: string; moe?: boolean; city?: string; openIntake?: boolean; page?: number; perPage?: number } = {}) {
  const search = new URLSearchParams()
  if (params.q) search.set("q", params.q)
  if (params.moe) search.set("filter[moe_listed]", "1")
  if (params.city) search.set("filter[city]", params.city)
  if (params.openIntake) search.set("filter[open_intake]", "1")
  if (params.perPage) search.set("per_page", String(params.perPage))
  if (params.page && params.page > 1) search.set("page", String(params.page))
  const qs = search.toString()

  return siteApi<Paginated<SiteUniversityCard> & { cities?: string[]; city_stats?: SiteCityStat[] }>(`/public/universities${qs ? `?${qs}` : ""}`)
}

export const getSiteUniversity = (slug: string) =>
  siteApi<{ data: SiteUniversityDetail }>(`/public/universities/${slug}`)

export function getSitePrograms(params: { q?: string; level?: string; language?: string; maxFee?: string; openIntake?: boolean; page?: number } = {}) {
  const search = new URLSearchParams()
  if (params.q) search.set("q", params.q)
  if (params.level) search.set("filter[level]", params.level)
  if (params.language) search.set("filter[language]", params.language)
  if (params.maxFee) search.set("filter[max_fee]", params.maxFee)
  if (params.openIntake) search.set("filter[open_intake]", "1")
  if (params.page && params.page > 1) search.set("page", String(params.page))
  const qs = search.toString()

  return siteApi<Paginated<SiteProgram>>(`/public/programs${qs ? `?${qs}` : ""}`)
}

export function getSiteScholarships(params: { q?: string; type?: string; page?: number } = {}) {
  const search = new URLSearchParams()
  if (params.q) search.set("q", params.q)
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

export function getSitePosts(params: { type?: string; q?: string; page?: number; lang?: string } = {}) {
  const search = new URLSearchParams()
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
  message?: string
  interested_university_id?: number
  source_url?: string
  form_type?: "enquiry" | "study_plan" | "contact"
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

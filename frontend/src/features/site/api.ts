/**
 * Public website API client — unauthenticated, hits the /api/v1/public/*
 * endpoints. No bearer token, no auth-clearing on 401 (this is what the
 * real marketing site would consume).
 */
const BASE = "/api/v1"

async function siteApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
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
}

export interface SiteProgram {
  id: number
  name: string
  level: string
  teaching_language: string | null
  duration_months: number | null
  tuition_fee: string | number | null
  currency: string | null
  apply_link: string | null
  requirements: string[] | null
  university?: SiteUniversityRef
}

export interface SiteIntake {
  id: number
  name: string
  start_date: string | null
  application_deadline: string | null
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
  apply_link: string | null
  deadline: string | null
  university?: SiteUniversityRef
}

export interface SiteRepProfessor {
  name: string | null
  title: string | null
  photo_url: string | null
}

export interface SiteUniversityCard {
  id: number
  name: string
  slug: string | null
  city: string | null
  address: string | null
  country: string | null
  website: string | null
  apply_link: string | null
  logo_url: string | null
  cover_url: string | null
  moe_listed: boolean
  nearest_airport: string | null
  about: string | null
  requirements: string[]
  representative_professor: SiteRepProfessor | null
  programs_count?: number
}

export interface SiteUniversityDetail extends SiteUniversityCard {
  programs: SiteProgram[]
  intakes: SiteIntake[]
  scholarships: SiteScholarship[]
}

export interface Paginated<T> {
  data: T[]
  meta: { current_page: number; last_page: number; total: number; from: number | null; to: number | null }
}

export function getSiteUniversities(params: { q?: string; moe?: boolean; city?: string; page?: number; perPage?: number } = {}) {
  const search = new URLSearchParams()
  if (params.q) search.set("q", params.q)
  if (params.moe) search.set("filter[moe_listed]", "1")
  if (params.city) search.set("filter[city]", params.city)
  if (params.perPage) search.set("per_page", String(params.perPage))
  if (params.page && params.page > 1) search.set("page", String(params.page))
  const qs = search.toString()

  return siteApi<Paginated<SiteUniversityCard> & { cities?: string[] }>(`/public/universities${qs ? `?${qs}` : ""}`)
}

export const getSiteUniversity = (slug: string) =>
  siteApi<{ data: SiteUniversityDetail }>(`/public/universities/${slug}`)

export function getSitePrograms(params: { q?: string; level?: string; language?: string; maxFee?: string; page?: number } = {}) {
  const search = new URLSearchParams()
  if (params.q) search.set("q", params.q)
  if (params.level) search.set("filter[level]", params.level)
  if (params.language) search.set("filter[language]", params.language)
  if (params.maxFee) search.set("filter[max_fee]", params.maxFee)
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

export function getSitePosts(params: { type?: string; q?: string; page?: number } = {}) {
  const search = new URLSearchParams()
  if (params.type) search.set("type", params.type)
  if (params.q) search.set("q", params.q)
  if (params.page && params.page > 1) search.set("page", String(params.page))
  const qs = search.toString()

  return siteApi<Paginated<SitePost>>(`/public/posts${qs ? `?${qs}` : ""}`)
}

export const getSitePost = (slug: string) =>
  siteApi<{ data: SitePost }>(`/public/posts/${slug}`)

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

export const postEnquiry = (payload: EnquiryPayload) =>
  siteApi<{ message: string }>("/public/enquiries", { method: "POST", body: JSON.stringify(payload) })

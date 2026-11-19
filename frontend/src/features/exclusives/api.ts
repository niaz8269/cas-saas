import type { Paginated } from "@/features/catalog/api"
import { api, downloadFile } from "@/lib/api"

export type AgencyLevel = "partner" | "sub" | "sub_sub"

export const AGENCY_LEVELS: { value: AgencyLevel; label: string }[] = [
  { value: "partner", label: "Partner agency" },
  { value: "sub", label: "Sub-agency" },
  { value: "sub_sub", label: "Sub-sub-agency" },
]

export const MATERIAL_CATEGORIES = [
  { value: "brochure", label: "Brochure" },
  { value: "banner", label: "Banner / poster" },
  { value: "social", label: "Social media post" },
  { value: "video", label: "Video" },
  { value: "price_list", label: "Price list" },
  { value: "contract", label: "Agreement / form" },
  { value: "other", label: "Other" },
]

/** The commission is a fixed amount in RMB (yuan) for each agency level. */
export interface CommissionRate {
  value: number
  currency?: string | null
}

export type Audience = "partners" | "private"

export const AUDIENCES: { value: Audience; label: string; hint: string }[] = [
  { value: "partners", label: "Partners", hint: "Approved agencies and the CAS team can see it" },
  { value: "private", label: "Private", hint: "Only the CAS team (admins and counselors) can see it" },
]

export interface FeeRow {
  label: string
  amount?: number | string | null
  currency?: string | null
  note?: string | null
}

export interface ExclusiveMaterial {
  id: number
  exclusive_offer_id: number | null
  title: string
  description: string | null
  category: string
  original_name: string
  mime: string | null
  size: number
  created_at: string | null
  download_count?: number
}

export type ExclusiveType = "university" | "program" | "scholarship" | "other"

/** Name lookups for the pickers: the server matches every word against the name and the university, 50 at a time. */
export interface LookupResult {
  total: number
  data: { id: number; label: string }[]
}

const lookup = (type: "university" | "program" | "scholarship") => (q: string) =>
  api<LookupResult>(`/exclusives/lookup?type=${type}${q ? `&q=${encodeURIComponent(q)}` : ""}`)

export const searchUniversities = lookup("university")
export const searchPrograms = lookup("program")
export const searchScholarships = lookup("scholarship")

export interface ExclusiveOffer {
  id: number
  title: string
  slug: string
  offer_type: ExclusiveType
  audience?: Audience
  summary: string | null
  university: { id: number; name: string; slug: string; city: string | null; province?: string | null; logo_url?: string | null; emblem_url?: string | null; cover_url?: string | null; cover_thumb_url?: string | null } | null
  program: { id: number; name: string; level: string } | null
  scholarship?: { id: number; name: string } | null
  commission_notes: string | null
  fee_structure: FeeRow[]
  fee_notes: string | null
  eligible_nationalities: string[]
  restricted_nationalities: string[]
  nationality_notes: string | null
  conditions: string | null
  published_at: string | null
  updated_at: string | null
  materials?: ExclusiveMaterial[]
  materials_count?: number
  // Staff view
  status?: "draft" | "published"
  sort_order?: number
  university_id?: number | null
  program_id?: number | null
  scholarship_id?: number | null
  commission_rates?: Partial<Record<AgencyLevel, CommissionRate>>
  // Agency view
  commission?: CommissionRate | null
  agency_level?: AgencyLevel
}

export interface ExclusiveWritePayload {
  title: string
  offer_type: ExclusiveType
  audience: Audience
  university_id: number | null
  program_id: number | null
  scholarship_id: number | null
  summary: string
  commission_rates: Partial<Record<AgencyLevel, { value: number | string }>>
  commission_notes: string
  fee_structure: FeeRow[]
  fee_notes: string
  eligible_nationalities: string[]
  restricted_nationalities: string[]
  nationality_notes: string
  conditions: string
  status: "draft" | "published"
  sort_order: number
}

/** "3,000 RMB", the way a commission is read. */
export function formatCommission(rate: CommissionRate | null | undefined): string {
  if (!rate) return ""

  return `${Number(rate.value).toLocaleString("en-US")} RMB`
}

export const formatBytes = (n: number) => (n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

const qs = (params: Record<string, string | number | undefined>) => {
  const s = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") s.set(k, String(v))
  const out = s.toString()

  return out ? `?${out}` : ""
}

export const listExclusives = (params: { q?: string; status?: string; audience?: string; page?: number } = {}) =>
  api<Paginated<ExclusiveOffer>>(`/exclusives${qs({ "q": params.q, "filter[status]": params.status, "filter[audience]": params.audience, "page": params.page && params.page > 1 ? params.page : undefined })}`)

export const getExclusive = (id: number) => api<{ data: ExclusiveOffer }>(`/exclusives/${id}`)

export const createExclusive = (payload: ExclusiveWritePayload) =>
  api<{ data: ExclusiveOffer }>("/exclusives", { method: "POST", body: JSON.stringify(payload) })

export const updateExclusive = (id: number, payload: ExclusiveWritePayload) =>
  api<{ data: ExclusiveOffer }>(`/exclusives/${id}`, { method: "PUT", body: JSON.stringify(payload) })

export const deleteExclusive = (id: number) => api<{ message: string }>(`/exclusives/${id}`, { method: "DELETE" })

export const listLibrary = () => api<{ data: ExclusiveMaterial[] }>("/exclusives/library")

export function uploadMaterial(offerId: number | null, input: { title: string; description?: string; category: string; file: File }) {
  const form = new FormData()
  form.append("title", input.title)
  if (input.description) form.append("description", input.description)
  form.append("category", input.category)
  form.append("file", input.file)

  return api<{ data: ExclusiveMaterial }>(offerId ? `/exclusives/${offerId}/materials` : "/exclusive-materials", { method: "POST", body: form })
}

export const deleteMaterial = (id: number) => api<{ message: string }>(`/exclusive-materials/${id}`, { method: "DELETE" })

export const downloadMaterial = (m: ExclusiveMaterial) => downloadFile(`/exclusive-materials/${m.id}/download`, m.original_name)

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

export interface CommissionRate {
  type: "percent" | "fixed"
  value: number
  currency: string | null
}

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

export interface ExclusiveOffer {
  id: number
  title: string
  slug: string
  offer_type: "university" | "program" | "other"
  summary: string | null
  university: { id: number; name: string; slug: string; city: string | null } | null
  program: { id: number; name: string; level: string } | null
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
  commission_rates?: Partial<Record<AgencyLevel, CommissionRate>>
  // Agency view
  commission?: CommissionRate | null
  agency_level?: AgencyLevel
}

export interface ExclusiveWritePayload {
  title: string
  offer_type: "university" | "program" | "other"
  university_id: number | null
  program_id: number | null
  summary: string
  commission_rates: Partial<Record<AgencyLevel, { type: "percent" | "fixed"; value: number | string; currency?: string | null }>>
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

/** "10%" or "300 USD", the way a commission is read. */
export function formatCommission(rate: CommissionRate | null | undefined): string {
  if (!rate) return ""

  return rate.type === "percent" ? `${rate.value}%` : `${Number(rate.value).toLocaleString("en-US")} ${rate.currency ?? ""}`.trim()
}

export const formatBytes = (n: number) => (n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

const qs = (params: Record<string, string | number | undefined>) => {
  const s = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") s.set(k, String(v))
  const out = s.toString()

  return out ? `?${out}` : ""
}

export const listExclusives = (params: { q?: string; status?: string; page?: number } = {}) =>
  api<Paginated<ExclusiveOffer>>(`/exclusives${qs({ "q": params.q, "filter[status]": params.status, "page": params.page && params.page > 1 ? params.page : undefined })}`)

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

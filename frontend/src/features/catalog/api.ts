import { api } from "@/lib/api"

export interface University {
  id: number
  name: string
  code: string
  city: string | null
  website: string | null
  status: "active" | "inactive"
  country?: { id: number; name: string; iso2: string }
  courses_count?: number
  intakes_count?: number
  scholarships_count?: number
  agreements_count?: number
  created_at?: string
}

export interface Paginated<T> {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    from: number | null
    to: number | null
  }
}

export interface UniversityListParams {
  q?: string
  status?: string
  page?: number
}

export function listUniversities(params: UniversityListParams = {}) {
  const search = new URLSearchParams()
  if (params.q) search.set("q", params.q)
  if (params.status) search.set("filter[status]", params.status)
  if (params.page && params.page > 1) search.set("page", String(params.page))

  const qs = search.toString()

  return api<Paginated<University>>(`/universities${qs ? `?${qs}` : ""}`)
}

export interface UniversityPayload {
  name: string
  code: string
  city?: string
  website?: string
  status?: "active" | "inactive"
}

export function createUniversity(payload: UniversityPayload) {
  return api<{ data: University }>("/universities", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

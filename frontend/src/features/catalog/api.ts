import { api } from "@/lib/api"

export interface RepresentativeProfessor {
  name?: string | null
  title?: string | null
  photo?: string | null
  photo_url?: string | null
}

export interface University {
  id: number
  name: string
  code: string
  slug: string | null
  city: string | null
  address: string | null
  website: string | null
  apply_link: string | null
  logo_path: string | null
  cover_path: string | null
  logo_url: string | null
  cover_url: string | null
  status: "active" | "inactive"
  moe_listed: boolean
  nearest_airport: string | null
  about: string | null
  requirements: string[]
  representative_professor: RepresentativeProfessor | null
  country?: { id: number; name: string; iso2: string }
  programs_count?: number
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
  slug?: string
  city?: string
  address?: string
  website?: string
  apply_link?: string
  logo_path?: string
  cover_path?: string
  status?: "active" | "inactive"
  moe_listed?: boolean
  nearest_airport?: string
  about?: string
  requirements?: string[]
  representative_professor?: RepresentativeProfessor | null
}

export function createUniversity(payload: UniversityPayload) {
  return api<{ data: University }>("/universities", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function updateUniversity(id: number | string, payload: Partial<UniversityPayload>) {
  return api<{ data: University }>(`/universities/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

/** Upload a catalog image; the server converts it to WebP and stores it. */
export async function uploadImage(file: File): Promise<{ path: string; url: string | null }> {
  const form = new FormData()
  form.append("image", file)

  // FormData sets its own multipart boundary — do not pass a JSON body.
  return api<{ path: string; url: string | null }>("/uploads/images", { method: "POST", body: form })
}

// ── Detail page resources ──────────────────────────────────────────────

export interface UniversityContact {
  id: number
  name: string
  email: string | null
  phone: string | null
  role: string | null
}

export interface UniversityDetail extends University {
  contacts: UniversityContact[]
}

export function getUniversity(id: number | string) {
  return api<{ data: UniversityDetail }>(`/universities/${id}`)
}

export interface ServiceChargeTier {
  student?: number | string | null
  agent?: number | string | null
}

export interface ServiceCharges {
  currency?: string | null
  self?: ServiceChargeTier | null
  scholarship?: ServiceChargeTier | null
  partial?: ServiceChargeTier | null
}

export interface Program {
  id: number
  university_id: number
  name: string
  level: "bachelor" | "master" | "phd"
  duration_months: number | null
  tuition_fee: string | number | null
  currency: string | null
  teaching_language: string | null
  apply_link: string | null
  service_charges: ServiceCharges | null
  status: string
}

export interface Intake {
  id: number
  university_id: number
  program_id: number | null
  program?: { id: number; name: string; level: string } | null
  name: string
  start_date: string | null
  application_deadline: string | null
  seats: number | null
  status: string
}

export interface Scholarship {
  id: number
  university_id: number
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
  status: string
}

export interface Agreement {
  id: number
  university_id: number
  program_id: number | null
  program?: { id: number; name: string } | null
  commission_type: "fixed" | "percent" | "tiered"
  commission_value: string | number
  currency: string | null
  eligibility_trigger: string
  valid_from: string | null
  valid_to: string | null
}

const byUniversity = (resource: string, universityId: number | string) =>
  `/${resource}?filter[university_id]=${universityId}&per_page=100`

export const listPrograms = (universityId: number | string) =>
  api<Paginated<Program>>(byUniversity("programs", universityId))

export const listIntakes = (universityId: number | string) =>
  api<Paginated<Intake>>(byUniversity("intakes", universityId))

export const listScholarships = (universityId: number | string) =>
  api<Paginated<Scholarship>>(byUniversity("scholarships", universityId))

export const listAgreements = (universityId: number | string) =>
  api<Paginated<Agreement>>(byUniversity("agreements", universityId))

export const createProgram = (payload: Record<string, unknown>) =>
  api<{ data: Program }>("/programs", { method: "POST", body: JSON.stringify(payload) })

export const updateProgram = (id: number, payload: Record<string, unknown>) =>
  api<{ data: Program }>(`/programs/${id}`, { method: "PATCH", body: JSON.stringify(payload) })

export const createIntake = (payload: Record<string, unknown>) =>
  api<{ data: Intake }>("/intakes", { method: "POST", body: JSON.stringify(payload) })

export const createScholarship = (payload: Record<string, unknown>) =>
  api<{ data: Scholarship }>("/scholarships", { method: "POST", body: JSON.stringify(payload) })

export const updateScholarship = (id: number, payload: Record<string, unknown>) =>
  api<{ data: Scholarship }>(`/scholarships/${id}`, { method: "PATCH", body: JSON.stringify(payload) })

export const createAgreement = (payload: Record<string, unknown>) =>
  api<{ data: Agreement }>("/agreements", { method: "POST", body: JSON.stringify(payload) })

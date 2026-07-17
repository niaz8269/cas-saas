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

export interface Course {
  id: number
  university_id: number
  name: string
  level: "bachelor" | "master" | "phd"
  duration_months: number | null
  tuition_fee: string | number | null
  currency: string | null
  status: string
}

export interface Intake {
  id: number
  university_id: number
  course_id: number | null
  course?: { id: number; name: string; level: string } | null
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
  type: string | null
  coverage: string | null
  deadline: string | null
  status: string
}

export interface Agreement {
  id: number
  university_id: number
  course_id: number | null
  course?: { id: number; name: string } | null
  commission_type: "fixed" | "percent" | "tiered"
  commission_value: string | number
  currency: string | null
  eligibility_trigger: string
  valid_from: string | null
  valid_to: string | null
}

const byUniversity = (resource: string, universityId: number | string) =>
  `/${resource}?filter[university_id]=${universityId}&per_page=100`

export const listCourses = (universityId: number | string) =>
  api<Paginated<Course>>(byUniversity("courses", universityId))

export const listIntakes = (universityId: number | string) =>
  api<Paginated<Intake>>(byUniversity("intakes", universityId))

export const listScholarships = (universityId: number | string) =>
  api<Paginated<Scholarship>>(byUniversity("scholarships", universityId))

export const listAgreements = (universityId: number | string) =>
  api<Paginated<Agreement>>(byUniversity("agreements", universityId))

export const createCourse = (payload: Record<string, unknown>) =>
  api<{ data: Course }>("/courses", { method: "POST", body: JSON.stringify(payload) })

export const createIntake = (payload: Record<string, unknown>) =>
  api<{ data: Intake }>("/intakes", { method: "POST", body: JSON.stringify(payload) })

export const createScholarship = (payload: Record<string, unknown>) =>
  api<{ data: Scholarship }>("/scholarships", { method: "POST", body: JSON.stringify(payload) })

export const createAgreement = (payload: Record<string, unknown>) =>
  api<{ data: Agreement }>("/agreements", { method: "POST", body: JSON.stringify(payload) })

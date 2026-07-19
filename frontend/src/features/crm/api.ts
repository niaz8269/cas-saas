import { api } from "@/lib/api"
import type { Paginated } from "@/features/catalog/api"

export interface LeadListItem {
  id: number
  first_name: string | null
  last_name: string | null
  full_name: string
  email: string | null
  phone: string | null
  status: string
  intake_route: string
  form_type: string | null
  form_fields: Record<string, string>
  message: string | null
  country?: { id: number; name: string; iso2: string }
  website_source?: { id: number; domain: string } | null
  campaign?: { id: number; name: string } | null
  assignee?: { id: number; name: string } | null
  student_id: number | null
  duplicate_of: number | null
  review: boolean
  created_at: string | null
}

export interface StudentSummary {
  id: number
  student_code: string
  full_name: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  passport_no: string | null
  dob: string | null
  gender: string | null
  status: string
  country?: { id: number; name: string; iso2: string } | null
  branch?: { id: number; name: string; code: string } | null
  agent?: { id: number; name: string; agent_code: string } | null
  counselor?: { id: number; name: string } | null
  guardians?: Guardian[]
  created_at: string | null
}

export interface Guardian {
  id: number
  name: string
  relation: string | null
  phone: string | null
  email: string | null
}

export interface GuardianPayload {
  name: string
  relation?: string | null
  phone?: string | null
  email?: string | null
}

export interface ActivityItem {
  id: number
  type: string
  body: string | null
  meta: Record<string, unknown> | null
  user?: { id: number; name: string } | null
  created_at: string | null
}

export interface LeadListParams {
  q?: string
  status?: string
  page?: number
}

export function listLeads(params: LeadListParams = {}) {
  const search = new URLSearchParams()
  if (params.q) search.set("q", params.q)
  if (params.status) search.set("filter[status]", params.status)
  if (params.page && params.page > 1) search.set("page", String(params.page))
  const qs = search.toString()

  return api<Paginated<LeadListItem>>(`/leads${qs ? `?${qs}` : ""}`)
}

export const getLead = (id: number | string) => api<{ data: LeadListItem }>(`/leads/${id}`)

export const updateLead = (id: number | string, payload: Record<string, unknown>) =>
  api<{ data: LeadListItem }>(`/leads/${id}`, { method: "PATCH", body: JSON.stringify(payload) })

export const assignLead = (id: number | string, userId: number) =>
  api<{ data: LeadListItem }>(`/leads/${id}/assign`, {
    method: "POST",
    body: JSON.stringify({ assigned_user_id: userId }),
  })

export const convertLead = (id: number | string) =>
  api<{ data: StudentSummary }>(`/leads/${id}/convert`, { method: "POST", body: JSON.stringify({}) })

/** Staff directory (requires users.manage.global — used by assigners). */
export const listStaff = () =>
  api<Paginated<{ id: number; name: string; email: string }>>("/users?per_page=100")

export interface LeadSource {
  id: number
  name: string
  channel: string | null
}

export const listLeadSources = () => api<{ data: LeadSource[] }>("/leads/sources")

export interface CreateLeadPayload {
  first_name: string
  last_name?: string
  email?: string
  phone?: string
  marketing_source_id?: number | null
  assigned_user_id?: number | null
  intake_route?: "info" | "full"
  message?: string
}

export const createLead = (payload: CreateLeadPayload) =>
  api<{ data: LeadListItem }>("/leads", { method: "POST", body: JSON.stringify(payload) })

// ── Students ───────────────────────────────────────────────────────────

export interface StudentListParams {
  q?: string
  status?: string
  page?: number
}

export function listStudents(params: StudentListParams = {}) {
  const search = new URLSearchParams()
  if (params.q) search.set("q", params.q)
  if (params.status) search.set("filter[status]", params.status)
  if (params.page && params.page > 1) search.set("page", String(params.page))
  const qs = search.toString()

  return api<Paginated<StudentSummary>>(`/students${qs ? `?${qs}` : ""}`)
}

export const getStudent = (id: number | string) => api<{ data: StudentSummary }>(`/students/${id}`)

export const updateStudent = (id: number | string, payload: Record<string, unknown>) =>
  api<{ data: StudentSummary }>(`/students/${id}`, { method: "PATCH", body: JSON.stringify(payload) })

export const getTimeline = (id: number | string) =>
  api<Paginated<ActivityItem>>(`/students/${id}/timeline?per_page=50`)

export const addNote = (id: number | string, body: string) =>
  api<{ data: ActivityItem }>(`/students/${id}/notes`, {
    method: "POST",
    body: JSON.stringify({ body }),
  })

// ── Guardians ──────────────────────────────────────────────────────────

export const addGuardian = (studentId: number | string, payload: GuardianPayload) =>
  api<{ data: Guardian }>(`/students/${studentId}/guardians`, {
    method: "POST",
    body: JSON.stringify(payload),
  })

export const updateGuardian = (studentId: number | string, guardianId: number, payload: GuardianPayload) =>
  api<{ data: Guardian }>(`/students/${studentId}/guardians/${guardianId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })

export const deleteGuardian = (studentId: number | string, guardianId: number) =>
  api<{ message: string }>(`/students/${studentId}/guardians/${guardianId}`, { method: "DELETE" })

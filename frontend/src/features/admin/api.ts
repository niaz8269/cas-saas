import { api } from "@/lib/api"
import type { Paginated } from "@/features/catalog/api"

export interface StaffUser {
  id: number
  name: string
  email: string
  phone: string | null
  status: string
  roles: string[]
  branch?: { id: number; name: string; code: string }
  department?: { id: number; name: string; code: string }
  last_login_at: string | null
}

export interface AuditEntry {
  id: number
  action: "create" | "update" | "delete"
  entity_type: string
  entity_id: number
  actor: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip: string | null
  created_at: string | null
}

interface AuditList {
  data: AuditEntry[]
  meta: { current_page: number; last_page: number; total: number; from: number | null; to: number | null }
}

const qs = (params: Record<string, string | number | undefined>) => {
  const s = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") s.set(k, String(v))
  const out = s.toString()

  return out ? `?${out}` : ""
}

export const listUsers = (params: { q?: string; status?: string; page?: number } = {}) =>
  api<Paginated<StaffUser>>(`/users${qs({
    "q": params.q,
    "filter[status]": params.status,
    "page": params.page && params.page > 1 ? params.page : undefined,
  })}`)

export interface UserWritePayload {
  name: string
  email: string
  phone?: string | null
  password?: string
  branch_id?: number | null
  department_id?: number | null
  status?: string
  roles?: string[]
}

export const createUser = (payload: UserWritePayload) =>
  api<{ data: StaffUser }>("/users", { method: "POST", body: JSON.stringify(payload) })

export const updateUser = (id: number, payload: Partial<UserWritePayload>) =>
  api<{ data: StaffUser }>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(payload) })

export const listRoles = () => api<{ data: { id: number; name: string }[] }>("/roles")

export interface RoleMatrix {
  permissions: string[]
  roles: { name: string; permissions: string[] }[]
}

export const getRoleMatrix = () => api<{ data: RoleMatrix }>("/roles/matrix")

export const listBranches = () =>
  api<{ data: { id: number; name: string; code: string }[] }>("/branches")

export const listDepartments = () =>
  api<{ data: { id: number; name: string; code: string }[] }>("/departments")

export const listAuditLogs = (params: { action?: string; entity?: string; page?: number } = {}) =>
  api<AuditList>(`/audit-logs${qs({
    "filter[action]": params.action,
    "filter[entity]": params.entity,
    "page": params.page && params.page > 1 ? params.page : undefined,
  })}`)

export interface AutomationRule {
  id: number
  name: string
  trigger_def: { event?: string; to?: string } | null
  conditions: Record<string, unknown> | null
  actions: { type?: string; channel?: string; template?: string; target?: string }[] | null
  is_active: boolean
}

export interface MessageTemplate {
  key: string
  subject: string
  preview: string
}

export const listAutomationRules = () => api<{ data: AutomationRule[] }>("/automation-rules")

export const listMessageTemplates = () => api<{ data: MessageTemplate[] }>("/message-templates")

export interface TemplateTestResult {
  template: string
  channel: string
  to: string
  subject: string
  body: string
  status: string
}

export const testMessageTemplate = (key: string, payload: { channel: string; to?: string }) =>
  api<{ data: TemplateTestResult }>(`/message-templates/${key}/test`, {
    method: "POST",
    body: JSON.stringify(payload),
  })

// ---- Integrations: ingestion sources + API keys ----

export interface ApiKeyItem {
  id: number
  label: string
  rate_limit: number
  active: boolean
  revoked_at: string | null
  created_at: string | null
}

export interface ApiSourceItem {
  id: number
  name: string
  type: string
  website_url: string | null
  is_active: boolean
  university: { id: number; name: string } | null
  default_program: { id: number; name: string; level: string } | null
  active_keys_count?: number
  keys?: ApiKeyItem[]
  created_at: string | null
}

export interface ApiSourcePayload {
  name: string
  type: string
  website_url?: string | null
  university_id?: number | null
  default_program_id?: number | null
  is_active?: boolean
}

export function listApiSources(params: { q?: string; page?: number } = {}) {
  return api<Paginated<ApiSourceItem>>(
    `/api-sources${qs({ q: params.q, page: params.page && params.page > 1 ? params.page : undefined })}`,
  )
}

export const createApiSource = (payload: ApiSourcePayload) =>
  api<{ data: ApiSourceItem }>("/api-sources", { method: "POST", body: JSON.stringify(payload) })

export const updateApiSource = (id: number, payload: Partial<ApiSourcePayload>) =>
  api<{ data: ApiSourceItem }>(`/api-sources/${id}`, { method: "PATCH", body: JSON.stringify(payload) })

export const deleteApiSource = (id: number) =>
  api<undefined>(`/api-sources/${id}`, { method: "DELETE" })

export const createApiKey = (sourceId: number, rate_limit?: number) =>
  api<{ plain_key: string; source: ApiSourceItem; key_id: number }>(`/api-sources/${sourceId}/keys`, {
    method: "POST",
    body: JSON.stringify({ rate_limit }),
  })

export const revokeApiKey = (sourceId: number, keyId: number) =>
  api<undefined>(`/api-sources/${sourceId}/keys/${keyId}`, { method: "DELETE" })

// ---- Error monitor ----

export interface ErrorLogItem {
  id: number
  level: string
  type: string | null
  message: string
  file: string | null
  line: number | null
  url: string | null
  method: string | null
  status: number | null
  actor: string | null
  ip: string | null
  user_agent: string | null
  occurrences: number
  first_seen_at: string | null
  last_seen_at: string | null
  resolved: boolean
  resolved_at: string | null
  resolved_by?: string | null
  context?: { trace?: string[]; previous?: string } | null
}

interface ErrorLogList {
  data: ErrorLogItem[]
  meta: { current_page: number; last_page: number; total: number; from: number | null; to: number | null }
  stats: { unresolved: number; last_24h: number }
}

export function listErrorLogs(params: { status?: string; level?: string; q?: string; page?: number } = {}) {
  return api<ErrorLogList>(`/error-logs${qs({
    "filter[status]": params.status,
    "filter[level]": params.level,
    q: params.q,
    page: params.page && params.page > 1 ? params.page : undefined,
  })}`)
}

export const getErrorLog = (id: number) => api<{ data: ErrorLogItem }>(`/error-logs/${id}`)

export const resolveErrorLog = (id: number) =>
  api<{ data: ErrorLogItem }>(`/error-logs/${id}/resolve`, { method: "POST" })

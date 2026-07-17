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

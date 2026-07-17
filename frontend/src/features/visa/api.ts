import { api } from "@/lib/api"
import type { Paginated } from "@/features/catalog/api"

export interface VisaChecklistItemData {
  id: number
  name: string
  is_required: boolean
  status: "pending" | "received" | "verified"
  document_id: number | null
}

export interface VisaCaseItemData {
  id: number
  status: string
  appointment_at: string | null
  submitted_at: string | null
  decision_at: string | null
  travel_ready_at: string | null
  student?: { id: number; student_code: string; full_name: string }
  application?: {
    id: number
    application_code: string
    status: string
    university?: { id: number; name: string } | null
  }
  officer?: { id: number; name: string } | null
  checklist?: VisaChecklistItemData[]
  status_history?: {
    from_status: string | null
    to_status: string
    note: string | null
    changed_by: string | null
    created_at: string | null
  }[]
  created_at: string | null
}

export type VisaPipelineMeta = Record<string, number>

const qs = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value))
  }
  const s = search.toString()

  return s ? `?${s}` : ""
}

export const listVisaCases = (params: { status?: string; q?: string; page?: number } = {}) =>
  api<Paginated<VisaCaseItemData> & { pipeline: VisaPipelineMeta }>(`/visa-cases${qs({
    "q": params.q,
    "filter[status]": params.status,
    "page": params.page && params.page > 1 ? params.page : undefined,
  })}`)

export const getVisaCase = (id: number | string) => api<{ data: VisaCaseItemData }>(`/visa-cases/${id}`)

export const transitionVisaCase = (
  id: number | string,
  payload: { status: string; note?: string; appointment_at?: string },
) =>
  api<{ data: VisaCaseItemData }>(`/visa-cases/${id}/transition`, {
    method: "POST",
    body: JSON.stringify(payload),
  })

export const updateVisaChecklistItem = (
  caseId: number | string,
  itemId: number,
  payload: { status: "pending" | "received" | "verified"; document_id?: number },
) =>
  api<{ data: VisaChecklistItemData }>(`/visa-cases/${caseId}/checklist/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })

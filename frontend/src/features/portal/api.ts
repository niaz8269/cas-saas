import { portalApi } from "@/lib/portalApi"
import type { PortalKind } from "@/stores/portalAuth"

// ── Auth ─────────────────────────────────────────────────────────────────

export interface AgentProfileData {
  id: number
  agent_code: string
  name: string
  type: string
  email: string | null
  phone: string | null
  status: string
  last_login_at: string | null
}

export interface StudentProfileData {
  id: number
  student_code: string
  first_name: string
  last_name: string
  full_name: string
  email: string | null
  phone: string | null
  status: string
  country?: { id: number; name: string } | null
  last_login_at: string | null
}

export const portalLogin = (kind: PortalKind, payload: { email: string; password: string }) =>
  portalApi<{ token: string; token_type: string } & Record<string, unknown>>(
    `/${kind}/auth/login`,
    { method: "POST", body: JSON.stringify({ ...payload, device_name: `cas-${kind}-portal` }) },
  )

export const portalLogout = (kind: PortalKind) =>
  portalApi<{ message: string }>(`/${kind}/auth/logout`, { method: "POST" })

// ── Agent reads ──────────────────────────────────────────────────────────

export interface Paginated<T> {
  data: T[]
  meta: { current_page: number; last_page: number; per_page: number; total: number; from: number; to: number }
}

export interface AgentStudentRow {
  id: number
  student_code: string
  full_name: string
  status: string
  country: string | null
  applications_count: number
  created_at: string | null
}

export interface AgentApplicationRow {
  id: number
  application_code: string
  status: string
  submitted_at: string | null
  student?: { id: number; student_code: string; full_name: string }
  university: string | null
  course: { name: string; level: string } | null
  intake: string | null
}

export interface AgentPayableRow {
  id: number
  amount: string | number
  currency: string
  status: "payable" | "paid"
  computed_at: string | null
  student: { student_code: string; full_name: string } | null
  university: string | null
}

export const getAgentStudents = (params: { status?: string; page?: number } = {}) =>
  portalApi<Paginated<AgentStudentRow>>(`/agent/students${query(params)}`)

export const getAgentApplications = (params: { status?: string; page?: number } = {}) =>
  portalApi<Paginated<AgentApplicationRow>>(`/agent/applications${query(params)}`)

export const getAgentCommissions = (params: { status?: string; page?: number } = {}) =>
  portalApi<Paginated<AgentPayableRow> & { totals: Record<string, number> }>(`/agent/commissions${query(params)}`)

// ── Student reads ────────────────────────────────────────────────────────

export interface StudentApplicationRow {
  id: number
  application_code: string
  status: string
  submitted_at: string | null
  university: string | null
  course: { name: string; level: string } | null
  intake: string | null
  offers?: { offer_type: string; reference_no: string | null; issued_date: string | null; expiry_date: string | null; status: string }[]
  progress?: { status: string; at: string | null }[]
}

export interface StudentVisaCase {
  id: number
  status: string
  appointment_at: string | null
  submitted_at: string | null
  decision_at: string | null
  travel_ready_at: string | null
  application_code: string | null
  checklist?: { name: string; is_required: boolean; status: string }[]
}

export interface StudentInvoiceRow {
  id: number
  invoice_no: string
  currency: string
  subtotal: string | number
  tax: string | number
  total: string | number
  amount_paid: string | number
  status: string
  issued_at: string | null
  due_at: string | null
  items?: { description: string; qty: string | number; unit_price: string | number; amount: string | number }[]
  receipts?: { payment_no: string; amount: string | number; method: string | null; received_at: string | null }[]
}

export interface StudentDocumentRow {
  id: number
  file_name: string
  mime: string | null
  size: number | null
  status: string
  version: number
  type: { id: number; name: string; category: string | null } | null
  uploaded_at: string | null
}

export const getStudentApplications = () =>
  portalApi<{ data: StudentApplicationRow[] }>("/student/applications")

export const getStudentVisaCase = () =>
  portalApi<{ data: StudentVisaCase }>("/student/visa-case")

export const getStudentInvoices = () =>
  portalApi<{ data: StudentInvoiceRow[] }>("/student/invoices")

export const getStudentDocuments = () =>
  portalApi<{ data: StudentDocumentRow[] }>("/student/documents")

export interface DocumentTypeRow {
  id: number
  name: string
  category: string | null
}

export const getStudentDocumentTypes = () =>
  portalApi<{ data: DocumentTypeRow[] }>("/student/document-types")

interface PresignResponse {
  key: string
  url: string
  headers: Record<string, string>
  expires_at: string
}

/**
 * The portal's one write path: presign → direct PUT to storage → register.
 * The browser must reach the storage endpoint the API signs (MinIO locally).
 */
export async function uploadStudentDocument(
  documentTypeId: number,
  file: File,
): Promise<StudentDocumentRow> {
  const meta = { document_type_id: documentTypeId, file_name: file.name, mime: file.type, size: file.size }

  const presign = await portalApi<PresignResponse>("/student/documents/presign", {
    method: "POST",
    body: JSON.stringify(meta),
  })

  const put = await fetch(presign.url, { method: "PUT", headers: presign.headers, body: file })
  if (!put.ok) throw new Error("Upload to storage failed.")

  const registered = await portalApi<{ data: StudentDocumentRow }>("/student/documents", {
    method: "POST",
    body: JSON.stringify({ ...meta, key: presign.key }),
  })

  return registered.data
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue
    search.set(key === "status" ? "filter[status]" : key, String(value))
  }
  const s = search.toString()

  return s ? `?${s}` : ""
}

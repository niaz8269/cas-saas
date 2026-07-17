import { api, apiBlob } from "@/lib/api"
import type { Paginated } from "@/features/catalog/api"

export interface InvoiceItemRow {
  id: number
  description: string
  qty: string | number
  unit_price: string | number
  amount: string | number
}

export interface PaymentRow {
  id: number
  payment_no: string
  amount: string | number
  method: string | null
  reference: string | null
  received_at: string | null
  recorded_by?: string | null
}

export interface InvoiceItemData {
  id: number
  invoice_no: string
  party_type: "student" | "agent" | "university"
  party_id: number
  party_name?: string | null
  application?: { id: number; application_code: string; student?: { id: number; full_name: string } | null } | null
  currency: string
  subtotal: string | number
  tax: string | number
  total: string | number
  amount_paid: string | number
  status: string
  issued_at: string | null
  due_at: string | null
  items?: InvoiceItemRow[]
  payments?: PaymentRow[]
  created_at: string | null
}

export interface CommissionItemData {
  id: number
  status: string
  currency: string
  expected_amount: string | number
  eligible_amount: string | number
  invoiced_amount: string | number
  received_amount: string | number
  eligibility_confirmed_at: string | null
  application?: {
    id: number
    application_code: string
    status: string
    student?: { id: number; full_name: string; student_code: string } | null
  }
  university?: { id: number; name: string; code: string }
  agreement?: { id: number; commission_type: string; commission_value: string | number } | null
  status_history?: {
    from_status: string | null
    to_status: string
    amount: string | number | null
    reference: string | null
    changed_by: string | null
    created_at: string | null
  }[]
  payables?: PayableItemData[]
  created_at: string | null
}

export interface PayableItemData {
  id: number
  commission_id: number
  agent?: { id: number; name: string; agent_code: string; type: string }
  student?: { id: number; full_name: string }
  amount: string | number
  currency: string
  status: "payable" | "paid"
  computed_at: string | null
  payments?: { id: number; amount: string | number; method: string | null; reference: string | null; paid_at: string | null }[]
}

export type PipelineMeta = Record<string, { count: number; expected_total: number }>

const qs = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value))
  }
  const s = search.toString()

  return s ? `?${s}` : ""
}

export const listInvoices = (params: { q?: string; status?: string; party_type?: string; page?: number } = {}) =>
  api<Paginated<InvoiceItemData>>(`/invoices${qs({
    "q": params.q,
    "filter[status]": params.status,
    "filter[party_type]": params.party_type,
    "page": params.page && params.page > 1 ? params.page : undefined,
  })}`)

export const getInvoice = (id: number | string) => api<{ data: InvoiceItemData }>(`/invoices/${id}`)

/** Fetch the branded invoice PDF as a Blob (bearer-auth, streamed inline). */
export const getInvoicePdf = (id: number | string) => apiBlob(`/invoices/${id}/pdf`)

export const recordInvoicePayment = (id: number | string, payload: { amount: number; method?: string; reference?: string }) =>
  api<{ data: InvoiceItemData }>(`/invoices/${id}/payments`, { method: "POST", body: JSON.stringify(payload) })

export const listCommissions = (params: { status?: string; page?: number } = {}) =>
  api<Paginated<CommissionItemData> & { pipeline: PipelineMeta }>(`/commissions${qs({
    "filter[status]": params.status,
    "page": params.page && params.page > 1 ? params.page : undefined,
  })}`)

export const getCommission = (id: number | string) => api<{ data: CommissionItemData }>(`/commissions/${id}`)

export const transitionCommission = (
  id: number | string,
  payload: { status: string; note?: string; reference?: string; amount?: number },
) =>
  api<{ data: CommissionItemData }>(`/commissions/${id}/transition`, {
    method: "POST",
    body: JSON.stringify(payload),
  })

export const listPayables = (params: { status?: string; page?: number } = {}) =>
  api<Paginated<PayableItemData>>(`/agent-payables${qs({
    "filter[status]": params.status,
    "page": params.page && params.page > 1 ? params.page : undefined,
  })}`)

export const payPayable = (id: number, payload: { reference: string; method?: string }) =>
  api<{ data: PayableItemData }>(`/agent-payables/${id}/pay`, { method: "POST", body: JSON.stringify(payload) })

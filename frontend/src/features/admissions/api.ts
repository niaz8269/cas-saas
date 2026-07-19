import { api, apiBlob } from "@/lib/api"
import type { Paginated } from "@/features/catalog/api"

export interface ApplicationPreference {
  major: string | null
  university_id: number | null
  university: string | null
}

export interface ApplicationListItem {
  id: number
  application_code: string
  kind: "program" | "scholarship"
  level: string | null
  preferences: ApplicationPreference[]
  status: string
  submitted_at: string | null
  student?: { id: number; student_code: string; full_name: string }
  university?: { id: number; name: string; code: string }
  program?: { id: number; name: string; level: string }
  intake?: { id: number; name: string } | null
  scholarship?: { id: number; name: string } | null
  admissions_officer?: { id: number; name: string } | null
  offers?: OfferItem[]
  status_history?: HistoryEntry[]
  documents_count?: number
  created_at: string | null
}

export interface OfferItem {
  id: number
  offer_type: string
  reference_no: string | null
  issued_date: string | null
  expiry_date: string | null
  status: string
}

export interface HistoryEntry {
  from_status: string | null
  to_status: string
  note: string | null
  changed_by: string | null
  created_at: string | null
}

export interface DocumentItem {
  id: number
  type?: { id: number; name: string; category: string | null; is_sensitive: boolean } | null
  file_name: string
  mime: string | null
  size: number | null
  status: "pending" | "verified" | "rejected"
  version: number
  verified_by?: string | null
  created_at: string | null
}

export interface DocumentTypeItem {
  id: number
  name: string
  category: string | null
  is_sensitive: boolean
  required_for: string[] | null
}

export function listApplications(params: { q?: string; status?: string; page?: number; student_id?: number } = {}) {
  const search = new URLSearchParams()
  if (params.q) search.set("q", params.q)
  if (params.status) search.set("filter[status]", params.status)
  if (params.student_id) search.set("filter[student_id]", String(params.student_id))
  if (params.page && params.page > 1) search.set("page", String(params.page))
  const qs = search.toString()

  return api<Paginated<ApplicationListItem>>(`/applications${qs ? `?${qs}` : ""}`)
}

export const getApplication = (id: number | string) =>
  api<{ data: ApplicationListItem; checklist: { missing: string[] } }>(`/applications/${id}`)

export const transitionApplication = (id: number | string, status: string, note?: string) =>
  api<{ data: ApplicationListItem }>(`/applications/${id}/transition`, {
    method: "POST",
    body: JSON.stringify({ status, note }),
  })

export const storeOffer = (id: number | string, payload: Record<string, unknown>) =>
  api<{ data: OfferItem }>(`/applications/${id}/offers`, {
    method: "POST",
    body: JSON.stringify(payload),
  })

/** Fetch the branded offer-letter PDF as a Blob (bearer-auth, streamed inline). */
export const getOfferLetter = (applicationId: number | string, offerId: number) =>
  apiBlob(`/applications/${applicationId}/offers/${offerId}/letter`)

/** Record the applicant's response to an offer (accept advances the application). */
export const respondToOffer = (
  applicationId: number | string,
  offerId: number,
  decision: "accepted" | "declined",
) =>
  api<{ data: OfferItem }>(`/applications/${applicationId}/offers/${offerId}/respond`, {
    method: "POST",
    body: JSON.stringify({ decision }),
  })

export const listApplicationDocuments = (id: number | string) =>
  api<{ data: DocumentItem[] }>(`/applications/${id}/documents`)

export const listStudentDocuments = (id: number | string) =>
  api<{ data: DocumentItem[] }>(`/students/${id}/documents`)

export const listDocumentTypes = () => api<{ data: DocumentTypeItem[] }>("/document-types")

// ── Presigned upload flow ──────────────────────────────────────────────

interface PresignPayload {
  documentable_type: "application" | "student"
  documentable_id: number
  document_type_id: number
  file_name: string
  mime: string
  size: number
}

export const presignDocument = (payload: PresignPayload) =>
  api<{ key: string; url: string; headers: Record<string, string>; expires_at: string }>(
    "/documents/presign",
    { method: "POST", body: JSON.stringify(payload) },
  )

export const registerDocument = (payload: PresignPayload & { key: string }) =>
  api<{ data: DocumentItem }>("/documents", { method: "POST", body: JSON.stringify(payload) })

/** Full browser-side upload: presign → PUT to storage → register. */
export async function uploadDocument(payload: PresignPayload, file: File): Promise<DocumentItem> {
  const presign = await presignDocument(payload)

  const put = await fetch(presign.url, {
    method: "PUT",
    headers: { "Content-Type": payload.mime },
    body: file,
  })

  if (!put.ok) {
    throw new Error(`Storage upload failed (HTTP ${put.status}).`)
  }

  const registered = await registerDocument({ ...payload, key: presign.key })

  return registered.data
}

export const downloadDocument = (id: number) =>
  api<{ url: string; expires_at: string }>(`/documents/${id}/download`)

export const verifyDocument = (id: number) =>
  api<{ data: DocumentItem }>(`/documents/${id}/verify`, { method: "POST", body: JSON.stringify({}) })

export const rejectDocument = (id: number) =>
  api<{ data: DocumentItem }>(`/documents/${id}/reject`, { method: "POST", body: JSON.stringify({}) })

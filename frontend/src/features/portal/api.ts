import { portalApi, portalApiBlob } from "@/lib/portalApi"
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
  email_verified: boolean
  phone: string | null
  status: string
  country?: { id: number; name: string } | null
  last_login_at: string | null
}

export const getStudentProfile = () => portalApi<{ data: StudentProfileData }>("/student/auth/me")

export const resendStudentVerification = () =>
  portalApi<{ message: string }>("/student/auth/verification/resend", { method: "POST" })

export const portalLogin = (kind: PortalKind, payload: { email: string; password: string }) =>
  portalApi<{ token: string; token_type: string } & Record<string, unknown>>(
    `/${kind}/auth/login`,
    { method: "POST", body: JSON.stringify({ ...payload, device_name: `cas-${kind}-portal` }) },
  )

export const portalLogout = (kind: PortalKind) =>
  portalApi<{ message: string }>(`/${kind}/auth/logout`, { method: "POST" })

export interface StudentRegisterPayload {
  first_name: string
  last_name: string
  email: string
  phone: string
  password: string
  password_confirmation: string
}

/** Public student self-registration; on success the student is signed in. */
export const portalRegister = (payload: StudentRegisterPayload) =>
  portalApi<{ token: string; token_type: string; student: StudentProfileData }>(
    "/student/auth/register",
    { method: "POST", body: JSON.stringify({ ...payload, device_name: "cas-student-portal" }) },
  )

export interface AgentRegisterPayload {
  company_name: string
  contact_name: string
  email: string
  phone: string
  website: string
  address: string
  country_id: number
  password: string
  password_confirmation: string
}

/** Public agent/partner registration; creates a PENDING request (no token). */
export const agentRegister = (payload: AgentRegisterPayload) =>
  portalApi<{ message: string; code: string }>(
    "/agent/auth/register",
    { method: "POST", body: JSON.stringify(payload) },
  )

/** Countries for the public sign-up forms (no auth required). */
export const getPublicCountries = () =>
  portalApi<{ data: CountryRow[] }>("/public/countries")

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
  program: { name: string; level: string } | null
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

export const getAgentStudents = (params: { status?: string; page?: number; q?: string } = {}) =>
  portalApi<Paginated<AgentStudentRow>>(`/agent/students${query(params)}`)

export const getAgentApplications = (params: { status?: string; page?: number } = {}) =>
  portalApi<Paginated<AgentApplicationRow>>(`/agent/applications${query(params)}`)

export const getAgentCommissions = (params: { status?: string; page?: number } = {}) =>
  portalApi<Paginated<AgentPayableRow> & { totals: Record<string, number> }>(`/agent/commissions${query(params)}`)

/** The agent's branded commission statement PDF, as a Blob. */
export const getAgentStatementPdf = () => portalApiBlob("/agent/commissions/statement")

// ── Student reads ────────────────────────────────────────────────────────

export interface StudentApplicationRow {
  id: number
  application_code: string
  status: string
  submitted_at: string | null
  university: string | null
  program: { name: string; level: string } | null
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

/** The branded invoice PDF for one of the student's own invoices, as a Blob. */
export const getStudentInvoicePdf = (id: number) =>
  portalApiBlob(`/student/invoices/${id}/pdf`)

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

// ── Application wizard (student self-apply) ────────────────────────────────

export type Degree = "master" | "bs" | "mbbs" | "bds" | "phd" | "diploma"
export type Funding = "self" | "scholarship" | "partial"

export interface WizardIntake {
  id: number
  name: string
  start_date: string | null
  application_deadline: string | null
}

export interface WizardScholarship {
  id: number
  name: string
  type: string | null
  coverage: string | null
}

export interface PortalCustomField {
  key: string
  label: string
  type: "text" | "textarea" | "number" | "date" | "select" | "radio"
  required: boolean
  options: string[]
}

export interface WizardProgram {
  id: number
  name: string
  level: string
  teaching_language: string | null
  duration_months: number | null
  tuition_fee: string | number | null
  hostel_fee: string | number | null
  currency: string | null
  service_charge: { amount: number; currency: string } | null
  custom_fields?: PortalCustomField[]
  university: {
    id: number
    name: string
    slug: string | null
    city: string | null
    country: string | null
    moe_listed: boolean
  }
  intakes: WizardIntake[]
  scholarships: WizardScholarship[]
}

export interface RequiredDoc {
  id: number
  name: string
  category: string | null
  is_sensitive: boolean
}

export interface CountryRow {
  id: number
  name: string
  iso2: string
}

export const getApplyCountries = (kind: PortalKind) =>
  portalApi<{ data: CountryRow[] }>(`/${kind}/countries`)

/** Student-scoped convenience wrapper (the student wizard omits the kind). */
export const getCountries = () => getApplyCountries("student")

export interface FundingOptions {
  self: boolean
  scholarship: boolean
  partial: boolean
}

export const getApplyFundingOptions = (kind: PortalKind, degree: Degree) =>
  portalApi<{ data: FundingOptions }>(`/${kind}/applications/funding-options?degree=${degree}`)

export const getFundingOptions = (degree: Degree) => getApplyFundingOptions("student", degree)

export const getApplyAvailability = (kind: PortalKind, degree: Degree, funding: Funding) =>
  portalApi<{ data: WizardProgram[] }>(
    `/${kind}/applications/availability?degree=${degree}&funding=${funding}`,
  )

export const getApplicationAvailability = (degree: Degree, funding: Funding) =>
  getApplyAvailability("student", degree, funding)

export const getApplicationRequiredDocuments = (programId: number, scholarshipId?: number | null) =>
  portalApi<{ data: RequiredDoc[] }>(
    `/student/applications/required-documents?program_id=${programId}${scholarshipId ? `&scholarship_id=${scholarshipId}` : ""}`,
  )

export interface WizardGuardian {
  relation: string
  name: string
  occupation?: string
  phone?: string
  email?: string
  address?: string
}

export interface WizardEducation {
  level?: string
  degree_name: string
  institution?: string
  board_or_university?: string
  major?: string
  start_year?: number | null
  end_year?: number | null
  grade_type?: string
  grade_value?: string
  is_completed?: boolean
}

export interface CreateApplicationPayload {
  program_id: number
  funding: Funding
  scholarship_id?: number | null
  intake_id?: number | null
  profile?: Record<string, unknown>
  guardians?: WizardGuardian[]
  education?: WizardEducation[]
  custom_fields?: Record<string, string>
}

export interface DraftApplication {
  id: number
  application_code: string
  status: string
  required_documents: RequiredDoc[]
}

/** The agent applies on behalf of one of their own students (adds student_id). */
export interface AgentCreateApplicationPayload extends CreateApplicationPayload {
  student_id: number
}

/**
 * Create a draft application. The kind selects the portal guard/tier: "student"
 * for self-apply, "agent" for apply-on-behalf (payload carries student_id).
 */
export const createApplication = (
  kind: PortalKind,
  payload: CreateApplicationPayload | AgentCreateApplicationPayload,
) =>
  portalApi<{ data: DraftApplication }>(`/${kind}/applications`, {
    method: "POST",
    body: JSON.stringify(payload),
  })

export const createStudentApplication = (payload: CreateApplicationPayload) =>
  createApplication("student", payload)

/** Presign → direct PUT → register, scoped to a draft application (JPG). */
export async function uploadApplicationDocument(
  kind: PortalKind,
  applicationId: number,
  documentTypeId: number,
  file: File,
): Promise<StudentDocumentRow> {
  const meta = { document_type_id: documentTypeId, file_name: file.name, mime: file.type, size: file.size }

  const presign = await portalApi<PresignResponse>(
    `/${kind}/applications/${applicationId}/documents/presign`,
    { method: "POST", body: JSON.stringify(meta) },
  )

  const put = await fetch(presign.url, { method: "PUT", headers: presign.headers, body: file })
  if (!put.ok) throw new Error("Upload to storage failed.")

  const registered = await portalApi<{ data: StudentDocumentRow }>(
    `/${kind}/applications/${applicationId}/documents`,
    { method: "POST", body: JSON.stringify({ ...meta, key: presign.key }) },
  )

  return registered.data
}

export const submitApplication = (kind: PortalKind, applicationId: number) =>
  portalApi<{ data: { id: number; application_code: string; status: string } }>(
    `/${kind}/applications/${applicationId}/submit`,
    { method: "POST" },
  )

export const submitStudentApplication = (applicationId: number) =>
  submitApplication("student", applicationId)

// ── Government-scholarship application (CSC etc.) ───────────────────────────

export interface Major {
  id: number
  name: string
}

export interface ScholarshipLevelBenefit {
  tuition_after?: number | string | null
  hostel_after?: number | string | null
  stipend_monthly?: number | string | null
}

export interface GovScholarship {
  id: number
  name: string
  type: string | null
  coverage: string | null
  currency: string | null
  description: string | null
  eligibility: string | null
  benefits: { bachelor?: ScholarshipLevelBenefit; master?: ScholarshipLevelBenefit; phd?: ScholarshipLevelBenefit } | null
  universities: { id: number; name: string; city: string | null }[]
}

export type ScholarshipLevel = "bachelor" | "master" | "phd"

export interface ScholarshipPreference {
  major: string
  university_id?: number | null
}

export interface ScholarshipApplicationPayload {
  scholarship_id: number
  level: ScholarshipLevel
  preferences?: ScholarshipPreference[]
  profile?: Record<string, unknown>
  guardians?: WizardGuardian[]
  education?: WizardEducation[]
}

export const getApplyMajors = (kind: PortalKind) => portalApi<{ data: Major[] }>(`/${kind}/majors`)

export const getMajors = () => getApplyMajors("student")

export const getApplyGovernmentScholarships = (kind: PortalKind) =>
  portalApi<{ data: GovScholarship[] }>(`/${kind}/government-scholarships`)

export const getGovernmentScholarships = () => getApplyGovernmentScholarships("student")

/** The agent applies for a government scholarship on behalf of an owned student. */
export interface AgentScholarshipApplicationPayload extends ScholarshipApplicationPayload {
  student_id: number
}

export const createScholarshipApplicationFor = (
  kind: PortalKind,
  payload: ScholarshipApplicationPayload | AgentScholarshipApplicationPayload,
) =>
  portalApi<{ data: DraftApplication }>(`/${kind}/scholarship-applications`, {
    method: "POST",
    body: JSON.stringify(payload),
  })

export const createScholarshipApplication = (payload: ScholarshipApplicationPayload) =>
  createScholarshipApplicationFor("student", payload)

// ── In-app notifications (portal feed) ─────────────────────────────────────

export interface PortalNotification {
  id: number
  type: string
  title: string | null
  body: string | null
  read_at: string | null
  created_at: string | null
}

export const listPortalNotifications = (kind: PortalKind) =>
  portalApi<{ data: PortalNotification[]; meta: { unread: number } }>(`/${kind}/notifications`)

export const getPortalUnreadCount = (kind: PortalKind) =>
  portalApi<{ unread: number }>(`/${kind}/notifications/unread-count`)

export const markPortalNotificationRead = (kind: PortalKind, id: number) =>
  portalApi<{ data: PortalNotification }>(`/${kind}/notifications/${id}/read`, { method: "POST" })

export const markAllPortalNotificationsRead = (kind: PortalKind) =>
  portalApi<{ unread: number }>(`/${kind}/notifications/read-all`, { method: "POST" })

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue
    search.set(key === "status" ? "filter[status]" : key, String(value))
  }
  const s = search.toString()

  return s ? `?${s}` : ""
}

import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"

import { useAuthStore } from "@/stores/auth"
import { jsonResponse, renderWithProviders } from "@/test/utils"
import type { AuthUser } from "@/types/auth"

import ApplicationDetailPage from "./ApplicationDetailPage"
import ApplicationsPage from "./ApplicationsPage"

function makeUser(permissions: string[]): AuthUser {
  return {
    id: 3,
    name: "Demo Admissions Officer",
    email: "admissions@cas.moe",
    phone: null,
    status: "active",
    roles: ["Admissions"],
    permissions,
    last_login_at: null,
  }
}

const APPLICATION = {
  id: 21,
  application_code: "APP-2026-00021",
  status: "under_review",
  submitted_at: null,
  student: { id: 5, student_code: "STU-2026-00005", full_name: "Ali Khan" },
  university: { id: 1, name: "Jilin Medical University", code: "JLMU" },
  program: { id: 10, name: "MBBS", level: "bachelor" },
  intake: { id: 1, name: "September 2026" },
  scholarship: null,
  admissions_officer: { id: 3, name: "Demo Admissions Officer" },
  offers: [],
  status_history: [
    { from_status: "draft", to_status: "under_review", note: null, changed_by: "Demo Admissions Officer", created_at: "2026-07-10T09:00:00Z" },
    { from_status: null, to_status: "draft", note: null, changed_by: "Demo Admissions Officer", created_at: "2026-07-01T10:00:00Z" },
  ],
  documents_count: 1,
  created_at: "2026-07-01T10:00:00Z",
}

const TYPES = {
  data: [
    { id: 1, name: "Passport", category: "identity", is_sensitive: true, required_for: ["application"] },
    { id: 2, name: "Academic Transcript", category: "academic", is_sensitive: false, required_for: ["application"] },
    { id: 3, name: "Bank Statement", category: "financial", is_sensitive: true, required_for: null },
  ],
}

const DOCS = {
  data: [
    { id: 40, type: TYPES.data[0], file_name: "passport.pdf", mime: "application/pdf", size: 1000, status: "verified", version: 1, verified_by: "Admin", created_at: "2026-07-05T08:00:00Z" },
  ],
}

function stubFetch(detailOverrides: Record<string, unknown> = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes("/document-types")) return Promise.resolve(jsonResponse(TYPES))
      if (url.includes("/documents")) return Promise.resolve(jsonResponse(DOCS))
      if (url.includes("/applications/21")) {
        return Promise.resolve(jsonResponse({ data: { ...APPLICATION, ...detailOverrides }, checklist: { missing: ["Academic Transcript"] } }))
      }
      return Promise.resolve(
        jsonResponse({ data: [APPLICATION], meta: { current_page: 1, last_page: 1, per_page: 25, total: 1, from: 1, to: 1 } }),
      )
    }),
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

it("lists applications with codes and status badges", async () => {
  useAuthStore.setState({ token: "t", user: makeUser(["applications.view.global"]) })
  stubFetch()

  renderWithProviders(<ApplicationsPage />)

  expect(await screen.findByText("APP-2026-00021")).toBeInTheDocument()
  expect(screen.getByText("Ali Khan")).toBeInTheDocument()
  expect(screen.getByText("under review")).toBeInTheDocument()
})

it("filters to applications awaiting verification", async () => {
  useAuthStore.setState({ token: "t", user: makeUser(["applications.view.global"]) })
  stubFetch()

  renderWithProviders(<ApplicationsPage />)
  await screen.findByText("APP-2026-00021")

  await userEvent.click(screen.getByRole("button", { name: "To verify", pressed: false }))

  await waitFor(() => {
    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls
    const listCalls = calls.map((c) => decodeURIComponent(String(c[0]))).filter((u) => u.includes("/applications"))
    expect(listCalls.some((u) => u.includes("filter[review]=1"))).toBe(true)
  })
})

function renderDetail() {
  return renderWithProviders(
    <Routes>
      <Route path="/applications/:id" element={<ApplicationDetailPage />} />
    </Routes>,
    { route: "/applications/21" },
  )
}

it("renders stepper, checklist states and history for updaters", async () => {
  useAuthStore.setState({
    token: "t",
    user: makeUser([
      "applications.view.global", "applications.update.global",
      "documents.view.global", "documents.upload.global",
    ]),
  })
  stubFetch()

  renderDetail()

  expect(await screen.findByText("APP-2026-00021")).toBeInTheDocument()
  // Legal next moves for under_review (minus withdrawn button styling)
  expect(screen.getByRole("button", { name: "documents pending" })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "submitted" })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Withdraw" })).toBeInTheDocument()
  // Checklist: passport verified, transcript missing with upload button
  expect(screen.getByText("Passport")).toBeInTheDocument()
  expect(screen.getByText("verified")).toBeInTheDocument()
  expect(screen.getByText("missing")).toBeInTheDocument()
  // History entries
  expect(screen.getByText(/draft →/)).toBeInTheDocument()
})

it("renders the full ingested applicant profile", async () => {
  useAuthStore.setState({ token: "t", user: makeUser(["applications.view.global", "documents.view.global"]) })
  stubFetch({
    applicant: {
      personal: {
        first_name: "Ayesha", last_name: "Shakeel", chinese_name: "黄佳佳", dob: "2005-06-25",
        gender: "female", marital_status: "Single", religion: "Islam", nationality: "Pakistan",
        native_language: "Urdu", place_of_birth: "Gujranwala, Pakistan", city: null,
      },
      passport: { passport_no: "UD5164361", issue_date: null, expiry_date: "2035-11-12" },
      contact: {
        email: "ayesha@example.com", alternate_email: "ayesha.alt@example.com", phone: "0300",
        wechat_id: "wxid_1", skype_id: null, current_address: "Addr A", permanent_address: "Addr B",
      },
      guardians: [{ name: "Arfa", relation: "Parent", phone: "0333", email: null, address: null }],
      education: [{ level: "Senior High School", degree_name: null, major: "Pre medical", institution: "Punjab Group", start_year: 2022, end_year: 2025, grade: null }],
    },
  })

  renderDetail()

  expect(await screen.findByText("Applicant details")).toBeInTheDocument()
  expect(screen.getByText("黄佳佳")).toBeInTheDocument()
  expect(screen.getByText("Pakistan")).toBeInTheDocument()
  expect(screen.getByText("UD5164361")).toBeInTheDocument()
  expect(screen.getByText("Arfa")).toBeInTheDocument()
  expect(screen.getByText(/Punjab Group/)).toBeInTheDocument()
})

it("accepts an offer and hides the response actions after refetch", async () => {
  useAuthStore.setState({
    token: "t",
    user: makeUser(["applications.view.global", "applications.update.global", "documents.view.global"]),
  })
  const user = userEvent.setup()

  const OFFER = { id: 7, offer_type: "conditional", reference_no: "OFR-2026-0007", issued_date: "2026-07-10", expiry_date: "2026-08-10", status: "issued" }
  let responded = false

  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes("/respond") && init?.method === "POST") {
        responded = true
        return Promise.resolve(jsonResponse({ data: { ...OFFER, status: "accepted" } }))
      }
      if (url.includes("/document-types")) return Promise.resolve(jsonResponse(TYPES))
      if (url.includes("/documents")) return Promise.resolve(jsonResponse(DOCS))
      if (url.includes("/applications/21")) {
        return Promise.resolve(jsonResponse({
          data: {
            ...APPLICATION,
            status: "offer_received",
            offers: [{ ...OFFER, status: responded ? "accepted" : "issued" }],
          },
          checklist: { missing: [] },
        }))
      }
      return Promise.resolve(jsonResponse({ data: [APPLICATION], meta: { current_page: 1, last_page: 1, per_page: 25, total: 1, from: 1, to: 1 } }))
    }),
  )

  renderDetail()

  // Issued offer shows both response actions.
  const acceptButton = await screen.findByRole("button", { name: "Accept" })
  expect(screen.getByRole("button", { name: "Decline" })).toBeInTheDocument()

  await user.click(acceptButton)

  // After the response + refetch, the offer is resolved and the actions vanish.
  await waitFor(() => expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument())
  expect(responded).toBe(true)
})

it("hides actions from view-only staff", async () => {
  useAuthStore.setState({
    token: "t",
    user: makeUser(["applications.view.assigned", "documents.view.assigned"]),
  })
  stubFetch()

  renderDetail()

  await screen.findByText("APP-2026-00021")
  expect(screen.queryByRole("button", { name: "submitted" })).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /Upload/ })).not.toBeInTheDocument()
})

it("surfaces the missing checklist on a blocked submit", async () => {
  useAuthStore.setState({
    token: "t",
    user: makeUser(["applications.view.global", "applications.update.global"]),
  })
  const user = userEvent.setup()

  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes("/transition") && init?.method === "POST") {
        return Promise.resolve(
          jsonResponse(
            { message: "Document checklist incomplete", code: "CHECKLIST_INCOMPLETE", missing: ["Academic Transcript", "Passport Photo"] },
            409,
          ),
        )
      }
      if (url.includes("/document-types")) return Promise.resolve(jsonResponse(TYPES))
      if (url.includes("/documents")) return Promise.resolve(jsonResponse(DOCS))
      return Promise.resolve(jsonResponse({ data: APPLICATION, checklist: { missing: [] } }))
    }),
  )

  renderDetail()

  await user.click(await screen.findByRole("button", { name: "submitted" }))

  const alert = await screen.findByRole("alert")
  expect(alert).toHaveTextContent(/required documents are missing/)
  expect(within(alert).getByText("Academic Transcript")).toBeInTheDocument()
  expect(within(alert).getByText("Passport Photo")).toBeInTheDocument()
})

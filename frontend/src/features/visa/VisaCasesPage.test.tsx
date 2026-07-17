import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"

import { useAuthStore } from "@/stores/auth"
import { jsonResponse, renderWithProviders } from "@/test/utils"
import type { AuthUser } from "@/types/auth"

import VisaCaseDetailPage from "./VisaCaseDetailPage"
import VisaCasesPage from "./VisaCasesPage"

function makeUser(permissions: string[]): AuthUser {
  return {
    id: 6,
    name: "Demo Visa Officer",
    email: "visa@cas.moe",
    phone: null,
    status: "active",
    roles: ["Visa"],
    permissions,
    last_login_at: null,
  }
}

const CASE = {
  id: 3,
  status: "appointment_booked",
  appointment_at: "2026-07-27T09:00:00Z",
  submitted_at: null,
  decision_at: null,
  travel_ready_at: null,
  student: { id: 5, student_code: "STU-2026-00005", full_name: "Ali Khan" },
  application: {
    id: 21,
    application_code: "APP-2026-00021",
    status: "accepted",
    university: { id: 1, name: "Jilin Medical University" },
  },
  officer: { id: 6, name: "Demo Visa Officer" },
  checklist: [
    { id: 1, name: "Passport (6+ months validity)", is_required: true, status: "verified", document_id: null },
    { id: 2, name: "JW202 Form", is_required: true, status: "pending", document_id: null },
  ],
  status_history: [
    { from_status: "documents_collection", to_status: "appointment_booked", note: null, changed_by: "Demo Visa Officer", created_at: "2026-07-15T08:00:00Z" },
    { from_status: null, to_status: "not_started", note: "Case opened on application acceptance", changed_by: "System", created_at: "2026-07-10T08:00:00Z" },
  ],
  created_at: "2026-07-10T08:00:00Z",
}

beforeEach(() => {
  vi.restoreAllMocks()
})

it("lists visa cases with pipeline tiles from API meta", async () => {
  useAuthStore.setState({ token: "t", user: makeUser(["visa.view.global"]) })
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      jsonResponse({
        data: [CASE],
        meta: { current_page: 1, last_page: 1, per_page: 25, total: 1, from: 1, to: 1 },
        pipeline: { appointment_booked: 1, travel_ready: 2 },
      }),
    ),
  )

  renderWithProviders(<VisaCasesPage />)

  expect(await screen.findByText("Ali Khan")).toBeInTheDocument()
  expect(screen.getByText("Jilin Medical University")).toBeInTheDocument()
  expect(screen.getByText("Demo Visa Officer")).toBeInTheDocument()
  expect(screen.getAllByText("appointment booked").length).toBeGreaterThanOrEqual(2) // tile + badge
})

function renderDetail() {
  return renderWithProviders(
    <Routes>
      <Route path="/visa/:id" element={<VisaCaseDetailPage />} />
    </Routes>,
    { route: "/visa/3" },
  )
}

it("surfaces the checklist gate when submission is premature", async () => {
  useAuthStore.setState({
    token: "t",
    user: makeUser(["visa.view.global", "visa.manage.global"]),
  })
  const user = userEvent.setup()

  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/transition") && init?.method === "POST") {
        return Promise.resolve(
          jsonResponse(
            { message: "Document checklist incomplete: JW202 Form", code: "CHECKLIST_INCOMPLETE", missing: ["JW202 Form"] },
            409,
          ),
        )
      }
      return Promise.resolve(jsonResponse({ data: CASE }))
    }),
  )

  renderDetail()

  const button = await screen.findByRole("button", { name: /Move to submitted/ })
  await user.click(button)

  expect(await screen.findByRole("alert")).toHaveTextContent(/still pending: JW202 Form/)
})

it("offers approve and reject from submitted", async () => {
  useAuthStore.setState({
    token: "t",
    user: makeUser(["visa.view.global", "visa.manage.global"]),
  })
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(jsonResponse({ data: { ...CASE, status: "submitted", submitted_at: "2026-07-16T08:00:00Z" } })),
  )

  renderDetail()

  expect(await screen.findByRole("button", { name: /Move to approved/ })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: /Move to rejected/ })).toBeInTheDocument()
})

it("hides transitions and checklist actions from viewers", async () => {
  useAuthStore.setState({ token: "t", user: makeUser(["visa.view.global"]) })
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: CASE })))

  renderDetail()

  await screen.findByText("Ali Khan")
  expect(screen.queryByRole("button", { name: /Move to/ })).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Mark received" })).not.toBeInTheDocument()
})

it("advances checklist items for managers", async () => {
  useAuthStore.setState({
    token: "t",
    user: makeUser(["visa.view.global", "visa.manage.global"]),
  })
  const user = userEvent.setup()
  const fetchMock = vi.fn().mockImplementation((_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "PATCH") {
      return Promise.resolve(jsonResponse({ data: { ...CASE.checklist[1], status: "received" } }))
    }
    return Promise.resolve(jsonResponse({ data: CASE }))
  })
  vi.stubGlobal("fetch", fetchMock)

  renderDetail()

  await user.click(await screen.findByRole("button", { name: "Mark received" }))

  expect(fetchMock).toHaveBeenCalledWith(
    "/api/v1/visa-cases/3/checklist/2",
    expect.objectContaining({ method: "PATCH" }),
  )
})

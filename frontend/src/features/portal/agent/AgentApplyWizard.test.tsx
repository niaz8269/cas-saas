import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import AgentApplyWizard from "./AgentApplyWizard"

const STUDENTS = {
  data: [
    { id: 7, student_code: "STU-7", full_name: "Ali Raza", status: "active", country: "Pakistan", applications_count: 0, created_at: null },
  ],
  meta: { current_page: 1, last_page: 1, per_page: 25, total: 1, from: 1, to: 1 },
}

const PROGRAM = {
  id: 3, name: "MBBS Clinical", level: "bachelor", teaching_language: "English",
  duration_months: 72, tuition_fee: 30000, hostel_fee: null, currency: "CNY",
  service_charge: { amount: 400, currency: "USD" },
  custom_fields: [{ key: "portfolio_url", label: "Portfolio URL", type: "text", required: true, options: [] }],
  university: { id: 1, name: "Fudan University", slug: null, city: "Shanghai", country: "China", moe_listed: true },
  intakes: [], scholarships: [],
}

const DRAFT = {
  data: {
    id: 99, application_code: "APP-99", status: "draft",
    required_documents: [{ id: 1, name: "Passport", category: "identity", is_sensitive: true }],
  },
}

/** Route every read the wizard makes; the POST create is handled by `main`. */
function withAgentApi(main: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  return vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = (init?.method ?? "GET").toUpperCase()

    if (method === "GET" && url.includes("/agent/students")) return Promise.resolve(jsonResponse(STUDENTS))
    if (method === "GET" && url.includes("/agent/countries")) return Promise.resolve(jsonResponse({ data: [{ id: 1, name: "Pakistan", iso2: "PK" }] }))
    if (method === "GET" && url.includes("/funding-options")) return Promise.resolve(jsonResponse({ data: { self: true, scholarship: false, partial: false } }))
    if (method === "GET" && url.includes("/availability")) return Promise.resolve(jsonResponse({ data: [PROGRAM] }))

    return main(input, init)
  })
}

beforeEach(() => vi.restoreAllMocks())

it("applies for one of the agent's own students and sends student_id in the draft", async () => {
  const user = userEvent.setup()
  const fetchMock = withAgentApi(() => Promise.resolve(jsonResponse(DRAFT, 201)))
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<AgentApplyWizard />, { route: "/portal/agent/apply" })

  // Step 1 — pick the agent's student, then continue.
  await user.click(await screen.findByText("Ali Raza"))
  await user.click(screen.getByRole("button", { name: "Continue" }))

  // Step 2 — course: degree → funding → program.
  await user.click(await screen.findByText("Bachelor of Medicine")) // MBBS degree tile
  await user.click(await screen.findByText("Pay tuition yourself")) // self-funded tile
  await user.click(await screen.findByText("MBBS Clinical")) // program card
  // The course carries a required custom field — Continue is gated until answered.
  await user.type(await screen.findByLabelText("Portfolio URL"), "https://folio.example/ali")
  await user.click(screen.getByRole("button", { name: "Continue" }))

  // Step 3 — personal: nothing required, continue.
  await user.click(screen.getByRole("button", { name: "Continue" }))

  // Step 4 — background: create the draft.
  await user.click(screen.getByRole("button", { name: "Save & add documents" }))

  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/agent/applications", expect.objectContaining({ method: "POST" })),
  )

  const createCall = fetchMock.mock.calls.find(
    ([u, i]: [RequestInfo | URL, RequestInit?]) => u === "/api/v1/agent/applications" && (i as RequestInit)?.method === "POST",
  )!
  const body = JSON.parse((createCall[1] as RequestInit).body as string)
  expect(body).toMatchObject({ student_id: 7, program_id: 3, funding: "self" })
  expect(body.custom_fields).toEqual({ portfolio_url: "https://folio.example/ali" })

  // Advances to the documents step for the new draft.
  expect(await screen.findByText("Passport")).toBeInTheDocument()
})

it("pre-selects the student from the ?student= query and skips the picker", async () => {
  const fetchMock = withAgentApi(() => Promise.resolve(jsonResponse(DRAFT, 201)))
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<AgentApplyWizard />, { route: "/portal/agent/apply?student=7&name=Ali%20Raza" })

  // The header reflects the pre-selected student and we start on Course.
  expect(await screen.findByText(/Ali Raza/)).toBeInTheDocument()
  expect(await screen.findByText("Bachelor of Medicine")).toBeInTheDocument()
})

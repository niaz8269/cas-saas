import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import AgentScholarshipWizard from "./AgentScholarshipWizard"

const STUDENTS = {
  data: [
    { id: 7, student_code: "STU-7", full_name: "Ali Raza", status: "active", country: "Pakistan", applications_count: 0, created_at: null },
  ],
  meta: { current_page: 1, last_page: 1, per_page: 25, total: 1, from: 1, to: 1 },
}

const CSC = {
  id: 8, name: "CSC", type: "full", coverage: "Full tuition + stipend", currency: "CNY",
  description: "China Scholarship Council",
  eligibility: null,
  benefits: { bachelor: { tuition_after: 0, hostel_after: 0, stipend_monthly: 2500 } },
  universities: [{ id: 1, name: "Fudan University", city: "Shanghai" }],
}

const DRAFT = {
  data: {
    id: 77, application_code: "SCH-77", status: "draft",
    required_documents: [{ id: 1, name: "Passport", category: "identity", is_sensitive: true }],
  },
}

function withAgentApi(main: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  return vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = (init?.method ?? "GET").toUpperCase()

    if (method === "GET" && url.includes("/agent/students")) return Promise.resolve(jsonResponse(STUDENTS))
    if (method === "GET" && url.includes("/government-scholarships")) return Promise.resolve(jsonResponse({ data: [CSC] }))
    if (method === "GET" && url.includes("/agent/majors")) return Promise.resolve(jsonResponse({ data: [{ id: 1, name: "Computer Science" }] }))
    if (method === "GET" && url.includes("/agent/countries")) return Promise.resolve(jsonResponse({ data: [{ id: 1, name: "Pakistan", iso2: "PK" }] }))

    return main(input, init)
  })
}

beforeEach(() => vi.restoreAllMocks())

it("applies for a government scholarship on behalf of an owned student", async () => {
  const user = userEvent.setup()
  const fetchMock = withAgentApi(() => Promise.resolve(jsonResponse(DRAFT, 201)))
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<AgentScholarshipWizard />, { route: "/portal/agent/apply-scholarship" })

  // Step 1 — pick the agent's student.
  await user.click(await screen.findByText("Ali Raza"))
  await user.click(screen.getByRole("button", { name: "Continue" }))

  // Step 2 — level → scholarship.
  await user.click(await screen.findByText("Undergraduate")) // Bachelor / BS tile
  await user.click(await screen.findByText("CSC"))
  await user.click(screen.getByRole("button", { name: "Continue" }))

  // Step 3 — preferences: choose a major via the (Radix) select.
  const combos = await screen.findAllByRole("combobox")
  await user.click(combos[0]) // the Major select
  await user.click(await screen.findByRole("option", { name: "Computer Science" }))
  await user.click(screen.getByRole("button", { name: "Continue" }))

  // Step 4 — personal, continue.
  await user.click(screen.getByRole("button", { name: "Continue" }))

  // Step 5 — background: create the draft.
  await user.click(screen.getByRole("button", { name: "Save & add documents" }))

  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/agent/scholarship-applications", expect.objectContaining({ method: "POST" })),
  )

  const createCall = fetchMock.mock.calls.find(
    (call) => call[0] === "/api/v1/agent/scholarship-applications" && (call[1] as RequestInit)?.method === "POST",
  )!
  const body = JSON.parse((createCall[1] as RequestInit).body as string)
  expect(body).toMatchObject({ student_id: 7, scholarship_id: 8, level: "bachelor" })
  expect(body.preferences[0]).toMatchObject({ major: "Computer Science" })

  expect(await screen.findByText("Passport")).toBeInTheDocument()
})

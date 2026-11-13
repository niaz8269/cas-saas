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

/** The applicant record on file for student 7 — what the wizard prefills from. */
const DETAIL = {
  data: {
    id: 7, student_code: "STU-7", first_name: "Ali", last_name: "Raza", full_name: "Ali Raza",
    email: "ali@example.com", status: "active",
    profile: { place_of_birth: "Hyderabad", city: "Karachi", passport_no: "XY987654", dob: "2004-01-09", gender: "male" },
    guardians: [{ relation: "father", name: "Imran Raza", occupation: "Doctor" }],
    education: [{ level: "intermediate", degree_name: "FSc Pre-Engineering", institution: "City College" }],
  },
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

    // The detail route must be matched before the list route it prefixes.
    if (method === "GET" && /\/agent\/students\/\d+/.test(url)) return Promise.resolve(jsonResponse(DETAIL))
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
    (call) => call[0] === "/api/v1/agent/applications" && (call[1] as RequestInit)?.method === "POST",
  )!
  const body = JSON.parse((createCall[1] as RequestInit).body as string)
  expect(body).toMatchObject({ student_id: 7, program_id: 3, funding: "self" })
  expect(body.custom_fields).toEqual({ portfolio_url: "https://folio.example/ali" })

  // Advances to the documents step for the new draft.
  expect(await screen.findByText("Passport")).toBeInTheDocument()
})

it("prefills the applicant record on file instead of asking for it again", async () => {
  const user = userEvent.setup()
  const fetchMock = withAgentApi(() => Promise.resolve(jsonResponse(DRAFT, 201)))
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<AgentApplyWizard />, { route: "/portal/agent/apply?student=7&name=Ali%20Raza" })

  // Course → Personal: the details the partner already gave CAS are there.
  await user.click(await screen.findByText("Bachelor of Medicine"))
  await user.click(await screen.findByText("Pay tuition yourself"))
  await user.click(await screen.findByText("MBBS Clinical"))
  await user.type(await screen.findByLabelText("Portfolio URL"), "https://folio.example/ali")
  await user.click(screen.getByRole("button", { name: "Continue" }))

  await waitFor(() => expect(screen.getByDisplayValue("Karachi")).toBeInTheDocument())
  expect(screen.getByDisplayValue("XY987654")).toBeInTheDocument()

  // Background: family and education come back too.
  await user.click(screen.getByRole("button", { name: "Continue" }))
  expect(screen.getByDisplayValue("Imran Raza")).toBeInTheDocument()
  expect(screen.getByDisplayValue("FSc Pre-Engineering")).toBeInTheDocument()

  // And the draft posts them back, so nothing on file is overwritten by blanks.
  await user.click(screen.getByRole("button", { name: "Save & add documents" }))

  await waitFor(() => {
    const call = fetchMock.mock.calls.find(
      (c) => c[0] === "/api/v1/agent/applications" && (c[1] as RequestInit)?.method === "POST",
    )!
    const body = JSON.parse((call[1] as RequestInit).body as string)

    expect(body.profile).toMatchObject({ city: "Karachi", passport_no: "XY987654" })
    expect(body.guardians).toContainEqual(expect.objectContaining({ name: "Imran Raza" }))
    expect(body.education).toContainEqual(expect.objectContaining({ degree_name: "FSc Pre-Engineering" }))
  })
})

it("pre-selects the student from the ?student= query and skips the picker", async () => {
  const fetchMock = withAgentApi(() => Promise.resolve(jsonResponse(DRAFT, 201)))
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<AgentApplyWizard />, { route: "/portal/agent/apply?student=7&name=Ali%20Raza" })

  // The header reflects the pre-selected student and we start on Course.
  expect(await screen.findByText(/Ali Raza/)).toBeInTheDocument()
  expect(await screen.findByText("Bachelor of Medicine")).toBeInTheDocument()
})

it("carries on with a saved draft at the documents step instead of starting again", async () => {
  const fetchMock = withAgentApi((input) => {
    if (String(input).includes("/agent/applications/99/draft")) {
      return Promise.resolve(jsonResponse({
        data: {
          id: 99, application_code: "APP-99", status: "draft", student_id: 7, student: { id: 7, full_name: "Ali Raza" },
          degree: "mbbs", funding: "self", scholarship_id: null, intake_id: null, custom_fields: {}, program: PROGRAM,
          required_documents: [{ id: 1, name: "Passport", category: "identity", is_sensitive: true }], optional_documents: [],
        },
      }))
    }
    if (String(input).includes("/agent/applications/99/documents")) return Promise.resolve(jsonResponse({ data: [] }))

    return Promise.resolve(jsonResponse({}))
  })
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<AgentApplyWizard />, { route: "/portal/agent/apply?draft=99" })

  expect(await screen.findByText("Passport")).toBeInTheDocument()
  expect(screen.getByText(/Ali Raza/)).toBeInTheDocument()
  expect(screen.getByRole("button", { name: /Upload all required documents/ })).toBeDisabled()
  expect(fetchMock.mock.calls.some(([u, i]) => String(u).endsWith("/agent/applications") && (i as RequestInit)?.method === "POST")).toBe(false)
})

it("brings back a half-filled application after the page is refreshed", async () => {
  sessionStorage.setItem("cas-apply-agent", JSON.stringify({
    step: 2, student: { id: 7, name: "Ali Raza" }, degree: "mbbs", funding: "self", program: PROGRAM, intakeId: "", scholarshipId: "",
    customAnswers: { portfolio_url: "https://example.com" }, profile: { city: "Typed before refresh" },
    guardians: [{ relation: "father", name: "" }, { relation: "mother", name: "" }], education: [{ degree_name: "", level: "" }],
    emergency: { relation: "Emergency contact", name: "" },
  }))
  vi.stubGlobal("fetch", withAgentApi(() => Promise.resolve(jsonResponse({}))))

  renderWithProviders(<AgentApplyWizard />)

  expect(await screen.findByText("We brought back what you had filled in.")).toBeInTheDocument()
  expect(await screen.findByDisplayValue("Typed before refresh")).toBeInTheDocument()
  sessionStorage.clear()
})

it("says clearly when the student already has an application for that program", async () => {
  sessionStorage.clear()
  const message = "Ali Raza already has an application for this program (APP-1, under review). Follow it under Applications instead of starting another."
  vi.stubGlobal("fetch", withAgentApi((input, init) => {
    if (String(input).endsWith("/agent/applications") && init?.method === "POST") {
      return Promise.resolve(jsonResponse({ message, errors: { program_id: [message] } }, 422))
    }

    return Promise.resolve(jsonResponse({}))
  }))
  sessionStorage.setItem("cas-apply-agent", JSON.stringify({
    step: 3, student: { id: 7, name: "Ali Raza" }, degree: "mbbs", funding: "self", program: PROGRAM, intakeId: "", scholarshipId: "",
    customAnswers: { portfolio_url: "https://example.com" }, profile: {}, guardians: [{ relation: "father", name: "" }, { relation: "mother", name: "" }],
    education: [{ degree_name: "", level: "" }], emergency: { relation: "Emergency contact", name: "" },
  }))
  const user = userEvent.setup()

  renderWithProviders(<AgentApplyWizard />)
  await user.click(await screen.findByRole("button", { name: "Save & add documents" }))

  expect(await screen.findByRole("alert")).toHaveTextContent("already has an application for this program (APP-1, under review)")
  sessionStorage.clear()
})

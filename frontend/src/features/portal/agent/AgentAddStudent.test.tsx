import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import AgentAddStudent from "./AgentAddStudent"

const COUNTRIES = { data: [{ id: 1, name: "Pakistan", iso2: "PK" }] }

const CREATED = {
  data: {
    id: 11, student_code: "STU-2026-00011", full_name: "Hina Malik",
    status: "active", country: null, applications_count: 0, created_at: null,
  },
}

/** Serve the country list; hand everything else to the test's own handler. */
function withApi(main: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  return vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if ((init?.method ?? "GET").toUpperCase() === "GET" && url.includes("/agent/countries")) {
      return Promise.resolve(jsonResponse(COUNTRIES))
    }
    return main(input, init)
  })
}

/**
 * Reached by label, which also pins the wizard Field's accessible name — the
 * labels used to be visual only, unreachable by a screen reader. Several
 * labels (Name, Phone) repeat across guardian rows, hence the index.
 */
const fieldInput = (label: string, index = 0) => screen.getAllByLabelText(label)[index]

const postBody = (mock: ReturnType<typeof vi.fn>) => {
  const call = mock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === "POST")
  expect(call).toBeTruthy()
  return { url: String(call![0]), body: JSON.parse((call![1] as RequestInit).body as string) }
}

beforeEach(() => vi.restoreAllMocks())

it("collects the applicant record an application is built from", async () => {
  const user = userEvent.setup()
  const fetchMock = withApi(() => Promise.resolve(jsonResponse(CREATED, 201)))
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<AgentAddStudent />, { route: "/portal/agent/students/new" })

  await user.type(screen.getByLabelText("First name"), "Hina")
  await user.type(screen.getByLabelText("Last name"), "Malik")
  await user.type(screen.getByLabelText("Email (optional)"), "hina.malik@example.com")

  // Sections lifted straight from the apply wizard — the partner is asked for
  // the same facts the application is built from.
  expect(screen.getByText("Personal details")).toBeInTheDocument()
  expect(screen.getByText("Family")).toBeInTheDocument()
  expect(screen.getByText("Most recent education")).toBeInTheDocument()

  await user.type(fieldInput("Place of birth"), "Lahore")
  await user.type(fieldInput("Passport no."), "AB123456")
  await user.type(fieldInput("Name"), "Kamran Malik") // the father row
  await user.type(fieldInput("Degree / qualification"), "FSc Pre-Medical")

  await user.click(screen.getByRole("button", { name: "Add student" }))

  await waitFor(() => {
    const { url, body } = postBody(fetchMock)

    expect(url).toContain("/agent/students")
    expect(body.first_name).toBe("Hina")
    expect(body.email).toBe("hina.malik@example.com")
    expect(body.profile).toMatchObject({ place_of_birth: "Lahore", passport_no: "AB123456" })
    expect(body.guardians).toEqual([{ relation: "father", name: "Kamran Malik" }])
    expect(body.education[0]).toMatchObject({ degree_name: "FSc Pre-Medical" })
    // ownership is never client-supplied
    expect(body).not.toHaveProperty("agent_id")
  })
// Typing across a form this size is slow under jsdom; the default 5s is tight.
}, 20_000)

it("drops the answers left blank", async () => {
  const user = userEvent.setup()
  const fetchMock = withApi(() => Promise.resolve(jsonResponse(CREATED, 201)))
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<AgentAddStudent />, { route: "/portal/agent/students/new" })

  await user.type(screen.getByLabelText("First name"), "Hina")
  await user.type(screen.getByLabelText("Last name"), "Malik")
  await user.click(screen.getByRole("button", { name: "Add student" }))

  await waitFor(() => {
    const { body } = postBody(fetchMock)

    expect(body).not.toHaveProperty("email")
    expect(body.profile).toEqual({})
    // the empty father/mother/emergency rows are not sent as blank guardians
    expect(body.guardians).toEqual([])
    expect(body.education).toEqual([])
  })
})

it("requires both names before it will submit", async () => {
  const user = userEvent.setup()
  const fetchMock = withApi(() => Promise.resolve(jsonResponse(CREATED, 201)))
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<AgentAddStudent />, { route: "/portal/agent/students/new" })

  await user.click(screen.getByRole("button", { name: "Add student" }))

  expect(await screen.findByText("First name is required")).toBeInTheDocument()
  expect(screen.getByText("Last name is required")).toBeInTheDocument()
  expect(fetchMock.mock.calls.some(([, init]) => (init as RequestInit | undefined)?.method === "POST")).toBe(false)
})

it("shows the server message when the student is already registered", async () => {
  const user = userEvent.setup()
  vi.stubGlobal("fetch", withApi(() => Promise.resolve(
    jsonResponse({ message: "This student is already on your list.", code: "DUPLICATE", student_id: 4 }, 409),
  )))

  renderWithProviders(<AgentAddStudent />, { route: "/portal/agent/students/new" })

  await user.type(screen.getByLabelText("First name"), "Hina")
  await user.type(screen.getByLabelText("Last name"), "Malik")
  await user.click(screen.getByRole("button", { name: "Add student" }))

  expect(await screen.findByRole("alert")).toHaveTextContent("This student is already on your list.")
})

it("maps a 422 back onto the offending field", async () => {
  const user = userEvent.setup()
  vi.stubGlobal("fetch", withApi(() => Promise.resolve(
    jsonResponse({
      message: "The given data was invalid.",
      errors: { email: ["The email field must be a valid email address."] },
      code: "VALIDATION_ERROR",
    }, 422),
  )))

  renderWithProviders(<AgentAddStudent />, { route: "/portal/agent/students/new" })

  await user.type(screen.getByLabelText("First name"), "Hina")
  await user.type(screen.getByLabelText("Last name"), "Malik")
  await user.click(screen.getByRole("button", { name: "Add student" }))

  expect(await screen.findByText("The email field must be a valid email address.")).toBeInTheDocument()
})

it("summarises applicant-record errors that have no field on this screen", async () => {
  const user = userEvent.setup()
  vi.stubGlobal("fetch", withApi(() => Promise.resolve(
    jsonResponse({
      message: "The given data was invalid.",
      errors: { "profile.passport_expiry_date": ["The expiry date must be after the issue date."] },
      code: "VALIDATION_ERROR",
    }, 422),
  )))

  renderWithProviders(<AgentAddStudent />, { route: "/portal/agent/students/new" })

  await user.type(screen.getByLabelText("First name"), "Hina")
  await user.type(screen.getByLabelText("Last name"), "Malik")
  await user.click(screen.getByRole("button", { name: "Add student" }))

  expect(await screen.findByRole("alert")).toHaveTextContent("The expiry date must be after the issue date.")
})

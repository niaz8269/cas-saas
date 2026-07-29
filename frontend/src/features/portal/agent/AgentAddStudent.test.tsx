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

beforeEach(() => vi.restoreAllMocks())

it("posts only the filled fields and never an agent_id", async () => {
  const user = userEvent.setup()
  const fetchMock = withApi(() => Promise.resolve(jsonResponse(CREATED, 201)))
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<AgentAddStudent />, { route: "/portal/agent/students/new" })

  await user.type(screen.getByLabelText("First name"), "Hina")
  await user.type(screen.getByLabelText("Last name"), "Malik")
  await user.type(screen.getByLabelText("Email (optional)"), "hina.malik@example.com")
  await user.click(screen.getByRole("button", { name: "Add student" }))

  await waitFor(() => {
    const post = fetchMock.mock.calls.find(([, init]) => (init as RequestInit | undefined)?.method === "POST")
    expect(post).toBeTruthy()
    expect(String(post![0])).toContain("/agent/students")

    const body = JSON.parse((post![1] as RequestInit).body as string)
    expect(body).toEqual({ first_name: "Hina", last_name: "Malik", email: "hina.malik@example.com" })
    // blank optionals are dropped, and ownership is never client-supplied
    expect(body).not.toHaveProperty("phone")
    expect(body).not.toHaveProperty("agent_id")
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

  const alert = await screen.findByRole("alert")
  expect(alert).toHaveTextContent("This student is already on your list.")
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

import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { useAuthStore } from "@/stores/auth"
import { jsonResponse, renderWithProviders } from "@/test/utils"
import type { AuthUser } from "@/types/auth"

import PartnerRequestsPage from "./PartnerRequestsPage"

function makeUser(permissions: string[]): AuthUser {
  return {
    id: 1, name: "Admin", email: "admin@cas.moe", phone: null, status: "active",
    roles: ["Admin"], permissions, last_login_at: null,
  }
}

const REQ = {
  id: 3, agent_code: "AGT-2026-00003", company_name: "Bright Future", contact_name: "Sara Khan",
  type: "partner", email: "partner@x.com", phone: "+92 300 0000000", website: "https://bright.example",
  address: "12 Mall Road", country: "Pakistan", status: "pending", created_at: "2026-07-22T00:00:00Z",
}
const LIST = { data: [REQ], meta: { current_page: 1, last_page: 1, per_page: 25, total: 1, from: 1, to: 1 } }

beforeEach(() => {
  vi.restoreAllMocks()
  useAuthStore.setState({ token: "t", user: makeUser(["agents.manage.global"]) })
})

it("lists a pending partner request and approves it", async () => {
  const user = userEvent.setup()
  const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = (init?.method ?? "GET").toUpperCase()
    if (method === "POST" && url.includes("/agents/3/approve")) return Promise.resolve(jsonResponse({ data: { ...REQ, status: "active" } }))

    return Promise.resolve(jsonResponse(LIST))
  })
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<PartnerRequestsPage />)

  expect(await screen.findByText("Bright Future")).toBeInTheDocument()
  expect(screen.getByText("Sara Khan")).toBeInTheDocument()

  await user.click(screen.getByRole("button", { name: /Approve/ }))

  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/agents/3/approve"), expect.objectContaining({ method: "POST" })),
  )
})

it("hides approve/reject for staff without the manage permission", async () => {
  useAuthStore.setState({ token: "t", user: makeUser(["agents.view.global"]) })
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(LIST)))

  renderWithProviders(<PartnerRequestsPage />)

  expect(await screen.findByText("Bright Future")).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /Approve/ })).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /Reject/ })).not.toBeInTheDocument()
})

const ACTIVE_LIST = { ...LIST, data: [{ ...REQ, status: "active" }] }

it("changes an active partner to a student after a confirmation", async () => {
  const user = userEvent.setup()
  const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if ((init?.method ?? "GET").toUpperCase() === "POST" && url.includes("/agents/3/convert-to-student")) {
      return Promise.resolve(jsonResponse({ data: { role: "student", id: 9, code: "STU-2026-00009" } }))
    }

    return Promise.resolve(jsonResponse(ACTIVE_LIST))
  })
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<PartnerRequestsPage />)
  await user.click(await screen.findByRole("button", { name: /Change to Student/ }))

  expect(await screen.findByText(/Change Sara Khan to Student\?/)).toBeInTheDocument()
  expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("convert-to-student"), expect.anything())

  await user.click(screen.getAllByRole("button", { name: /Change to Student/ }).at(-1)!)
  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/agents/3/convert-to-student"), expect.objectContaining({ method: "POST" })),
  )
})

it("shows the server's reason when a partner cannot be switched", async () => {
  const user = userEvent.setup()
  vi.stubGlobal("fetch", vi.fn().mockImplementation((_input: RequestInfo | URL, init?: RequestInit) => {
    if ((init?.method ?? "GET").toUpperCase() === "POST") {
      return Promise.resolve(jsonResponse({ message: "x", errors: { account: ["This partner still has referred students."] } }, 422))
    }

    return Promise.resolve(jsonResponse(ACTIVE_LIST))
  }))

  renderWithProviders(<PartnerRequestsPage />)
  await user.click(await screen.findByRole("button", { name: /Change to Student/ }))
  await user.click(screen.getAllByRole("button", { name: /Change to Student/ }).at(-1)!)

  expect(await screen.findByRole("alert")).toHaveTextContent("This partner still has referred students.")
})

it("does not offer the switch without the manage permission", async () => {
  useAuthStore.setState({ token: "t", user: makeUser(["agents.view.global"]) })
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(ACTIVE_LIST)))

  renderWithProviders(<PartnerRequestsPage />)

  expect(await screen.findByText("Bright Future")).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /Change to Student/ })).not.toBeInTheDocument()
})

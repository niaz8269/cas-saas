import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { useAuthStore } from "@/stores/auth"
import { jsonResponse, renderWithProviders } from "@/test/utils"
import type { AuthUser } from "@/types/auth"

import AgentPayablesPage from "./AgentPayablesPage"

function makeUser(permissions: string[]): AuthUser {
  return {
    id: 4, name: "Demo Finance Officer", email: "finance@cas.moe", phone: null,
    status: "active", roles: ["Finance"], permissions, last_login_at: null,
  }
}

const PAYABLES = {
  data: [
    {
      id: 7, commission_id: 3,
      agent: { id: 2, name: "Bright Futures Co", agent_code: "AG-002", type: "company" },
      student: { id: 5, full_name: "Ali Khan" },
      amount: "1200.00", currency: "CNY", status: "payable", computed_at: "2026-07-10T09:00:00Z",
    },
  ],
  meta: { current_page: 1, last_page: 1, per_page: 25, total: 1, from: 1, to: 1 },
}

beforeEach(() => {
  vi.restoreAllMocks()
  useAuthStore.setState({ token: "t", user: makeUser(["commission.view.global", "commission.manage.global"]) })
})

it("lists agent payables with amounts and status", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(PAYABLES)))

  renderWithProviders(<AgentPayablesPage />)

  expect(await screen.findByText("Bright Futures Co")).toBeInTheDocument()
  expect(screen.getByText("AG-002")).toBeInTheDocument()
  expect(screen.getByText("Ali Khan")).toBeInTheDocument()
  expect(screen.getByText("payable")).toBeInTheDocument()
})

it("records a payout with a reference", async () => {
  const user = userEvent.setup()
  const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).includes("/pay") && init?.method === "POST") {
      return Promise.resolve(jsonResponse({ data: { ...PAYABLES.data[0], status: "paid" } }))
    }

    return Promise.resolve(jsonResponse(PAYABLES))
  })
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<AgentPayablesPage />)
  await user.click(await screen.findByRole("button", { name: "Record payout" }))

  const dialog = await screen.findByRole("dialog")
  await user.type(within(dialog).getByLabelText("Reference"), "TXN-9001")
  await user.click(within(dialog).getByRole("button", { name: "Record payout" }))

  const post = fetchMock.mock.calls.find(([u, i]) => String(u).includes("/agent-payables/7/pay") && (i?.method === "POST"))
  expect(post).toBeTruthy()
  expect(JSON.parse((post![1] as RequestInit).body as string)).toMatchObject({ reference: "TXN-9001" })
})

it("hides the payout action without commission.manage", async () => {
  useAuthStore.setState({ token: "t", user: makeUser(["commission.view.global"]) })
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(PAYABLES)))

  renderWithProviders(<AgentPayablesPage />)
  await screen.findByText("Bright Futures Co")

  expect(screen.queryByRole("button", { name: "Record payout" })).not.toBeInTheDocument()
})

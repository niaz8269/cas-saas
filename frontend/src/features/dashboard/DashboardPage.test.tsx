import { screen } from "@testing-library/react"

import { useAuthStore } from "@/stores/auth"
import { jsonResponse, renderWithProviders } from "@/test/utils"
import type { AuthUser } from "@/types/auth"

import DashboardPage from "./DashboardPage"

function makeUser(): AuthUser {
  return {
    id: 1, name: "Demo Manager", email: "management@cas.moe", phone: null,
    status: "active", roles: ["Management"], permissions: ["dashboard.view.global"], last_login_at: null,
  }
}

const DASHBOARD = {
  leads: { total: 33, by_status: { new: 20, contacted: 5, qualified: 4, converted: 4 }, converted: 4, conversion_rate: 12.1 },
  students: { total: 10, by_status: { active: 6, arrived: 4 } },
  applications: { total: 15, open: 11, by_status: { submitted: 3, accepted: 1 } },
  commissions: {
    pipeline: { expected: { count: 3, expected: 9420, received: 0 }, received: { count: 1, expected: 3400, received: 3400 } },
    expected_total: 12820, received_total: 3400, currency: "CNY",
  },
  finance: { billed: 102000, collected: 44400, receivables: 57600, currency: "CNY" },
  visa: { total: 3, by_status: { travel_ready: 1 } },
}

beforeEach(() => {
  vi.restoreAllMocks()
  useAuthStore.setState({ token: "t", user: makeUser() })
})

it("renders the live KPI cards from the analytics API", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: DASHBOARD })))

  renderWithProviders(<DashboardPage />)

  expect(await screen.findByText("12.1%")).toBeInTheDocument() // conversion
  expect(screen.getByText("33")).toBeInTheDocument() // leads
  expect(screen.getByText("11")).toBeInTheDocument() // open applications
  expect(screen.getByText("3,400 CNY")).toBeInTheDocument() // commission received
  expect(screen.getByText("57,600 CNY")).toBeInTheDocument() // outstanding
  expect(screen.getByText("44% collected")).toBeInTheDocument()
  // Visa summary now renders on the executive dashboard.
  expect(screen.getByText("Visa cases")).toBeInTheDocument()
  expect(screen.getByText("Travel Ready")).toBeInTheDocument()
})

it("shows an error state when the dashboard fails", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ message: "nope" }, 403)))

  renderWithProviders(<DashboardPage />)

  expect(await screen.findByText(/Couldn't load the dashboard/)).toBeInTheDocument()
})

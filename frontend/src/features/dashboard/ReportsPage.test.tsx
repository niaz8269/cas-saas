import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { useAuthStore } from "@/stores/auth"
import { jsonResponse, renderWithProviders } from "@/test/utils"
import type { AuthUser } from "@/types/auth"

import ReportsPage from "./ReportsPage"

function makeUser(): AuthUser {
  return {
    id: 1, name: "Demo Manager", email: "management@cas.moe", phone: null,
    status: "active", roles: ["Management"], permissions: ["reports.view.global"], last_login_at: null,
  }
}

const REPORT = {
  universities: [
    { name: "Jilin Medical University", code: "JLMU", applications: 5, accepted: 2, commission_received: 3400 },
    { name: "Dalian Medical University", code: "DMU", applications: 3, accepted: 0, commission_received: 0 },
  ],
  agents: [
    { agent_code: "GSP-0001", name: "Global Study Partners", type: "partner", students: 4, commission_earned: 1020 },
  ],
  lead_sources: [
    { source: "Google Ads", leads: 12, converted: 3 },
    { source: "Direct / API", leads: 21, converted: 1 },
  ],
}

beforeEach(() => {
  vi.restoreAllMocks()
  useAuthStore.setState({ token: "t", user: makeUser() })
})

it("renders university, agent and lead-source breakdowns", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: REPORT })))

  renderWithProviders(<ReportsPage />)

  expect(await screen.findByText("Jilin Medical University")).toBeInTheDocument()
  expect(screen.getByText("Global Study Partners")).toBeInTheDocument()
  expect(screen.getByText("Google Ads")).toBeInTheDocument()
  expect(screen.getByText("1,020 CNY")).toBeInTheDocument() // agent earned
})

it("exports university performance as a CSV download", async () => {
  const user = userEvent.setup()
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: REPORT })))

  let captured: Blob | undefined
  URL.createObjectURL = vi.fn((blob: Blob) => { captured = blob; return "blob:mock-csv" })
  URL.revokeObjectURL = vi.fn()
  const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})

  renderWithProviders(<ReportsPage />)

  await user.click(await screen.findByRole("button", { name: "Export university performance" }))

  expect(clickSpy).toHaveBeenCalled()
  expect(captured?.type).toContain("text/csv")
})

it("shows an error state on failure", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ message: "no" }, 403)))

  renderWithProviders(<ReportsPage />)

  expect(await screen.findByText(/Couldn't load reports/)).toBeInTheDocument()
})

import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"

import { useAuthStore } from "@/stores/auth"
import { jsonResponse, renderWithProviders } from "@/test/utils"
import type { AuthUser } from "@/types/auth"

import CommissionDetailPage from "./CommissionDetailPage"
import CommissionsPage from "./CommissionsPage"
import FinancePage from "./FinancePage"

function makeUser(permissions: string[]): AuthUser {
  return {
    id: 4,
    name: "Demo Finance Officer",
    email: "finance@cas.moe",
    phone: null,
    status: "active",
    roles: ["Finance"],
    permissions,
    last_login_at: null,
  }
}

const INVOICE = {
  id: 1,
  invoice_no: "INV-2026-00001",
  party_type: "student",
  party_id: 5,
  party_name: "Ali Khan",
  application: { id: 21, application_code: "APP-2026-00021", student: { id: 5, full_name: "Ali Khan" } },
  currency: "CNY",
  subtotal: "34000.00",
  tax: "0.00",
  total: "34000.00",
  amount_paid: "10400.00",
  status: "partially_paid",
  issued_at: "2026-07-01T10:00:00Z",
  due_at: null,
  created_at: "2026-07-01T10:00:00Z",
}

const COMMISSION = {
  id: 9,
  status: "pending_arrival",
  currency: "CNY",
  expected_amount: "3400.00",
  eligible_amount: "0.00",
  invoiced_amount: "0.00",
  received_amount: "0.00",
  eligibility_confirmed_at: null,
  application: { id: 21, application_code: "APP-2026-00021", status: "accepted", student: { id: 5, full_name: "Ali Khan", student_code: "STU-2026-00005" } },
  university: { id: 1, name: "Jilin Medical University", code: "JLMU" },
  agreement: { id: 2, commission_type: "percent", commission_value: "12.00" },
  status_history: [
    { from_status: "expected", to_status: "pending_arrival", amount: null, reference: null, changed_by: "Finance", created_at: "2026-07-12T08:00:00Z" },
    { from_status: null, to_status: "expected", amount: "3400.00", reference: null, changed_by: "System", created_at: "2026-07-10T08:00:00Z" },
  ],
  payables: [],
  created_at: "2026-07-10T08:00:00Z",
}

beforeEach(() => {
  vi.restoreAllMocks()
})

it("lists invoices with party names and running paid amounts", async () => {
  useAuthStore.setState({ token: "t", user: makeUser(["finance.view.global"]) })
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      jsonResponse({ data: [INVOICE], meta: { current_page: 1, last_page: 1, per_page: 25, total: 1, from: 1, to: 1 } }),
    ),
  )

  renderWithProviders(<FinancePage />)

  expect(await screen.findByText("INV-2026-00001")).toBeInTheDocument()
  expect(screen.getByText("Ali Khan")).toBeInTheDocument()
  expect(screen.getByText("partially paid")).toBeInTheDocument()
})

it("renders the pipeline tiles from API meta", async () => {
  useAuthStore.setState({ token: "t", user: makeUser(["commission.view.global"]) })
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      jsonResponse({
        data: [COMMISSION],
        meta: { current_page: 1, last_page: 1, per_page: 25, total: 1, from: 1, to: 1 },
        pipeline: {
          pending_arrival: { count: 1, expected_total: 3120 },
          received: { count: 1, expected_total: 3400 },
        },
      }),
    ),
  )

  renderWithProviders(<CommissionsPage />)

  expect(await screen.findByText("Jilin Medical University")).toBeInTheDocument()
  expect(screen.getAllByText("pending arrival").length).toBeGreaterThanOrEqual(2) // tile + badge
  expect(screen.getByText("3,120 expected")).toBeInTheDocument()
})

function renderCommissionDetail() {
  return renderWithProviders(
    <Routes>
      <Route path="/commissions/:id" element={<CommissionDetailPage />} />
    </Routes>,
    { route: "/commissions/9" },
  )
}

it("shows the transition action to commission managers and surfaces engine 409s", async () => {
  useAuthStore.setState({
    token: "t",
    user: makeUser(["commission.view.global", "commission.manage.global"]),
  })
  const user = userEvent.setup()

  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes("/transition") && init?.method === "POST") {
        return Promise.resolve(
          jsonResponse({ message: "Not eligible: the student has not arrived/registered yet.", code: "CONFLICT" }, 409),
        )
      }
      return Promise.resolve(jsonResponse({ data: COMMISSION }))
    }),
  )

  renderCommissionDetail()

  const button = await screen.findByRole("button", { name: /Move to/ })
  expect(button).toHaveTextContent("eligible")

  await user.click(button)

  expect(await screen.findByRole("alert")).toHaveTextContent(/has not arrived/)
})

it("hides transition and payout actions from own-scope viewers", async () => {
  useAuthStore.setState({ token: "t", user: makeUser(["commission.view.own"]) })
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: COMMISSION })))

  renderCommissionDetail()

  await screen.findByText("Ali Khan")
  expect(screen.queryByRole("button", { name: /Move to/ })).not.toBeInTheDocument()
})

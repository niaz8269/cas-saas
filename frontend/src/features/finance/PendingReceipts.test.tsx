import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { useAuthStore } from "@/stores/auth"
import { jsonResponse, renderWithProviders } from "@/test/utils"

import FinancePage from "./FinancePage"

const row = (over: Record<string, unknown> = {}) => ({
  id: 7, invoice_no: "INV-2026-00007", party_type: "student", party_id: 1,
  party_name: "Ali Khan", application: null, currency: "USD",
  subtotal: 100, tax: 0, total: 100, amount_paid: 0, status: "issued",
  issued_at: null, due_at: null, created_at: null,
  pending_receipts_count: 1, ...over,
})

const page = (data: unknown[]) => ({
  data,
  meta: { current_page: 1, last_page: 1, per_page: 25, total: data.length, from: 1, to: data.length },
})

/**
 * A Response body reads once, so every call needs its own — the page runs two
 * queries against /invoices: the list in view, and the standing count of
 * receipts waiting on Finance.
 */
const serve = (data: unknown[]) =>
  vi.fn().mockImplementation(() => Promise.resolve(jsonResponse(page(data))))

beforeEach(() => {
  vi.restoreAllMocks()
  useAuthStore.setState({
    token: "t",
    user: { id: 1, name: "Fin", email: "f@cas.moe", phone: null, status: "active", roles: [], permissions: ["finance.view.global"], last_login_at: null },
  })
})

it("counts the receipts waiting on Finance, even before the filter is on", async () => {
  vi.stubGlobal("fetch", serve([row(), row({ id: 8, invoice_no: "INV-8" })]))

  renderWithProviders(<FinancePage />)

  await waitFor(() =>
    expect(screen.getByRole("button", { name: /Receipts to confirm/ })).toHaveTextContent("2"),
  )
  expect(screen.getByRole("button", { name: /Receipts to confirm/ })).toHaveAttribute("aria-pressed", "false")
})

it("flags the rows that are holding someone up", async () => {
  vi.stubGlobal("fetch", serve([row(), row({ id: 9, invoice_no: "INV-9", pending_receipts_count: 0 })]))

  renderWithProviders(<FinancePage />)

  expect(await screen.findAllByText("Receipt to confirm")).toHaveLength(1)
})

it("narrows the list to the queue when switched on", async () => {
  const user = userEvent.setup()
  const fetchMock = serve([row()])
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<FinancePage />)

  await user.click(await screen.findByRole("button", { name: /Receipts to confirm/ }))

  await waitFor(() => {
    expect(screen.getByRole("button", { name: /Receipts to confirm/ })).toHaveAttribute("aria-pressed", "true")

    const asked = fetchMock.mock.calls.some(([u]) => decodeURIComponent(String(u)).includes("filter[pending_receipt]=1"))
    expect(asked).toBe(true)
  })
})

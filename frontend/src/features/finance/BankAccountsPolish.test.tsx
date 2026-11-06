import { screen } from "@testing-library/react"
import { Route, Routes } from "react-router-dom"

import { useAuthStore } from "@/stores/auth"
import { jsonResponse, renderWithProviders } from "@/test/utils"
import type { AuthUser } from "@/types/auth"

import BankAccountsPage from "./BankAccountsPage"
import InvoiceDetailPage from "./InvoiceDetailPage"

const USER: AuthUser = {
  id: 4, name: "Fin", email: "f@cas.moe", phone: null, status: "active",
  roles: ["Finance"], permissions: ["finance.view.global", "finance.manage.global"], last_login_at: null,
}

const ACCOUNT = {
  id: 1, label: "BOC CNY", bank_name: "Bank of China", account_name: "CAS Ltd", account_number: "1234",
  iban: null, swift: null, bank_address: null, currency: "CNY", instructions: null,
  is_active: true, is_default: true, sort_order: 0,
}

beforeEach(() => {
  vi.restoreAllMocks()
  useAuthStore.setState({ token: "t", user: USER })
})

it("shows the Default badge only while the account is active", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: [{ ...ACCOUNT, is_active: false }] })))

  renderWithProviders(<BankAccountsPage />)

  expect(await screen.findByText("Inactive")).toBeInTheDocument()
  expect(screen.queryByText("Default")).not.toBeInTheDocument()
})

describe("invoice page with no usable account", () => {
  const INVOICE = {
    id: 7, invoice_no: "INV-2026-00007", party_type: "student", party_id: 5, party_name: "Ali Khan",
    currency: "USD", subtotal: "100.00", tax: "0.00", total: "100.00", amount_paid: "0.00",
    status: "issued", issued_at: null, due_at: null, created_at: null,
    items: [], payments: [], receipts: [], bank_account_id: null, bank_account: null,
  }

  function render() {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: RequestInfo | URL) =>
        Promise.resolve(String(input).includes("/bank-accounts") ? jsonResponse({ data: [ACCOUNT] }) : jsonResponse({ data: INVOICE })),
      ),
    )

    return renderWithProviders(
      <Routes><Route path="/finance/:id" element={<InvoiceDetailPage />} /></Routes>,
      { route: "/finance/7" },
    )
  }

  it("tells Finance when no active account matches the invoice currency", async () => {
    render()

    expect(await screen.findByText(/No active bank account for USD/)).toBeInTheDocument()
  })
})

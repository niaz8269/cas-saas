import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"

import { useAuthStore } from "@/stores/auth"
import { jsonResponse, renderWithProviders } from "@/test/utils"
import type { AuthUser } from "@/types/auth"

import BankAccountsPage from "./BankAccountsPage"
import InvoiceDetailPage from "./InvoiceDetailPage"

function makeUser(permissions: string[]): AuthUser {
  return {
    id: 4, name: "Fin", email: "f@cas.moe", phone: null, status: "active",
    roles: ["Finance"], permissions, last_login_at: null,
  }
}

const ACCOUNT = {
  id: 1, label: "BOC CNY Shanghai", bank_name: "Bank of China", account_name: "CAS Consultancy Ltd",
  account_number: "6217000000001234", iban: null, swift: "BKCHCNBJ300", bank_address: null,
  currency: "CNY", instructions: "Quote the invoice number.", is_active: true, is_default: true, sort_order: 0,
}

const OTHER = { ...ACCOUNT, id: 2, label: "ICBC USD", bank_name: "ICBC", account_number: "9999", currency: "USD", is_default: false }

beforeEach(() => {
  vi.restoreAllMocks()
})

describe("BankAccountsPage", () => {
  it("lists accounts with their details and a Default badge", async () => {
    useAuthStore.setState({ token: "t", user: makeUser(["finance.view.global"]) })
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: [ACCOUNT, OTHER] })))

    renderWithProviders(<BankAccountsPage />)

    expect(await screen.findByText("BOC CNY Shanghai")).toBeInTheDocument()
    expect(screen.getByText("6217000000001234")).toBeInTheDocument()
    expect(screen.getByText("Default")).toBeInTheDocument()
    expect(screen.getByText("ICBC USD")).toBeInTheDocument()
  })

  it("hides add, edit and remove from view-only staff", async () => {
    useAuthStore.setState({ token: "t", user: makeUser(["finance.view.global"]) })
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: [ACCOUNT] })))

    renderWithProviders(<BankAccountsPage />)

    await screen.findByText("BOC CNY Shanghai")
    expect(screen.queryByRole("button", { name: /Add account/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Edit/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Remove/ })).not.toBeInTheDocument()
  })

  it("shows an empty state with an add action for managers", async () => {
    useAuthStore.setState({ token: "t", user: makeUser(["finance.view.global", "finance.manage.global"]) })
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: [] })))

    renderWithProviders(<BankAccountsPage />)

    expect(await screen.findByText("No bank accounts yet")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /Add account/ }).length).toBeGreaterThan(0)
  })

  it("will not save until the four required fields are filled, then posts the account", async () => {
    useAuthStore.setState({ token: "t", user: makeUser(["finance.view.global", "finance.manage.global"]) })
    const user = userEvent.setup()
    const calls: { url: string; init?: RequestInit }[] = []

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ url: String(input), init })
        if (init?.method === "POST") return Promise.resolve(jsonResponse({ data: ACCOUNT }, 201))

        return Promise.resolve(jsonResponse({ data: [] }))
      }),
    )

    renderWithProviders(<BankAccountsPage />)

    await user.click((await screen.findAllByRole("button", { name: /Add account/ }))[0])
    const save = await screen.findByRole("button", { name: "Save" })
    expect(save).toBeDisabled()

    await user.type(screen.getByLabelText(/Label \(internal\)/), "BOC CNY")
    await user.type(screen.getByLabelText("Bank name"), "Bank of China")
    await user.type(screen.getByLabelText("Account name"), "CAS Ltd")
    expect(save).toBeDisabled()
    await user.type(screen.getByLabelText("Account number"), "12345")
    await user.type(screen.getByLabelText(/Currency/), "cny")
    expect(save).toBeEnabled()

    await user.click(save)

    await waitFor(() => expect(calls.some((c) => c.init?.method === "POST")).toBe(true))
    const post = calls.find((c) => c.init?.method === "POST")!
    expect(post.url).toContain("/bank-accounts")
    expect(JSON.parse(String(post.init!.body))).toMatchObject({
      label: "BOC CNY", bank_name: "Bank of China", account_name: "CAS Ltd",
      account_number: "12345", currency: "CNY", iban: null, is_active: true, is_default: false,
    })
  })

  it("surfaces a server error from a failed save", async () => {
    useAuthStore.setState({ token: "t", user: makeUser(["finance.view.global", "finance.manage.global"]) })
    const user = userEvent.setup()

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_input: RequestInfo | URL, init?: RequestInit) =>
        Promise.resolve(
          init?.method === "PATCH"
            ? jsonResponse({ message: "The label field is required.", code: "VALIDATION_ERROR" }, 422)
            : jsonResponse({ data: [ACCOUNT] }),
        ),
      ),
    )

    renderWithProviders(<BankAccountsPage />)

    await user.click(await screen.findByRole("button", { name: /Edit/ }))
    await user.click(await screen.findByRole("button", { name: "Save" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(/label field is required/)
  })
})

describe("Invoice 'Pay to' panel", () => {
  const INVOICE = {
    id: 7, invoice_no: "INV-2026-00007", party_type: "student", party_id: 5, party_name: "Ali Khan",
    currency: "CNY", subtotal: "500.00", tax: "0.00", total: "500.00", amount_paid: "0.00",
    status: "issued", issued_at: null, due_at: null, created_at: null,
    items: [], payments: [], receipts: [], bank_account_id: null, bank_account: null,
  }

  function renderInvoice() {
    return renderWithProviders(
      <Routes>
        <Route path="/finance/:id" element={<InvoiceDetailPage />} />
      </Routes>,
      { route: "/finance/7" },
    )
  }

  function stub(invoice: object, accounts = [ACCOUNT, OTHER]) {
    const calls: { url: string; init?: RequestInit }[] = []
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ url: String(input), init })
        const url = String(input)
        if (url.includes("/bank-accounts")) return Promise.resolve(jsonResponse({ data: accounts }))

        return Promise.resolve(jsonResponse({ data: invoice }))
      }),
    )

    return calls
  }

  it("shows the chosen account's details", async () => {
    useAuthStore.setState({ token: "t", user: makeUser(["finance.view.global"]) })
    stub({ ...INVOICE, bank_account_id: 1, bank_account: ACCOUNT })

    renderInvoice()

    expect(await screen.findByText("Pay to")).toBeInTheDocument()
    expect(screen.getByText("Bank of China")).toBeInTheDocument()
    expect(screen.getByText("6217000000001234")).toBeInTheDocument()
    expect(screen.getByText("BKCHCNBJ300")).toBeInTheDocument()
  })

  it("warns when no account has been chosen yet", async () => {
    useAuthStore.setState({ token: "t", user: makeUser(["finance.view.global"]) })
    stub(INVOICE)

    renderInvoice()

    expect(await screen.findByText(/No bank account chosen yet/)).toBeInTheDocument()
    // View-only staff cannot choose one.
    expect(screen.queryByLabelText(/Choose the bank account/)).not.toBeInTheDocument()
  })

  it("lets a manager pick an account in the invoice currency and posts it", async () => {
    useAuthStore.setState({ token: "t", user: makeUser(["finance.view.global", "finance.manage.global"]) })
    const user = userEvent.setup()
    const calls = stub(INVOICE)

    renderInvoice()

    const picker = await screen.findByLabelText(/Choose the bank account/)
    // The USD account is not offered on a CNY invoice.
    await waitFor(() => expect(screen.getByRole("option", { name: /BOC CNY Shanghai/ })).toBeInTheDocument())
    expect(screen.queryByRole("option", { name: /ICBC USD/ })).not.toBeInTheDocument()

    await user.selectOptions(picker, "1")

    await waitFor(() => expect(calls.some((c) => c.url.includes("/invoices/7/bank-account"))).toBe(true))
    const post = calls.find((c) => c.url.includes("/invoices/7/bank-account"))!
    expect(post.init?.method).toBe("POST")
    expect(JSON.parse(String(post.init!.body))).toEqual({ bank_account_id: 1 })
  })

  it("does not offer a picker on a settled invoice", async () => {
    useAuthStore.setState({ token: "t", user: makeUser(["finance.view.global", "finance.manage.global"]) })
    stub({ ...INVOICE, status: "paid", amount_paid: "500.00", bank_account_id: 1, bank_account: ACCOUNT })

    renderInvoice()

    await screen.findByText("Bank of China")
    expect(screen.queryByLabelText(/Choose the bank account/)).not.toBeInTheDocument()
  })
})

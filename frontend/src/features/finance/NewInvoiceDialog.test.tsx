import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import NewInvoiceDialog from "./NewInvoiceDialog"

const APPLICATION = {
  id: 21, application_code: "APP-2026-00021", student: { id: 5, full_name: "Ali Khan" },
  program: { id: 1, name: "MBBS" }, university: { id: 1, name: "Jilin Medical University" }, scholarship: null,
}

const SCHEDULE = {
  data: {
    party_type: "student", party_id: 5, application_id: 21, applicant: "Ali Khan", currency: "CNY",
    context: { application_code: "APP-2026-00021", student: "Ali Khan", program: "MBBS", university: "Jilin", scholarship: null },
    lines: [{ fee_type: "tuition", description: "Tuition", qty: 1, unit_price: 34000, currency: "CNY", currency_mismatch: false }],
  },
}

const CNY = { id: 1, label: "BOC CNY", bank_name: "Bank of China", currency: "CNY", is_active: true }
const USD = { id: 2, label: "ICBC USD", bank_name: "ICBC", currency: "USD", is_active: true }

function stub(created: { body?: unknown } = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes("/bank-accounts")) return Promise.resolve(jsonResponse({ data: [CNY, USD] }))
      if (url.includes("/invoices/fee-schedule")) return Promise.resolve(jsonResponse(SCHEDULE))
      if (url.includes("/applications")) {
        return Promise.resolve(jsonResponse({ data: [APPLICATION], meta: { current_page: 1, last_page: 1, per_page: 25, total: 1, from: 1, to: 1 } }))
      }
      if (url.endsWith("/invoices") && init?.method === "POST") {
        created.body = JSON.parse(String(init.body))

        return Promise.resolve(jsonResponse({ data: { id: 99 } }, 201))
      }

      return Promise.resolve(jsonResponse({ data: [] }))
    }),
  )
}

async function pickApplication(user: ReturnType<typeof userEvent.setup>) {
  await user.type(await screen.findByLabelText("Search applications"), "Ali")
  await user.click(await screen.findByText("APP-2026-00021"))
  await screen.findByLabelText("Bank account for this invoice")
}

beforeEach(() => {
  vi.restoreAllMocks()
})

it("will not issue an invoice until a bank account is chosen", async () => {
  const user = userEvent.setup()
  stub()

  renderWithProviders(<NewInvoiceDialog open onOpenChange={() => {}} />)
  await pickApplication(user)

  expect(screen.getByRole("button", { name: "Create & issue" })).toBeDisabled()

  await user.selectOptions(screen.getByLabelText("Bank account for this invoice"), "1")

  expect(screen.getByRole("button", { name: "Create & issue" })).toBeEnabled()
})

it("offers only accounts matching the invoice currency", async () => {
  const user = userEvent.setup()
  stub()

  renderWithProviders(<NewInvoiceDialog open onOpenChange={() => {}} />)
  await pickApplication(user)

  await waitFor(() => expect(screen.getByRole("option", { name: /BOC CNY/ })).toBeInTheDocument())
  expect(screen.queryByRole("option", { name: /ICBC USD/ })).not.toBeInTheDocument()
})

it("lets a draft be saved without an account", async () => {
  const user = userEvent.setup()
  stub()

  renderWithProviders(<NewInvoiceDialog open onOpenChange={() => {}} />)
  await pickApplication(user)

  await user.selectOptions(screen.getByDisplayValue("Issue now"), "draft")

  expect(screen.getByRole("button", { name: "Save draft" })).toBeEnabled()
})

it("sends the chosen account with the invoice", async () => {
  const user = userEvent.setup()
  const created: { body?: unknown } = {}
  stub(created)

  renderWithProviders(<NewInvoiceDialog open onOpenChange={() => {}} />)
  await pickApplication(user)

  await user.selectOptions(screen.getByLabelText("Bank account for this invoice"), "1")
  await user.click(screen.getByRole("button", { name: "Create & issue" }))

  await waitFor(() => expect(created.body).toBeDefined())
  expect(created.body).toMatchObject({ party_type: "student", party_id: 5, currency: "CNY", status: "issued", bank_account_id: 1 })
})

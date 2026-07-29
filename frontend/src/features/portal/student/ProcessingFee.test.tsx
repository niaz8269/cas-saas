import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import { ProcessingFeeNotice, ProcessingFeeStep } from "./ProcessingFee"

const INVOICE = {
  id: 7, invoice_no: "INV-2026-00007", total: 100, amount_paid: 0,
  currency: "USD", status: "issued", receipts: [],
}

const feeState = (over: Record<string, unknown> = {}) => ({
  data: {
    fee: { amount: 100, currency: "USD" },
    instructions: "Bank of China · A/C 1234567890 · SWIFT BKCHCNBJ",
    settled: false,
    invoice: INVOICE,
    ...over,
  },
})

beforeEach(() => vi.restoreAllMocks())

it("states the amount, that it is one-time, and that the university fee is separate", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(feeState())))

  renderWithProviders(<ProcessingFeeNotice open onAcknowledge={vi.fn()} onCancel={vi.fn()} />)

  expect(await screen.findByText(/One-time processing fee of 100 USD/)).toBeInTheDocument()
  expect(screen.getByText(/non-refundable/)).toBeInTheDocument()
  expect(screen.getByText(/separate from any application fee charged by the university/)).toBeInTheDocument()
})

it("cannot be dismissed into the wizard — acknowledging is a deliberate click", async () => {
  const user = userEvent.setup()
  const onAcknowledge = vi.fn()
  const onCancel = vi.fn()
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(feeState())))

  renderWithProviders(<ProcessingFeeNotice open onAcknowledge={onAcknowledge} onCancel={onCancel} />)

  await user.click(await screen.findByRole("button", { name: "I understand, continue" }))

  expect(onAcknowledge).toHaveBeenCalledOnce()
  expect(onCancel).not.toHaveBeenCalled()
})

it("tells a student who already paid that they are covered", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(feeState({ settled: true }))))

  renderWithProviders(<ProcessingFeeNotice open onAcknowledge={vi.fn()} onCancel={vi.fn()} />)

  expect(await screen.findByText("Your processing fee is already paid")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument()
})

it("shows what is owed, how to pay it, and the reference to quote", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(feeState())))

  renderWithProviders(<ProcessingFeeStep invoice={INVOICE} />)

  expect(screen.getByText("100 USD")).toBeInTheDocument() // straight from the submit response
  expect(await screen.findByText(/Bank of China/)).toBeInTheDocument() // arrives with the fee query
  expect(screen.getByText(/quote INV-2026-00007/)).toBeInTheDocument()
})

it("says who to ask when payment details are not published", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(feeState({ instructions: null }))))

  renderWithProviders(<ProcessingFeeStep invoice={INVOICE} />)

  expect(await screen.findByText(/contact your CAS counselor/)).toBeInTheDocument()
})

it("is explicit that a filed receipt is awaiting CAS, not submitted", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(feeState({
    invoice: { ...INVOICE, receipts: [{ id: 1, file_name: "receipt.jpg", status: "pending", uploaded_at: null }] },
  }))))

  renderWithProviders(<ProcessingFeeStep invoice={INVOICE} />)

  expect(await screen.findByText("receipt.jpg")).toBeInTheDocument()
  expect(screen.getByText("Awaiting confirmation")).toBeInTheDocument()
  expect(screen.getByText(/submitted automatically once it is confirmed/)).toBeInTheDocument()
})

it("confirms submission once Finance has settled the fee", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(feeState({ settled: true }))))

  renderWithProviders(<ProcessingFeeStep invoice={INVOICE} />)

  expect(await screen.findByText("Payment confirmed")).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /Upload/ })).not.toBeInTheDocument()
})

it("uploads a receipt through presign then registers it against the invoice", async () => {
  const user = userEvent.setup()
  const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.includes("/student/receipts/presign")) {
      return Promise.resolve(jsonResponse({ key: "students/1/abc_receipt.jpg", url: "https://minio.test/put", headers: {} }))
    }
    if (url === "https://minio.test/put") return Promise.resolve(new Response(null, { status: 200 }))
    if (url.includes("/student/invoices/7/receipt") && init?.method === "POST") {
      return Promise.resolve(jsonResponse({ data: { id: 1, file_name: "receipt.jpg", status: "pending", uploaded_at: null } }, 201))
    }
    return Promise.resolve(jsonResponse(feeState()))
  })
  vi.stubGlobal("fetch", fetchMock)

  const { container } = renderWithProviders(<ProcessingFeeStep invoice={INVOICE} />)

  const input = container.querySelector('input[type="file"]') as HTMLInputElement
  await user.upload(input, new File(["x"], "receipt.jpg", { type: "image/jpeg" }))

  await waitFor(() => {
    const registered = fetchMock.mock.calls.find(
      ([u, i]) => String(u).includes("/student/invoices/7/receipt") && (i as RequestInit)?.method === "POST",
    )
    expect(registered).toBeTruthy()
    expect(JSON.parse((registered![1] as RequestInit).body as string).key).toBe("students/1/abc_receipt.jpg")
  })
})

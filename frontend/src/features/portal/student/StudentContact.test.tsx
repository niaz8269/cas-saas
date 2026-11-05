import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { usePortalAuthStore } from "@/stores/portalAuth"
import { jsonResponse, renderWithProviders } from "@/test/utils"

import StudentContact from "./StudentContact"

beforeEach(() => {
  vi.restoreAllMocks()
  usePortalAuthStore.setState({
    token: "t", kind: "student",
    profile: { id: 5, name: "Ali Khan", email: null, status: "active", code: "STU-2026-00005" },
  })
})

it("offers WhatsApp, email and WeChat, with the student's code in the WhatsApp text", () => {
  renderWithProviders(<StudentContact />)

  const whatsapp = screen.getByRole("link", { name: /WhatsApp/ })
  expect(whatsapp.getAttribute("href")).toContain("https://wa.me/8617640412827?text=")
  expect(decodeURIComponent(whatsapp.getAttribute("href") ?? "")).toContain("STU-2026-00005")
  expect(screen.getByRole("link", { name: /Email/ })).toHaveAttribute("href", expect.stringContaining("mailto:enquiry@cas.moe"))
  expect(screen.getByText("CAS-KAMI")).toBeInTheDocument()
  expect(screen.getByAltText("CAS WeChat QR code")).toBeInTheDocument()
})

it("sends a message to the CAS team and confirms it", async () => {
  const user = userEvent.setup()
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { id: 3 } }, 201))
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<StudentContact />)

  const send = screen.getByRole("button", { name: "Send message" })
  expect(send).toBeDisabled() // nothing typed yet

  await user.type(screen.getByLabelText("Your message"), "When will my offer letter arrive?")
  await user.click(send)

  expect(await screen.findByText(/Message sent/)).toBeInTheDocument()
  const [url, init] = fetchMock.mock.calls[0]
  expect(String(url)).toContain("/student/messages")
  expect(JSON.parse(init.body)).toEqual({ body: "When will my offer letter arrive?" })
})

it("tells the student when the message could not be sent", async () => {
  const user = userEvent.setup()
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ message: "Server error" }, 500)))

  renderWithProviders(<StudentContact />)

  await user.type(screen.getByLabelText("Your message"), "Please help me with my visa.")
  await user.click(screen.getByRole("button", { name: "Send message" }))

  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/could not send/))
})

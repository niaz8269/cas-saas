import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { useAuthStore } from "@/stores/auth"
import { jsonResponse, renderWithProviders } from "@/test/utils"
import type { AuthUser } from "@/types/auth"

import SettingsPage from "./SettingsPage"

function makeUser(): AuthUser {
  return {
    id: 1, name: "Admin", email: "admin@cas.moe", phone: null, status: "active",
    roles: ["Admin"], permissions: ["settings.manage.global"], last_login_at: null,
  }
}

const RULES = { data: [{ id: 1, name: "Email the student when an offer arrives", trigger_def: { event: "application.status", to: "offer_received" }, conditions: {}, actions: [{ type: "communication", channel: "email", template: "offer_received", target: "student" }], is_active: true }] }
const TEMPLATES = { data: [{ key: "welcome", subject: "Welcome to CAS Education", preview: "Dear {first_name}, welcome…" }] }

beforeEach(() => {
  vi.restoreAllMocks()
  useAuthStore.setState({ token: "t", user: makeUser() })
})

it("surfaces automations, templates and channel config", async () => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation((input: RequestInfo | URL) =>
    Promise.resolve(jsonResponse(String(input).includes("message-templates") ? TEMPLATES : RULES)),
  ))

  renderWithProviders(<SettingsPage />)

  expect(await screen.findByText("Email the student when an offer arrives")).toBeInTheDocument()
  expect(screen.getByText(/offer received/)).toBeInTheDocument() // rule summary
  expect(screen.getByText("Welcome to CAS Education")).toBeInTheDocument()
  expect(screen.getByText(/WhatsApp \/ SMS/)).toBeInTheDocument() // channels section
})

it("fires a template test send and confirms delivery", async () => {
  const user = userEvent.setup()
  const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.includes("/test") && init?.method === "POST") {
      return Promise.resolve(jsonResponse({ data: {
        template: "welcome", channel: "email", to: "admin@cas.moe",
        subject: "Welcome to CAS Education", body: "Dear Sample…", status: "sent",
      } }))
    }
    return Promise.resolve(jsonResponse(url.includes("message-templates") ? TEMPLATES : RULES))
  })
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<SettingsPage />)

  await user.click(await screen.findByRole("button", { name: /Send test/ }))
  await user.click(await screen.findByRole("button", { name: "Send" }))

  expect(await screen.findByText(/Sent to/)).toHaveTextContent("admin@cas.moe")
  expect(fetchMock).toHaveBeenCalledWith(
    "/api/v1/message-templates/welcome/test",
    expect.objectContaining({ method: "POST" }),
  )
})

it("shows access denied on 403", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ message: "no", code: "FORBIDDEN" }, 403)))

  renderWithProviders(<SettingsPage />)

  expect(await screen.findByText("Access denied")).toBeInTheDocument()
})

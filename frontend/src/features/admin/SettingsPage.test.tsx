import { screen } from "@testing-library/react"

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

it("shows access denied on 403", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ message: "no", code: "FORBIDDEN" }, 403)))

  renderWithProviders(<SettingsPage />)

  expect(await screen.findByText("Access denied")).toBeInTheDocument()
})

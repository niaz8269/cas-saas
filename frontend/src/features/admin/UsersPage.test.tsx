import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { useAuthStore } from "@/stores/auth"
import { jsonResponse, renderWithProviders } from "@/test/utils"
import type { AuthUser } from "@/types/auth"

import UsersPage from "./UsersPage"

function makeUser(): AuthUser {
  return {
    id: 1, name: "Admin", email: "admin@cas.moe", phone: null, status: "active",
    roles: ["Admin"], permissions: ["users.manage.global"], last_login_at: null,
  }
}

const USERS = {
  data: [
    { id: 2, name: "Cara Counselor", email: "counselor@cas.moe", phone: null, status: "active", roles: ["Counselor"], branch: { id: 1, name: "HQ", code: "HQ" }, department: { id: 1, name: "Admissions", code: "ADM" }, last_login_at: "2026-07-17T09:00:00Z" },
  ],
  meta: { current_page: 1, last_page: 1, per_page: 25, total: 1, from: 1, to: 1 },
}

const AUDIT = {
  data: [
    { id: 9, action: "update", entity_type: "Student", entity_id: 5, actor: "Admin", old_values: { status: "active" }, new_values: { status: "arrived" }, ip: "127.0.0.1", created_at: "2026-07-17T10:00:00Z" },
  ],
  meta: { current_page: 1, last_page: 1, total: 1, from: 1, to: 1 },
}

beforeEach(() => {
  vi.restoreAllMocks()
  useAuthStore.setState({ token: "t", user: makeUser() })
})

it("lists staff with roles and status", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(USERS)))

  renderWithProviders(<UsersPage />)

  expect(await screen.findByText("Cara Counselor")).toBeInTheDocument()
  expect(screen.getByText("Counselor")).toBeInTheDocument()
  expect(screen.getByText("Admissions")).toBeInTheDocument()
})

it("switches to the audit trail and shows a change diff", async () => {
  const user = userEvent.setup()
  vi.stubGlobal("fetch", vi.fn().mockImplementation((input: RequestInfo | URL) =>
    Promise.resolve(jsonResponse(String(input).includes("/audit-logs") ? AUDIT : USERS)),
  ))

  renderWithProviders(<UsersPage />)

  await user.click(screen.getByRole("button", { name: "Audit trail" }))

  expect(await screen.findByText("Student")).toBeInTheDocument()
  expect(screen.getByText("update")).toBeInTheDocument()
  expect(screen.getByText("active")).toBeInTheDocument() // old value
  expect(screen.getByText("arrived")).toBeInTheDocument() // new value
})

it("creates a user with a role from the New user dialog", async () => {
  const user = userEvent.setup()
  const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? "GET"
    if (url.includes("/roles")) return Promise.resolve(jsonResponse({ data: [{ id: 4, name: "Counselor" }, { id: 1, name: "Super Admin" }] }))
    if (url.includes("/branches")) return Promise.resolve(jsonResponse({ data: [{ id: 1, name: "HQ", code: "HQ" }] }))
    if (url.includes("/departments")) return Promise.resolve(jsonResponse({ data: [{ id: 1, name: "Admissions", code: "ADM" }] }))
    if (url.includes("/users") && method === "POST") {
      return Promise.resolve(jsonResponse({ data: { id: 3, name: "New Person", email: "new@cas.moe", status: "active", roles: ["Counselor"], last_login_at: null } }, 201))
    }

    return Promise.resolve(jsonResponse(USERS))
  })
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<UsersPage />)
  await screen.findByText("Cara Counselor")

  await user.click(screen.getByRole("button", { name: /New user/ }))
  const dialog = await screen.findByRole("dialog")

  await user.type(within(dialog).getByLabelText("Full name"), "New Person")
  await user.type(within(dialog).getByLabelText("Email"), "new@cas.moe")
  await user.type(within(dialog).getByLabelText("Password"), "secret-pass-123")
  await user.click(await within(dialog).findByLabelText("Counselor"))
  await user.click(within(dialog).getByRole("button", { name: "Create user" }))

  const post = fetchMock.mock.calls.find(([u, i]) => String(u).includes("/users") && (i?.method === "POST"))
  expect(post).toBeTruthy()
  const body = JSON.parse((post![1] as RequestInit).body as string)
  expect(body).toMatchObject({ name: "New Person", email: "new@cas.moe", roles: ["Counselor"] })
})

it("hides the Super Admin role from a non-super-admin", async () => {
  const user = userEvent.setup()
  vi.stubGlobal("fetch", vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes("/roles")) return Promise.resolve(jsonResponse({ data: [{ id: 4, name: "Counselor" }, { id: 1, name: "Super Admin" }] }))
    if (url.includes("/branches")) return Promise.resolve(jsonResponse({ data: [] }))
    if (url.includes("/departments")) return Promise.resolve(jsonResponse({ data: [] }))

    return Promise.resolve(jsonResponse(USERS))
  }))

  renderWithProviders(<UsersPage />)
  await screen.findByText("Cara Counselor")
  await user.click(screen.getByRole("button", { name: /New user/ }))
  const dialog = await screen.findByRole("dialog")

  expect(await within(dialog).findByLabelText("Counselor")).toBeInTheDocument()
  expect(within(dialog).queryByLabelText("Super Admin")).not.toBeInTheDocument()
})

it("shows access denied on a 403", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ message: "forbidden", code: "FORBIDDEN" }, 403)))

  renderWithProviders(<UsersPage />)

  expect(await screen.findByText("Access denied")).toBeInTheDocument()
})

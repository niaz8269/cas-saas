import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { useAuthStore } from "@/stores/auth"
import { jsonResponse, renderWithProviders } from "@/test/utils"
import type { AuthUser } from "@/types/auth"

import NotificationsBell from "./NotificationsBell"

function makeUser(): AuthUser {
  return {
    id: 1, name: "Demo Counselor", email: "counselor@cas.moe", phone: null,
    status: "active", roles: ["Counselor"], permissions: [], last_login_at: null,
  }
}

const NOTIFICATIONS = [
  { id: 1, type: "task.assigned", title: "Qualify programs for Ali Khan", body: "Due in 3 days", channels: ["in_app"], read_at: null, created_at: "2026-07-17T09:00:00Z" },
  { id: 2, type: "application.offer_received", title: "Offer received: Ali Khan", body: null, channels: ["in_app"], read_at: "2026-07-16T09:00:00Z", created_at: "2026-07-16T09:00:00Z" },
]

beforeEach(() => {
  vi.restoreAllMocks()
  useAuthStore.setState({ token: "t", user: makeUser() })
})

it("shows the unread badge from the count endpoint", async () => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation((input: RequestInfo | URL) => {
    if (String(input).includes("unread-count")) return Promise.resolve(jsonResponse({ unread: 3 }))
    return Promise.resolve(jsonResponse({ data: [], meta: { unread: 3, current_page: 1, last_page: 1, total: 0 } }))
  }))

  renderWithProviders(<NotificationsBell />)

  expect(await screen.findByText("3")).toBeInTheDocument()
  expect(screen.getByLabelText("Notifications, 3 unread")).toBeInTheDocument()
})

it("opens the dropdown and lists notifications", async () => {
  const user = userEvent.setup()
  vi.stubGlobal("fetch", vi.fn().mockImplementation((input: RequestInfo | URL) => {
    if (String(input).includes("unread-count")) return Promise.resolve(jsonResponse({ unread: 1 }))
    return Promise.resolve(jsonResponse({ data: NOTIFICATIONS, meta: { unread: 1, current_page: 1, last_page: 1, total: 2 } }))
  }))

  renderWithProviders(<NotificationsBell />)

  await user.click(await screen.findByLabelText(/Notifications/))

  expect(await screen.findByText("Qualify programs for Ali Khan")).toBeInTheDocument()
  expect(screen.getByText("Offer received: Ali Khan")).toBeInTheDocument()
})

it("marks all read", async () => {
  const user = userEvent.setup()
  const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).includes("read-all") && init?.method === "POST") return Promise.resolve(jsonResponse({ unread: 0 }))
    if (String(input).includes("unread-count")) return Promise.resolve(jsonResponse({ unread: 2 }))
    return Promise.resolve(jsonResponse({ data: NOTIFICATIONS, meta: { unread: 2, current_page: 1, last_page: 1, total: 2 } }))
  })
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<NotificationsBell />)

  await user.click(await screen.findByLabelText(/Notifications/))
  await user.click(await screen.findByRole("button", { name: "Mark all read" }))

  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
    "/api/v1/notifications/read-all",
    expect.objectContaining({ method: "POST" }),
  ))
})

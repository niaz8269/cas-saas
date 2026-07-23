import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import PortalNotificationBell from "./PortalNotificationBell"

function stubFetch(unread: number, list: unknown[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes("/notifications/unread-count")) return Promise.resolve(jsonResponse({ unread }))
      if (url.includes("/notifications")) return Promise.resolve(jsonResponse({ data: list, meta: { unread } }))
      return Promise.resolve(jsonResponse({}))
    }),
  )
}

it("shows the unread badge and lists notifications when opened", async () => {
  const user = userEvent.setup()
  stubFetch(2, [
    {
      id: 1,
      type: "application.offer_received",
      title: "Application update",
      body: "Your application APP-2026-00021 received an offer.",
      read_at: null,
      created_at: new Date().toISOString(),
    },
  ])

  renderWithProviders(<PortalNotificationBell kind="student" />)

  // Unread badge from the polled count.
  expect(await screen.findByText("2")).toBeInTheDocument()

  await user.click(screen.getByRole("button", { name: /2 unread/ }))

  expect(await screen.findByText("Application update")).toBeInTheDocument()
  expect(screen.getByText(/received an offer/)).toBeInTheDocument()
})

it("shows an empty state when there is nothing to read", async () => {
  const user = userEvent.setup()
  stubFetch(0, [])

  renderWithProviders(<PortalNotificationBell kind="agent" />)

  await user.click(screen.getByRole("button", { name: "Notifications" }))

  expect(await screen.findByText("You're all caught up.")).toBeInTheDocument()
})

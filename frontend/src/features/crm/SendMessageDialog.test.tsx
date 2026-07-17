import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import SendMessageDialog from "./SendMessageDialog"

beforeEach(() => {
  vi.restoreAllMocks()
})

it("queues a templated message", async () => {
  const user = userEvent.setup()
  const fetchMock = vi.fn().mockResolvedValue(
    jsonResponse({ data: { id: 1, channel: "email", template: "welcome", status: "queued", created_at: null } }, 202),
  )
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<SendMessageDialog studentId="5" />)

  await user.click(screen.getByRole("button", { name: /Send message/ }))
  await user.click(await screen.findByRole("button", { name: "Send" }))

  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
    "/api/v1/students/5/communications",
    expect.objectContaining({ method: "POST" }),
  ))

  const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
  expect(body).toMatchObject({ channel: "email", template: "welcome" })
})

it("surfaces a server error", async () => {
  const user = userEvent.setup()
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
    jsonResponse({ message: "This action is unauthorized.", code: "FORBIDDEN" }, 403),
  ))

  renderWithProviders(<SendMessageDialog studentId="5" />)

  await user.click(screen.getByRole("button", { name: /Send message/ }))
  await user.click(await screen.findByRole("button", { name: "Send" }))

  expect(await screen.findByRole("alert")).toHaveTextContent(/unauthorized/)
})

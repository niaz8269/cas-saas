import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { useAuthStore } from "@/stores/auth"
import { jsonResponse, renderWithProviders } from "@/test/utils"
import type { AuthUser } from "@/types/auth"

import AddLeadDialog from "./AddLeadDialog"

function makeUser(permissions: string[]): AuthUser {
  return {
    id: 7,
    name: "Demo Counselor",
    email: "counselor@cas.moe",
    phone: null,
    status: "active",
    roles: ["Counselor"],
    permissions,
    last_login_at: null,
  }
}

beforeEach(() => {
  vi.restoreAllMocks()
})

it("adds a lead and posts to the API", async () => {
  const user = userEvent.setup()
  useAuthStore.setState({ token: "t", user: makeUser(["leads.create.assigned"]) })

  const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.includes("/leads/sources")) {
      return Promise.resolve(jsonResponse({ data: [{ id: 1, name: "Walk-in", channel: "direct" }] }))
    }
    if (init?.method === "POST") {
      return Promise.resolve(jsonResponse({ data: { id: 5 } }, 201))
    }
    return Promise.resolve(jsonResponse({ data: [] }))
  })
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<AddLeadDialog />)

  await user.click(screen.getByRole("button", { name: /New lead/ }))
  const dialog = await screen.findByRole("dialog")
  await user.type(within(dialog).getByLabelText(/First name/), "Ayesha")
  await user.type(within(dialog).getByLabelText("Email"), "ayesha@example.com")
  await user.click(within(dialog).getByRole("button", { name: "Add lead" }))

  await vi.waitFor(() => {
    const posted = fetchMock.mock.calls.find(
      ([url, init]) => String(url).endsWith("/leads") && (init as RequestInit | undefined)?.method === "POST",
    )
    expect(posted).toBeTruthy()
    expect(JSON.parse((posted![1] as RequestInit).body as string)).toMatchObject({
      first_name: "Ayesha",
      email: "ayesha@example.com",
      assigned_user_id: 7, // counselor auto-assigned to self
    })
  })
})

it("hides the assignee picker from users without assign permission", async () => {
  const user = userEvent.setup()
  useAuthStore.setState({ token: "t", user: makeUser(["leads.create.assigned"]) })
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: [] })))

  renderWithProviders(<AddLeadDialog />)
  await user.click(screen.getByRole("button", { name: /New lead/ }))
  const dialog = await screen.findByRole("dialog")

  expect(within(dialog).queryByLabelText(/Assign to/)).not.toBeInTheDocument()
})

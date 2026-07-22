import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { useAuthStore } from "@/stores/auth"
import { jsonResponse, renderWithProviders } from "@/test/utils"
import type { AuthUser } from "@/types/auth"

import ContentPage from "./ContentPage"

function makeUser(permissions: string[]): AuthUser {
  return { id: 1, name: "Admin", email: "a@cas.moe", phone: null, status: "active", roles: ["Admin"], permissions, last_login_at: null }
}

const POST = {
  id: 3, type: "news", title: "Study in China 2026", slug: "study-in-china-2026", excerpt: null, body: null,
  cover_image_url: null, category: null, status: "published", published_at: "2026-07-20T00:00:00Z",
  author: "Admin", event_date: null, location: null, register_url: null, created_at: null, updated_at: null,
}
const LIST = { data: [POST], meta: { current_page: 1, last_page: 1, per_page: 20, total: 1, from: 1, to: 1 } }

beforeEach(() => {
  vi.restoreAllMocks()
  useAuthStore.setState({ token: "t", user: makeUser(["content.view.global", "content.manage.global"]) })
})

it("lists posts and creates a new one", async () => {
  const user = userEvent.setup()
  const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = (init?.method ?? "GET").toUpperCase()
    if (method === "POST" && url.includes("/posts")) return Promise.resolve(jsonResponse({ data: { ...POST, id: 99 } }, 201))

    return Promise.resolve(jsonResponse(LIST))
  })
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<ContentPage />)

  expect(await screen.findByText("Study in China 2026")).toBeInTheDocument()

  await user.click(screen.getByRole("button", { name: /New post/ }))
  await user.type(screen.getByLabelText("Title"), "My new post")
  await user.click(screen.getByRole("button", { name: "Create post" }))

  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/posts", expect.objectContaining({ method: "POST" })))
  const call = fetchMock.mock.calls.find(([u, i]) => u === "/api/v1/posts" && (i as RequestInit)?.method === "POST")!
  const body = JSON.parse((call[1] as RequestInit).body as string)
  expect(body).toMatchObject({ type: "news", title: "My new post", status: "draft" })
})

it("hides create/edit controls without the manage permission", async () => {
  useAuthStore.setState({ token: "t", user: makeUser(["content.view.global"]) })
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(LIST)))

  renderWithProviders(<ContentPage />)

  expect(await screen.findByText("Study in China 2026")).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /New post/ })).not.toBeInTheDocument()
})

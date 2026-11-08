import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { useAuthStore } from "@/stores/auth"
import { jsonResponse, renderWithProviders } from "@/test/utils"

import HomePageManager from "./HomePageManager"

const sec = (id: number, key: string, over: object = {}) => ({ id, key, type: key.startsWith("custom-") ? "banner" : key, sort_order: id * 10, is_visible: true, content: null, ...over })
const ROWS = [sec(1, "hero"), sec(2, "cities"), sec(3, "highlights", { content: { en: { texts: { title: "Why us" } } } }), sec(4, "custom-abc123", { content: { en: { texts: { title: "Open day" } } } })]

beforeEach(() => {
  vi.restoreAllMocks()
  useAuthStore.setState({ token: "t", user: { id: 1, name: "Admin", email: "a@x.com", roles: ["Super Admin"], permissions: [], last_login_at: null } as never })
})

function mockApi() {
  const fetchMock = vi.fn().mockImplementation((_u: string, init?: RequestInit) => Promise.resolve(
    init?.method && init.method !== "GET" ? jsonResponse({ data: ROWS[0] }) : jsonResponse({ data: ROWS }),
  ))
  vi.stubGlobal("fetch", fetchMock)

  return fetchMock
}

const calls = (fetchMock: ReturnType<typeof vi.fn>, method: string) => fetchMock.mock.calls.filter(([, init]) => init?.method === method)

it("lists the sections in order, marking the top banner, edited, hidden and added ones", async () => {
  mockApi()
  renderWithProviders(<HomePageManager />)

  expect(await screen.findByText("Top banner")).toBeInTheDocument()
  expect(screen.getByText("Always first")).toBeInTheDocument()
  expect(screen.getByText("Study by city")).toBeInTheDocument()
  expect(screen.getByText("Added by you")).toBeInTheDocument()
  expect(screen.getAllByText("Edited")).toHaveLength(2)
  // The top banner can be neither moved nor hidden.
  expect(screen.getByRole("button", { name: "Move Top banner up" })).toBeDisabled()
  expect(screen.getByRole("button", { name: "Move Top banner down" })).toBeDisabled()
  expect(screen.getByRole("button", { name: "Hide Top banner" })).toBeDisabled()
  // The first movable section cannot go above the banner.
  expect(screen.getByRole("button", { name: "Move Study by city up" })).toBeDisabled()
})

it("moves a section down and sends the new order", async () => {
  const user = userEvent.setup()
  const fetchMock = mockApi()
  renderWithProviders(<HomePageManager />)

  await user.click(await screen.findByRole("button", { name: "Move Study by city down" }))

  const post = calls(fetchMock, "POST").find(([u]) => String(u).endsWith("/home-sections/reorder"))!
  expect(JSON.parse(post[1].body)).toEqual({ order: [1, 3, 2, 4] })
})

it("hides a section", async () => {
  const user = userEvent.setup()
  const fetchMock = mockApi()
  renderWithProviders(<HomePageManager />)

  await user.click(await screen.findByRole("button", { name: "Hide Study by city" }))

  const patch = calls(fetchMock, "PATCH")[0]
  expect(String(patch[0])).toBe("/api/v1/home-sections/2")
  expect(JSON.parse(patch[1].body)).toEqual({ is_visible: false })
})

it("edits a section's text, showing the standard text as a hint, and saves only what changed", async () => {
  const user = userEvent.setup()
  const fetchMock = mockApi()
  renderWithProviders(<HomePageManager />)

  await user.click(within((await screen.findByText("Top banner")).closest("li") as HTMLElement).getByRole("button", { name: /Edit/ }))

  const headline = await screen.findByLabelText("Headline")
  expect(headline).toHaveAttribute("placeholder", "Study in China")
  await user.type(headline, "Your future starts here")
  await user.click(screen.getByRole("button", { name: "Save changes" }))

  await vi.waitFor(() => expect(calls(fetchMock, "PATCH").length).toBe(1))
  const patch = calls(fetchMock, "PATCH")[0]
  expect(String(patch[0])).toBe("/api/v1/home-sections/1")
  expect(JSON.parse(patch[1].body)).toEqual({ content: { en: { texts: { title: "Your future starts here" } } } })
})

it("edits a list: starts from the standard items and can add one", async () => {
  const user = userEvent.setup()
  const fetchMock = mockApi()
  renderWithProviders(<HomePageManager />)

  await user.click(within((await screen.findByText("Top banner")).closest("li") as HTMLElement).getByRole("button", { name: /Edit/ }))
  await user.click(await screen.findByRole("button", { name: "Edit this list" }))
  expect(screen.getByLabelText("Remove item 4")).toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: /Add/ }))
  await user.type(screen.getByLabelText("Label", { selector: "#hs-popular-4-label" }), "Medicine")
  await user.type(screen.getByLabelText("Link", { selector: "#hs-popular-4-to" }), "/site/programs?q=MBBS")
  await user.click(screen.getByRole("button", { name: "Save changes" }))

  await vi.waitFor(() => expect(calls(fetchMock, "PATCH").length).toBe(1))
  const popular = JSON.parse(calls(fetchMock, "PATCH")[0][1].body).content.en.lists.popular
  expect(popular).toHaveLength(5)
  expect(popular[4]).toEqual({ label: "Medicine", to: "/site/programs?q=MBBS" })
})

it("adds a banner and opens it for editing", async () => {
  const user = userEvent.setup()
  const fetchMock = mockApi()
  renderWithProviders(<HomePageManager />)

  await user.click(await screen.findByRole("button", { name: /Add section/ }))
  await user.click(screen.getByRole("button", { name: /^Banner A highlighted box/ }))

  expect(JSON.parse(calls(fetchMock, "POST").find(([u]) => String(u).endsWith("/home-sections"))![1].body)).toEqual({ type: "banner" })
  expect(await screen.findByRole("button", { name: "Save changes" })).toBeInTheDocument()
})

it("deletes only sections that were added", async () => {
  const user = userEvent.setup()
  const fetchMock = mockApi()
  vi.spyOn(window, "confirm").mockReturnValue(true)
  renderWithProviders(<HomePageManager />)

  await screen.findByText("Top banner")
  expect(screen.queryByRole("button", { name: "Delete Study by city" })).not.toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: /Delete Banner: Open day/ }))

  expect(calls(fetchMock, "DELETE")[0][0]).toBe("/api/v1/home-sections/4")
})

it("resets an edited standard section to the standard text", async () => {
  const user = userEvent.setup()
  const fetchMock = mockApi()
  vi.spyOn(window, "confirm").mockReturnValue(true)
  renderWithProviders(<HomePageManager />)

  await user.click(await screen.findByRole("button", { name: /Reset Highlights to the standard text/ }))

  expect(String(calls(fetchMock, "POST").pop()![0])).toBe("/api/v1/home-sections/3/reset")
})

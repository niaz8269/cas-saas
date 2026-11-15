import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import HomeSpotlightManager from "./HomeSpotlightManager"

const LIMITS = { hero_universities: 3, update_universities: 6, update_programs: 6, update_scholarships: 6, update_posts: 6 }
const EMPTY = { hero_universities: [], update_universities: [], update_programs: [], update_scholarships: [], update_posts: [] }
const PICKED = { ...EMPTY, hero_universities: [{ id: 1, label: "Zhejiang University", sub: "Hangzhou" }, { id: 2, label: "Fudan University", sub: "Shanghai" }] }

function mockApi(initial: Record<string, unknown> = PICKED) {
  const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (String(url).includes("/home-spotlight/options/")) return Promise.resolve(jsonResponse({ data: [{ id: 3, label: "Peking University", sub: "Beijing" }] }))
    if (init?.method === "PUT") return Promise.resolve(jsonResponse({ data: PICKED }))

    return Promise.resolve(jsonResponse({ data: initial, limits: LIMITS }))
  })
  vi.stubGlobal("fetch", fetchMock)

  return fetchMock
}

it("shows what is picked, and says a list with nothing picked is automatic", async () => {
  mockApi()
  renderWithProviders(<HomeSpotlightManager canManage />)

  expect(await screen.findByText("Zhejiang University")).toBeInTheDocument()
  expect(screen.getByText(/up to 3 · 2 chosen/)).toBeInTheDocument()
  expect(screen.getAllByText(/automatic for now/).length).toBe(4)
})

it("reorders by hand, adds from a search and sends the new order", async () => {
  const user = userEvent.setup()
  const fetchMock = mockApi()
  renderWithProviders(<HomeSpotlightManager canManage />)
  await screen.findByText("Zhejiang University")

  await user.click(screen.getByRole("button", { name: "Move Zhejiang University down" }))
  await user.type(screen.getByRole("textbox", { name: "Add a university to hero_universities" }), "peki")
  await user.click(await screen.findByRole("button", { name: /Peking University/ }))
  await user.click(screen.getByRole("button", { name: "Save order" }))

  const put = fetchMock.mock.calls.find(([, init]) => init?.method === "PUT")
  expect(JSON.parse((put![1] as RequestInit).body as string).lists.hero_universities).toEqual([2, 1, 3])
})

it("stops adding once a list is full and lets an item be removed", async () => {
  const user = userEvent.setup()
  mockApi({ ...EMPTY, hero_universities: [{ id: 1, label: "A", sub: null }, { id: 2, label: "B", sub: null }, { id: 3, label: "C", sub: null }] })
  renderWithProviders(<HomeSpotlightManager canManage />)

  expect(await screen.findByRole("textbox", { name: "Add a university to hero_universities" })).toBeDisabled()
  await user.click(screen.getByRole("button", { name: "Remove B" }))
  expect(screen.queryByText("B")).not.toBeInTheDocument()
  expect(screen.getByRole("textbox", { name: "Add a university to hero_universities" })).toBeEnabled()
})

it("is read-only without permission to manage", async () => {
  mockApi()
  renderWithProviders(<HomeSpotlightManager canManage={false} />)

  await screen.findByText("Zhejiang University")
  expect(screen.queryByRole("button", { name: "Save order" })).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /Move Zhejiang University/ })).not.toBeInTheDocument()
})

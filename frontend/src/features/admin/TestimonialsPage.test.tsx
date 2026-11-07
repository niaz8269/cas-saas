import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import TestimonialsPage from "./TestimonialsPage"

beforeEach(() => vi.restoreAllMocks())

const row = (over: object = {}) => ({
  id: 1, audience: "student", name: "Sara", headline: "MBBS student", country: "Pakistan",
  quote: "They answered every question quickly.", consent_public: true, status: "pending", sort_order: 0, created_at: null, ...over,
})

it("lists what needs review and publishes one on click", async () => {
  const user = userEvent.setup()
  const fetchMock = vi.fn().mockImplementation((_u: string, init?: RequestInit) =>
    Promise.resolve(init?.method === "PATCH"
      ? jsonResponse({ data: row({ status: "approved" }) })
      : jsonResponse({ data: [row()], meta: { current_page: 1, last_page: 1, total: 1 } })))
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<TestimonialsPage />)

  expect(await screen.findByText(/They answered every question quickly/)).toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: /Publish/ }))

  const patch = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH")!
  expect(String(patch[0])).toBe("/api/v1/testimonials/1")
  expect(JSON.parse(patch[1].body)).toEqual({ status: "approved" })
})

it("will not offer to publish words the author did not consent to", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: [row({ consent_public: false })], meta: { current_page: 1, last_page: 1, total: 1 } })))

  renderWithProviders(<TestimonialsPage />)

  expect(await screen.findByText("No consent")).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /Publish/ })).not.toBeInTheDocument()
})

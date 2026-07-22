import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import HeroUpdates from "./HeroUpdates"

const POST = {
  id: 1, type: "news", title: "March 2026 intake open", slug: "march-2026-intake",
  excerpt: null, body: null, cover_image_url: null, category: null,
  published_at: "2026-07-20T00:00:00Z", author: "CAS", event_date: null, location: null, register_url: null,
}
const LIST = { data: [POST], meta: { current_page: 1, last_page: 1, total: 1, from: 1, to: 1 } }

beforeEach(() => vi.restoreAllMocks())

it("wires the New Stories tab to the latest published posts", async () => {
  const user = userEvent.setup()
  // Opening the panel fires both the scholarships and posts queries; return a
  // fresh response per call so each can read the body once.
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(jsonResponse(LIST))))

  renderWithProviders(<HeroUpdates universities={[]} programs={[]} />)

  await user.click(screen.getByRole("button", { name: "Show latest updates" }))
  await user.click(screen.getByRole("button", { name: "New Stories" }))

  const link = await screen.findByRole("link", { name: /March 2026 intake open/ })
  expect(link).toHaveAttribute("href", "/site/news/march-2026-intake")
})

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

it("shows a university's real closing date, and no date when it has no open window", async () => {
  const user = userEvent.setup()
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ data: [] }))))
  const base = { id: 1, name: "Zhejiang University", slug: "zju", city: "Hangzhou" }
  const universities = [
    { ...base, open_deadline: "2027-03-31" },
    { ...base, id: 2, name: "Fudan University", slug: "fudan", city: "Shanghai", open_deadline: null },
  ] as never

  renderWithProviders(<HeroUpdates universities={universities} programs={[]} />)
  await user.click(screen.getByRole("button", { name: "Show latest updates" }))

  expect(screen.getByText("(Last application: Mar 31, 2027)")).toBeInTheDocument()
  expect(screen.getAllByText(/Last application/)).toHaveLength(1)
})

it("shows the programs and stories staff picked, in their order, instead of the automatic ones", async () => {
  const user = userEvent.setup()
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (decodeURIComponent(String(url)).includes("filter[ids]=12,11")) {
      return Promise.resolve(jsonResponse({ data: [
        { id: 12, name: "Second Program", level: "master", teaching_language: "English", university: { name: "Fudan University", slug: "fudan" } },
        { id: 11, name: "First Program", level: "bachelor", teaching_language: "English", university: { name: "Zhejiang University", slug: "zju" } },
      ] }))
    }

    return Promise.resolve(jsonResponse({ data: [] }))
  })
  vi.stubGlobal("fetch", fetchMock)
  const picks = { hero_universities: [], update_universities: [], update_programs: [12, 11], update_scholarships: [], update_posts: [] }

  renderWithProviders(<HeroUpdates universities={[]} programs={[{ id: 99, name: "Automatic Program", level: "bachelor", teaching_language: null, duration_months: null, tuition_fee: null, currency: null, requirements: null }]} spotlight={picks} />)
  await user.click(screen.getByRole("button", { name: "Show latest updates" }))
  await user.click(screen.getByRole("button", { name: "Program Updates" }))

  const rows = await screen.findAllByRole("link")
  expect(rows.map((r) => r.textContent)).toEqual([expect.stringContaining("Second Program"), expect.stringContaining("First Program")])
  expect(screen.queryByText(/Automatic Program/)).not.toBeInTheDocument()
})

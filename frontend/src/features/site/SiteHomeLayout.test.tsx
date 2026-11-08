import { screen, within } from "@testing-library/react"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import SiteHome from "./SiteHome"

beforeEach(() => vi.restoreAllMocks())

const EMPTY = { data: [], meta: { total: 0, current_page: 1, last_page: 1 }, city_stats: [] }

function mockHome(sections: unknown) {
  vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => Promise.resolve(
    String(url).includes("/public/home") ? jsonResponse({ data: sections }) : jsonResponse(EMPTY),
  )))
}

const s = (key: string, content: unknown = null, type = key) => ({ key, type, content })

it("shows the standard page when nothing was changed", async () => {
  mockHome([s("hero"), s("cities"), s("highlights"), s("cta"), s("why")])

  renderWithProviders(<SiteHome />)

  expect(await screen.findByRole("heading", { name: "Study in China", level: 1 })).toBeInTheDocument()
  expect(screen.getByText("Highlights")).toBeInTheDocument()
})

it("shows text, links and lists changed in the admin panel", async () => {
  mockHome([
    s("hero", { en: { texts: { title: "Your future starts in China", searchPlaceholder: "Find your university" }, lists: { popular: [{ label: "Medicine", to: "/site/programs?q=MBBS" }] } } }),
    s("cta", { en: { texts: { title: "Ready when you are", primaryLabel: "See programs", primaryLink: "/site/programs" } } }),
    s("highlights", { en: { lists: { items: [{ title: "Our custom card", body: "Custom text", tag: "New", to: "/site/contact" }] } } }),
  ])

  renderWithProviders(<SiteHome />)

  expect(await screen.findByRole("heading", { name: "Your future starts in China", level: 1 })).toBeInTheDocument()
  expect(screen.getByPlaceholderText("Find your university")).toBeInTheDocument()
  expect(screen.getByRole("link", { name: "Medicine" })).toHaveAttribute("href", "/site/programs?q=MBBS")
  expect(screen.queryByRole("link", { name: "Chinese Language Program" })).not.toBeInTheDocument()
  expect(screen.getByRole("heading", { name: "Ready when you are" })).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /See programs/ })).toHaveAttribute("href", "/site/programs")
  const card = screen.getByRole("heading", { name: "Our custom card" }).closest("a") as HTMLElement
  expect(card).toHaveAttribute("href", "/site/contact")
  expect(within(card).getByText("New")).toBeInTheDocument()
  expect(within(card).getByText("Custom text")).toBeInTheDocument()
})

it("follows the order from the admin panel and leaves out hidden sections", async () => {
  // The hero is always first; "share" and "why" are not in the list, so they are hidden.
  mockHome([s("cta"), s("hero"), s("highlights")])

  const { container } = renderWithProviders(<SiteHome />)
  await screen.findByRole("heading", { name: "Study in China", level: 1 })

  // Wait for the layout to arrive: the share band is not in it, so it disappears.
  await vi.waitFor(() => expect(screen.queryByText("Studied or worked with CAS?")).not.toBeInTheDocument())
  const text = container.textContent ?? ""
  expect(text.indexOf("Study in China")).toBeLessThan(text.indexOf("Highlights"))
  // The closing box was moved before Highlights.
  expect(text.indexOf("Search universities and programs")).toBeGreaterThan(-1)
  expect(text.indexOf("Search universities and programs")).toBeLessThan(text.indexOf("Highlights"))
})

it("shows banners and text blocks added in the admin panel", async () => {
  mockHome([
    s("hero"),
    s("custom-abc123", { en: { texts: { title: "Open day on 20 March", body: "Meet our team in person.", buttonLabel: "Reserve a seat", buttonLink: "/site/contact" } } }, "banner"),
    s("custom-def456", { en: { texts: { title: "A note from us", body: "First paragraph.\n\nSecond paragraph." } } }, "text"),
  ])

  renderWithProviders(<SiteHome />)

  expect(await screen.findByRole("heading", { name: "Open day on 20 March" })).toBeInTheDocument()
  expect(screen.getByText("Meet our team in person.")).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /Reserve a seat/ })).toHaveAttribute("href", "/site/contact")
  expect(screen.getByText("First paragraph.")).toBeInTheDocument()
  expect(screen.getByText("Second paragraph.")).toBeInTheDocument()
})

it("falls back to the standard page if the layout cannot be loaded", async () => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => Promise.resolve(
    String(url).includes("/public/home") ? jsonResponse({ message: "boom" }, 500) : jsonResponse(EMPTY),
  )))

  renderWithProviders(<SiteHome />)

  expect(await screen.findByRole("heading", { name: "Study in China", level: 1 })).toBeInTheDocument()
  expect(screen.getByText("Highlights")).toBeInTheDocument()
})

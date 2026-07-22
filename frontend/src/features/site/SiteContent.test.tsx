import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import SiteNews from "./SiteNews"
import SitePostDetail from "./SitePostDetail"

const POST = {
  id: 1, type: "news", title: "Big MBBS News", slug: "big-mbbs-news", excerpt: "An excerpt here",
  body: "<p>Hello body content</p>", cover_image_url: null, category: "Admissions",
  published_at: "2026-07-20T00:00:00Z", author: "CAS", event_date: null, location: null, register_url: null,
}
const LIST = { data: [POST], meta: { current_page: 1, last_page: 1, total: 1, from: 1, to: 1 } }

beforeEach(() => vi.restoreAllMocks())

it("lists published posts and filters by type tab", async () => {
  const user = userEvent.setup()
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse(LIST))
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<SiteNews />)

  expect(await screen.findByText("Big MBBS News")).toBeInTheDocument()

  await user.click(screen.getByRole("button", { name: "Events" }))
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("type=event"), expect.anything()))
})

it("renders a post detail page with its sanitized body", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: POST })))

  renderWithProviders(
    <Routes><Route path="/site/news/:slug" element={<SitePostDetail />} /></Routes>,
    { route: "/site/news/big-mbbs-news" },
  )

  expect(await screen.findByRole("heading", { name: "Big MBBS News", level: 1 })).toBeInTheDocument()
  expect(screen.getByText("Hello body content")).toBeInTheDocument()
})

it("shows a not-found message for a missing/unpublished post", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ message: "Not found" }, 404)))

  renderWithProviders(
    <Routes><Route path="/site/news/:slug" element={<SitePostDetail />} /></Routes>,
    { route: "/site/news/missing" },
  )

  expect(await screen.findByText("Post not found")).toBeInTheDocument()
})

import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import SiteCity from "./SiteCity"

const uni = (id: number, name: string, extra: Record<string, unknown> = {}) => ({
  id, name, name_zh: null, slug: `u${id}`, city: "Hangzhou", province: "Zhejiang", cover_url: null,
  moe_listed: false, programs_count: 0, programs_preview: [], ...extra,
})

const CITY = {
  city: "Hangzhou", province: "Zhejiang", sections: [],
  profile: {
    summary: "Hangzhou is the capital of Zhejiang.",
    source_url: "https://en.wikipedia.org/wiki/Hangzhou",
    sections: [
      { group: "history", h: "History", level: 2, blocks: [{ t: "p", x: "A city with a long history." }] },
      { group: "places", h: "Sights", level: 2, blocks: [{ t: "p", x: "West Lake is a UNESCO site." }] },
    ],
  },
  universities: [
    uni(1, "Zhejiang University", { moe_listed: true, programs_count: 40, programs_preview: ["Medicine"] }),
    uni(2, "Hangzhou Normal University", { programs_count: 12 }),
    uni(3, "China Academy of Art", { programs_count: 3 }),
  ],
}

function renderCity() {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(jsonResponse(CITY))))

  return renderWithProviders(
    <Routes><Route path="/site/cities/:slug" element={<SiteCity />} /></Routes>,
    { route: "/site/cities/hangzhou" },
  )
}

it("shows the city's history and places to visit, with the source credited", async () => {
  renderCity()

  expect(await screen.findByText("A city with a long history.")).toBeInTheDocument()
  expect(screen.getByRole("heading", { name: "Places to visit and historic sites" })).toBeInTheDocument()
  expect(screen.getByText("West Lake is a UNESCO site.")).toBeInTheDocument()
  expect(screen.getByRole("link", { name: "Wikipedia" })).toHaveAttribute("href", "https://en.wikipedia.org/wiki/Hangzhou")
})

it("filters the universities in the city by name, by program, and by MoE listing", async () => {
  const user = userEvent.setup()
  renderCity()
  await screen.findByText("Zhejiang University")

  await user.type(screen.getByRole("textbox", { name: "Search universities in this city" }), "normal")
  expect(screen.queryByText("Zhejiang University")).not.toBeInTheDocument()
  expect(screen.getByText("Hangzhou Normal University")).toBeInTheDocument()

  await user.clear(screen.getByRole("textbox", { name: "Search universities in this city" }))
  await user.type(screen.getByRole("textbox", { name: "Search universities in this city" }), "medicine")
  expect(screen.getByText("Zhejiang University")).toBeInTheDocument()
  expect(screen.queryByText("China Academy of Art")).not.toBeInTheDocument()

  await user.click(screen.getByRole("button", { name: "Clear filters" }))
  await user.click(screen.getByRole("button", { name: "MoE-listed only" }))
  expect(screen.getByText("Zhejiang University")).toBeInTheDocument()
  expect(screen.queryByText("Hangzhou Normal University")).not.toBeInTheDocument()
})

it("says so when no university matches", async () => {
  const user = userEvent.setup()
  renderCity()
  await screen.findByText("Zhejiang University")

  await user.type(screen.getByRole("textbox", { name: "Search universities in this city" }), "zzzz")

  expect(screen.getByText("No university in Hangzhou matches your search.")).toBeInTheDocument()
})

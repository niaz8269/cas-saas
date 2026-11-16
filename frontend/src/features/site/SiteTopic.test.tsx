import { screen } from "@testing-library/react"
import { Route, Routes } from "react-router-dom"

import SiteTopic from "@/features/site/SiteTopic"
import { jsonResponse, renderWithProviders } from "@/test/utils"

it("shows a topic page with its questions and related links", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ data: {
    slug: "bds-in-china", title: "BDS in China", description: "d", h1: "BDS in China for international students", eyebrow: "Study in China", intro: "Intro text",
    sections: [{ h: "Eligibility", p: ["Science stream."] }], faq: [{ q: "How long?", a: "Five years." }], search: "stomatology",
    related_links: [{ title: "MBBS in China", path: "/site/mbbs-in-china" }],
  } })))

  renderWithProviders(<Routes><Route path="/site/:topic" element={<SiteTopic />} /></Routes>, { route: "/site/bds-in-china" })

  expect(await screen.findByRole("heading", { name: "BDS in China for international students" })).toBeInTheDocument()
  expect(screen.getByText("Five years.")).toBeInTheDocument()
  expect(screen.getByRole("link", { name: "MBBS in China" })).toHaveAttribute("href", "/site/mbbs-in-china")
})

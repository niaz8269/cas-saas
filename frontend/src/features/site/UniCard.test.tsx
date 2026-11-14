import { screen } from "@testing-library/react"

import type { SiteUniversityCard } from "@/features/site/api"
import { renderWithProviders } from "@/test/utils"

import { UniCard } from "./components"

const BASE: SiteUniversityCard = {
  id: 1, name: "Beijing Normal University", slug: "beijing-normal", city: "Beijing", address: null, country: "China",
  logo_url: null, cover_url: null, moe_listed: true, nearest_airport: null, about: null, requirements: [], representative_professor: null,
}

it("shows the first programs a university teaches and how many more there are", () => {
  renderWithProviders(<UniCard u={{ ...BASE, programs_count: 120, programs_preview: ["Civil Engineering", "Applied Physics", "Botany", "Chemistry"] }} />)

  const list = screen.getByRole("list", { name: "Programs" })
  expect(list).toHaveTextContent("Civil Engineering")
  expect(list).toHaveTextContent("Chemistry")
  expect(list).toHaveTextContent("+116 more")
  expect(screen.getByText("120 programs")).toBeInTheDocument()
})

it("does not add a 'more' note when every program is already shown", () => {
  renderWithProviders(<UniCard u={{ ...BASE, programs_count: 1, programs_preview: ["Painting"] }} />)

  expect(screen.getByText("Painting")).toBeInTheDocument()
  expect(screen.queryByText(/more/)).not.toBeInTheDocument()
})

it("says plainly when programs are still being added", () => {
  renderWithProviders(<UniCard u={{ ...BASE, programs_count: 0, programs_preview: [] }} />)

  expect(screen.getByText("Programs are being added. Ask our advisors which courses are open.")).toBeInTheDocument()
  expect(screen.getByText("0 programs")).toBeInTheDocument()
})

it("still renders where a list does not send the program details", () => {
  renderWithProviders(<UniCard u={{ ...BASE, programs_count: 3 }} />)

  expect(screen.queryByRole("list", { name: "Programs" })).not.toBeInTheDocument()
  expect(screen.queryByText(/being added/)).not.toBeInTheDocument()
})

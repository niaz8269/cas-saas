import { screen } from "@testing-library/react"

import { renderWithProviders } from "@/test/utils"

import SiteLayout from "./SiteLayout"
import SiteTerms from "./SiteTerms"

it("shows the terms with a contact section", () => {
  renderWithProviders(<SiteTerms />, { route: "/site/terms" })

  expect(screen.getByRole("heading", { name: "Terms & Conditions" })).toBeInTheDocument()
  expect(screen.getByText("3. No guarantees")).toBeInTheDocument()
  expect(screen.getByText("14. Contact us")).toBeInTheDocument()
})

it("links the terms from the footer and no longer shows staff login or photo credits", () => {
  renderWithProviders(<SiteLayout />, { route: "/site" })

  expect(screen.getAllByRole("link", { name: "Terms & Conditions" })[0]).toHaveAttribute("href", "/site/terms")
  expect(screen.queryByRole("link", { name: "Staff login" })).not.toBeInTheDocument()
  expect(screen.queryByRole("link", { name: "Photo credits" })).not.toBeInTheDocument()
})

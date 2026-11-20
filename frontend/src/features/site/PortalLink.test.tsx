import { screen } from "@testing-library/react"

import { renderWithProviders } from "@/test/utils"

import PortalLink from "./PortalLink"

it("opens the portal in a new tab, safely, and says so to screen readers", () => {
  renderWithProviders(<PortalLink to="/portal/login">Sign in</PortalLink>)

  const link = screen.getByRole("link", { name: "Sign in (opens in a new tab)" })
  expect(link).toHaveAttribute("href", "/portal/login")
  expect(link).toHaveAttribute("target", "_blank")
  expect(link).toHaveAttribute("rel", "noopener noreferrer")
})

it("keeps a given accessible name and adds the hint to it", () => {
  renderWithProviders(<PortalLink to="/portal/login" aria-label="Sign in"><svg /></PortalLink>)

  expect(screen.getByRole("link", { name: "Sign in (opens in a new tab)" })).toHaveAttribute("target", "_blank")
})

import { screen } from "@testing-library/react"
import { expect, it } from "vitest"

import { renderWithProviders } from "@/test/utils"

import SiteHelpDock from "./SiteHelpDock"

it("makes the WhatsApp QR code and number one link that opens a chat with the CAS WhatsApp number", () => {
  renderWithProviders(<SiteHelpDock />)

  const tile = screen.getByRole("link", { name: "WhatsApp +86 176 4041 2827" })
  expect(tile).toHaveAttribute("href", "https://wa.me/8617640412827")
  expect(tile).toHaveAttribute("target", "_blank")
  expect(tile.getAttribute("rel")).toContain("noopener")
  expect(tile.querySelector("img")).not.toBeNull()
  expect(tile.textContent).toContain("+86 176 4041 2827")
  expect(decodeURIComponent(tile.querySelector("img")!.getAttribute("src")!)).toContain("https://wa.me/8617640412827")
})

import { screen } from "@testing-library/react"
import { expect, it } from "vitest"

import { renderWithProviders } from "@/test/utils"

import SiteWhatsAppButton from "./SiteWhatsAppButton"

it("links to a WhatsApp chat with the CAS number and a prefilled message, opening in a new tab", () => {
  renderWithProviders(<SiteWhatsAppButton />)

  const link = screen.getByRole("link", { name: "Chat with CAS on WhatsApp" })
  expect(link).toHaveAttribute("href", expect.stringMatching(/^https:\/\/wa\.me\/8618041566030\?text=Hello%20CAS/))
  expect(link).toHaveAttribute("target", "_blank")
  expect(link.getAttribute("rel")).toContain("noopener")
  expect(link.className).toContain("left-3")
  expect(link.className).toContain("bottom-3")
  expect(link.className).toContain("lg:bottom-[3.75rem]")
})

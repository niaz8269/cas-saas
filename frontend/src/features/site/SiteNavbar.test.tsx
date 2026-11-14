import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import SiteLayout from "./SiteLayout"

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ data: [] }))))
})

/** The desktop navigation bar, not the mobile drawer or the footer. */
const topNav = () => screen.getAllByRole("navigation")[0]

it("keeps Why CAS and Partner out of the top bar", () => {
  renderWithProviders(<SiteLayout />, { route: "/site" })

  // The bar's own links are the uppercase ones; the dropdown panel sits inside the same <nav>.
  const barLinks = within(topNav()).getAllByRole("link").filter((l) => l.className.includes("uppercase")).map((l) => l.textContent)

  expect(barLinks).toEqual(["Universities", "Programs", "Our Services"])
})

it("puts Why CAS and Partner in the dropdown menu, pointing at the same pages", async () => {
  const user = userEvent.setup()
  renderWithProviders(<SiteLayout />, { route: "/site" })

  await user.click(screen.getByRole("button", { name: /Browse everything/i }))

  const why = screen.getByRole("link", { name: "Why CAS" })
  const partner = screen.getByRole("link", { name: "Partner" })
  expect(why).toHaveAttribute("href", expect.stringContaining("/site/about"))
  expect(partner).toHaveAttribute("href", expect.stringContaining("/site/partner"))
})

it("still offers both in the mobile menu, which has no dropdown", async () => {
  const user = userEvent.setup()
  renderWithProviders(<SiteLayout />, { route: "/site" })

  await user.click(screen.getByRole("button", { name: /open menu/i }))

  const drawer = screen.getAllByRole("navigation").find((n) => within(n).queryByRole("link", { name: "Free study plan" }) && within(n).queryByRole("link", { name: "Partner" }))
  expect(drawer).toBeTruthy()
  expect(within(drawer!).getByRole("link", { name: "Why CAS" })).toBeInTheDocument()
})

import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import SiteLayout from "./SiteLayout"

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ data: [] }))))
})

/** The desktop navigation bar, not the mobile drawer or the footer. */
const topNav = () => screen.getAllByRole("navigation")[0]

it("shows Why CAS first in the top bar and keeps Partner out of it", () => {
  renderWithProviders(<SiteLayout />, { route: "/site" })

  // The bar's own links are the uppercase ones; the dropdown panel sits inside the same <nav>.
  const barLinks = within(topNav()).getAllByRole("link").filter((l) => l.className.includes("uppercase")).map((l) => l.textContent)

  expect(barLinks).toEqual(["Why CAS", "Universities", "Programs", "Our Services"])
})

it("has a Partner With Us column in the browse dropdown, one link per kind of partner", async () => {
  const user = userEvent.setup()
  renderWithProviders(<SiteLayout />, { route: "/site" })

  await user.click(screen.getByRole("button", { name: /Browse everything/i }))

  const column = screen.getByText("Partner With Us", { selector: "p" }).closest("div")!
  const kinds = ["University", "College", "School", "Academy", "Edu. Consultant", "Individual"]
  for (const kind of kinds) {
    expect(within(column).getByRole("link", { name: kind })).toHaveAttribute("href", expect.stringContaining(`/site/partner?type=${kind === "Edu. Consultant" ? "consultant" : kind.toLowerCase()}`))
  }
  expect(within(column).getByRole("link", { name: "Partner With Us »" })).toHaveAttribute("href", expect.stringContaining("/site/partner"))
})

it("still offers Why CAS and Partner With Us in the mobile menu, which has no dropdown", async () => {
  const user = userEvent.setup()
  renderWithProviders(<SiteLayout />, { route: "/site" })

  await user.click(screen.getByRole("button", { name: /open menu/i }))

  const drawer = screen.getAllByRole("navigation").find((n) => within(n).queryByRole("link", { name: "Free study plan" }) && within(n).queryByRole("link", { name: "Partner With Us" }))
  expect(drawer).toBeTruthy()
  expect(within(drawer!).getByRole("link", { name: "Why CAS" })).toBeInTheDocument()
})

it("shows a contact bar above the navigation with the phone, WeChat, email and the two social links", () => {
  renderWithProviders(<SiteLayout />, { route: "/site" })

  expect(screen.queryByText("International Students Admissions:")).not.toBeInTheDocument()
  expect(screen.getAllByRole("link", { name: "+86 176 4041 2827" })[0]).toHaveAttribute("href", "https://wa.me/8617640412827")
  expect(screen.getAllByRole("link", { name: "info@cas.moe" })[0]).toHaveAttribute("href", "mailto:info@cas.moe")
  expect(screen.getAllByText("CAS-KAMI").length).toBeGreaterThan(0)

  const bar = screen.getAllByRole("link", { name: "+86 176 4041 2827" })[0].closest("div.bg-cas-red") as HTMLElement
  expect(within(bar).getByRole("link", { name: "Facebook" })).toHaveAttribute("href", "https://www.facebook.com/share/1F7EUukSv2/")
  expect(within(bar).getByRole("link", { name: "LinkedIn" })).toHaveAttribute("href", "https://www.linkedin.com/in/consultancy-for-abroad-study-cas-39b4a282/")
  // Instagram and YouTube are left out of the bar for now.
  expect(within(bar).queryByRole("link", { name: "Instagram" })).not.toBeInTheDocument()
  expect(within(bar).queryByRole("link", { name: "YouTube" })).not.toBeInTheDocument()
})

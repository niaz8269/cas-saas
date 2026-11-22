import { screen } from "@testing-library/react"

import PartnerGuide from "@/features/site/PartnerGuide"
import { PARTNER_GUIDES } from "@/features/site/partnerGuides"
import { renderWithProviders } from "@/test/utils"

it("links to the matching xjmu.online guide on a page that has one", () => {
  renderWithProviders(<PartnerGuide />, { route: "/site/mbbs-in-china-fees" })

  expect(screen.getByRole("link", { name: "a worked example of MBBS fees at one university" })).toHaveAttribute("href", "https://xjmu.online/mbbs-in-china-fees-2027")
})

it("shows both links on the Xinjiang Medical University page", () => {
  renderWithProviders(<PartnerGuide />, { route: "/site/universities/xinjiang-medical-university" })

  expect(screen.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["https://xjmu.online/", "https://xjmu.online/xinjiang-medical-university"])
})

it("renders nothing on other pages", () => {
  const { container } = renderWithProviders(<PartnerGuide />, { route: "/site/universities/fudan-university" })

  expect(container.querySelector("a")).toBeNull()
})

it("only ever links to xjmu.online over https", () => {
  const urls = Object.values(PARTNER_GUIDES).flat().filter((p): p is [string, string] => typeof p !== "string").map((p) => p[1])

  expect(urls).toHaveLength(14)
  expect(urls.every((u) => u.startsWith("https://xjmu.online/"))).toBe(true)
  expect(new Set(urls).size).toBe(urls.length)
})

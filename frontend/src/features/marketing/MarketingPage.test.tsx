import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { useAuthStore } from "@/stores/auth"
import { jsonResponse, renderWithProviders } from "@/test/utils"
import type { AuthUser } from "@/types/auth"

import MarketingPage from "./MarketingPage"

function makeUser(permissions: string[], roles = ["Marketing"]): AuthUser {
  return { id: 1, name: "Demo Marketer", email: "marketing@cas.moe", phone: null, status: "active", roles, permissions, last_login_at: null }
}

const META = { current_page: 1, last_page: 1, per_page: 100, total: 1, from: 1, to: 1 }

function stubFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes("/website-sources")) {
        return Promise.resolve(jsonResponse({ data: [{ id: 5, domain: "study-abroad.pk", university_focus: "Jilin Medical", api_source_id: null, is_active: true }], meta: META }))
      }
      if (url.includes("/marketing-sources")) {
        return Promise.resolve(jsonResponse({ data: [{ id: 1, name: "Facebook Ads", channel: "social", is_active: true, campaigns_count: 2 }], meta: META }))
      }
      if (url.includes("/campaigns")) {
        return Promise.resolve(jsonResponse({ data: [{ id: 9, name: "Autumn push", marketing_source_id: 1, marketing_source: { id: 1, name: "Facebook Ads" }, utm_source: "facebook", utm_medium: "cpc", utm_campaign: "autumn26", start_date: "2026-08-01", end_date: "2026-09-30" }], meta: META }))
      }
      return Promise.resolve(jsonResponse({}))
    }),
  )
}

it("lists campaigns and switches to the sources tab", async () => {
  useAuthStore.setState({ token: "t", user: makeUser(["marketing.view.global", "marketing.manage.global"]) })
  stubFetch()
  const user = userEvent.setup()

  renderWithProviders(<MarketingPage />)

  expect(await screen.findByText("Autumn push")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: /New campaign/ })).toBeInTheDocument()

  await user.click(screen.getByRole("button", { name: "Sources" }))

  expect(await screen.findByRole("button", { name: /New source/ })).toBeInTheDocument()
  expect(screen.getByText("social")).toBeInTheDocument()

  await user.click(screen.getByRole("button", { name: "Websites" }))

  expect(await screen.findByText("study-abroad.pk")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: /New website/ })).toBeInTheDocument()
})

it("hides management actions for a view-only viewer", async () => {
  useAuthStore.setState({ token: "t", user: makeUser(["marketing.view.global"], ["Management"]) })
  stubFetch()

  renderWithProviders(<MarketingPage />)

  expect(await screen.findByText("Autumn push")).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /New campaign/ })).not.toBeInTheDocument()
})

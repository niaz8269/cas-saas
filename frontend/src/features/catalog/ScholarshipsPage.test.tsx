import { screen } from "@testing-library/react"

import { useAuthStore } from "@/stores/auth"
import { jsonResponse, renderWithProviders } from "@/test/utils"
import type { AuthUser } from "@/types/auth"

import ScholarshipsPage from "./ScholarshipsPage"

function makeUser(permissions: string[]): AuthUser {
  return { id: 1, name: "Admin", email: "a@cas.moe", phone: null, status: "active", roles: [], permissions, last_login_at: null }
}

const GOV_SCHOLARSHIP = {
  id: 1, scope: "government", university_id: null, name: "Chinese Government Scholarship (CSC)",
  slug: null, type: "full", coverage: "Full tuition", amount: null,
  tuition_after: "0.00", hostel_after: null, stipend_monthly: "2500.00", currency: "CNY",
  description: null, eligibility: null, how_to_apply: null, apply_link: null, deadline: null, status: "active",
}

beforeEach(() => vi.restoreAllMocks())

it("lists government scholarships and offers a create button", async () => {
  useAuthStore.setState({ token: "t", user: makeUser(["scholarships.view.global", "scholarships.manage.global"]) })
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
    data: [GOV_SCHOLARSHIP],
    meta: { current_page: 1, last_page: 1, per_page: 25, total: 1, from: 1, to: 1 },
  })))

  renderWithProviders(<ScholarshipsPage />)

  expect(await screen.findByText("Chinese Government Scholarship (CSC)")).toBeInTheDocument()
  expect(screen.getByText("CNY 2500.00")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: /New scholarship/ })).toBeInTheDocument()
})

it("hides the create button from users without manage", async () => {
  useAuthStore.setState({ token: "t", user: makeUser(["scholarships.view.global"]) })
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
    data: [], meta: { current_page: 1, last_page: 1, per_page: 25, total: 0, from: 0, to: 0 },
  })))

  renderWithProviders(<ScholarshipsPage />)

  expect(await screen.findByText("No government scholarships yet")).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /New scholarship/ })).not.toBeInTheDocument()
})

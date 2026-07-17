import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { useAuthStore } from "@/stores/auth"
import { jsonResponse, renderWithProviders } from "@/test/utils"
import type { AuthUser } from "@/types/auth"

import UniversitiesPage from "./UniversitiesPage"

function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 1,
    name: "Test Staff",
    email: "staff@cas.moe",
    phone: null,
    status: "active",
    roles: [],
    permissions: ["universities.view.global"],
    last_login_at: null,
    ...overrides,
  }
}

const PAGE_ONE = {
  data: [
    {
      id: 1,
      name: "Jilin Medical University",
      code: "JLMU",
      city: "Jilin City",
      website: "www.jlmu.cn",
      status: "active",
      programs_count: 2,
      intakes_count: 2,
    },
    {
      id: 2,
      name: "Dalian Medical University",
      code: "DMU",
      city: "Dalian",
      website: null,
      status: "inactive",
      programs_count: 1,
      intakes_count: 0,
    },
  ],
  meta: { current_page: 1, last_page: 1, per_page: 25, total: 2, from: 1, to: 2 },
}

beforeEach(() => {
  useAuthStore.setState({ token: "token", user: makeUser() })
  vi.restoreAllMocks()
})

it("renders universities with status badges and counts", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(PAGE_ONE)))

  renderWithProviders(<UniversitiesPage />)

  expect(await screen.findByText("Jilin Medical University")).toBeInTheDocument()
  expect(screen.getByText("JLMU")).toBeInTheDocument()
  expect(screen.getByText("active")).toBeInTheDocument()
  expect(screen.getByText("inactive")).toBeInTheDocument()
  expect(screen.getByText("1–2 of 2")).toBeInTheDocument()
})

it("hides the create button from viewers without manage permission", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(PAGE_ONE)))

  renderWithProviders(<UniversitiesPage />)

  await screen.findByText("Jilin Medical University")
  expect(screen.queryByRole("button", { name: /New university/ })).not.toBeInTheDocument()
})

it("shows the create button for catalog managers and opens the dialog", async () => {
  useAuthStore.setState({
    user: makeUser({ permissions: ["universities.view.global", "universities.manage.global"] }),
  })
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(PAGE_ONE)))
  const user = userEvent.setup()

  renderWithProviders(<UniversitiesPage />)

  await screen.findByText("Jilin Medical University")
  await user.click(screen.getByRole("button", { name: /New university/ }))

  expect(await screen.findByRole("dialog")).toBeInTheDocument()
  expect(screen.getByLabelText("Name")).toBeInTheDocument()
  expect(screen.getByLabelText("Code")).toBeInTheDocument()
})

it("shows the empty state when the API returns no rows", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      jsonResponse({
        data: [],
        meta: { current_page: 1, last_page: 1, per_page: 25, total: 0, from: null, to: null },
      }),
    ),
  )

  renderWithProviders(<UniversitiesPage />)

  expect(await screen.findByText("No universities found")).toBeInTheDocument()
})

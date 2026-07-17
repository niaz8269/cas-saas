import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"

import { useAuthStore } from "@/stores/auth"
import { jsonResponse, renderWithProviders } from "@/test/utils"
import type { AuthUser } from "@/types/auth"

import LeadDetailPage from "./LeadDetailPage"
import LeadsPage from "./LeadsPage"

function makeUser(permissions: string[]): AuthUser {
  return {
    id: 7,
    name: "Demo Counselor",
    email: "counselor@cas.moe",
    phone: null,
    status: "active",
    roles: ["Counselor"],
    permissions,
    last_login_at: null,
  }
}

const LEAD = {
  id: 11,
  first_name: "Ali",
  last_name: "Khan",
  full_name: "Ali Khan",
  email: "ali@example.com",
  phone: "+923001234567",
  status: "assigned",
  intake_route: "info",
  message: "Interested in MBBS",
  country: { id: 1, name: "Pakistan", iso2: "PK" },
  website_source: { id: 1, domain: "study-mbbs.cn" },
  campaign: null,
  assignee: { id: 7, name: "Demo Counselor" },
  student_id: null,
  duplicate_of: null,
  review: false,
  created_at: "2026-07-01T10:00:00Z",
}

const LIST = {
  data: [LEAD, { ...LEAD, id: 12, full_name: "Grace Otieno", status: "new", assignee: null, review: true }],
  meta: { current_page: 1, last_page: 1, per_page: 25, total: 2, from: 1, to: 2 },
}

beforeEach(() => {
  vi.restoreAllMocks()
})

it("renders the pipeline with status and review badges", async () => {
  useAuthStore.setState({ token: "t", user: makeUser(["leads.view.assigned"]) })
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(LIST)))

  renderWithProviders(<LeadsPage />)

  expect(await screen.findByText("Ali Khan")).toBeInTheDocument()
  expect(screen.getByText("assigned")).toBeInTheDocument()
  expect(screen.getByText("review")).toBeInTheDocument()
  expect(screen.getByText("Unassigned")).toBeInTheDocument()
})

function renderDetail() {
  return renderWithProviders(
    <Routes>
      <Route path="/leads/:id" element={<LeadDetailPage />} />
      <Route path="/students/:id" element={<div>STUDENT PAGE</div>} />
    </Routes>,
    { route: "/leads/11" },
  )
}

it("hides assign and convert from plain viewers", async () => {
  useAuthStore.setState({ token: "t", user: makeUser(["leads.view.assigned"]) })
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: LEAD })))

  renderDetail()

  await screen.findByText("Ali Khan")
  expect(screen.queryByRole("button", { name: /Convert to student/ })).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /Assign/ })).not.toBeInTheDocument()
})

it("lets a counselor convert and navigates to the new student", async () => {
  useAuthStore.setState({
    token: "t",
    user: makeUser(["leads.view.assigned", "leads.convert.assigned"]),
  })
  const user = userEvent.setup()

  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === "POST") {
        return Promise.resolve(jsonResponse({ data: { id: 99, student_code: "STU-2026-00099" } }, 201))
      }
      return Promise.resolve(jsonResponse({ data: LEAD }))
    }),
  )

  renderDetail()

  await user.click(await screen.findByRole("button", { name: /Convert to student/ }))
  await user.click(await screen.findByRole("button", { name: "Convert" }))

  expect(await screen.findByText("STUDENT PAGE")).toBeInTheDocument()
})

it("shows the assign action to lead admins", async () => {
  useAuthStore.setState({
    token: "t",
    user: makeUser(["leads.view.global", "leads.assign.global"]),
  })
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: LEAD })))

  renderDetail()

  expect(await screen.findByRole("button", { name: /Assign/ })).toBeInTheDocument()
})

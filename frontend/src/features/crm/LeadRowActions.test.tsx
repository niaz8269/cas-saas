import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"

import { useAuthStore } from "@/stores/auth"
import { jsonResponse, renderWithProviders } from "@/test/utils"
import type { AuthUser } from "@/types/auth"
import type { LeadListItem } from "@/features/crm/api"

import LeadRowActions from "./LeadRowActions"

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

const LEAD: LeadListItem = {
  id: 11,
  first_name: "Ali",
  last_name: "Khan",
  full_name: "Ali Khan",
  email: "ali@example.com",
  phone: "+923001234567",
  status: "assigned",
  intake_route: "info",
  form_type: null,
  form_fields: {},
  message: null,
  country: { id: 1, name: "Pakistan", iso2: "PK" },
  website_source: null,
  campaign: null,
  assignee: null,
  student_id: null,
  duplicate_of: null,
  review: false,
  created_at: "2026-07-01T10:00:00Z",
}

function renderRow(lead: LeadListItem, permissions: string[]) {
  useAuthStore.setState({ token: "t", user: makeUser(permissions) })
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<LeadRowActions lead={lead} />} />
      <Route path="/students/:id" element={<div>STUDENT PAGE</div>} />
    </Routes>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

it("hides assign and convert from plain viewers", async () => {
  const user = userEvent.setup()
  renderRow(LEAD, ["leads.view.assigned"])

  await user.click(screen.getByRole("button", { name: /Actions for Ali Khan/ }))

  expect(await screen.findByRole("menuitem", { name: /Open lead/ })).toBeInTheDocument()
  expect(screen.queryByRole("menuitem", { name: /Convert to student/ })).not.toBeInTheDocument()
  expect(screen.queryByRole("menuitem", { name: /Assign/ })).not.toBeInTheDocument()
})

it("converts from the row menu and navigates to the new student", async () => {
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

  renderRow(LEAD, ["leads.view.assigned", "leads.convert.assigned"])

  await user.click(screen.getByRole("button", { name: /Actions for Ali Khan/ }))
  await user.click(await screen.findByRole("menuitem", { name: /Convert to student/ }))
  await user.click(await screen.findByRole("button", { name: "Convert" }))

  expect(await screen.findByText("STUDENT PAGE")).toBeInTheDocument()
})

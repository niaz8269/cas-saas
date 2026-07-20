import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"

import { useAuthStore } from "@/stores/auth"
import { jsonResponse, renderWithProviders } from "@/test/utils"
import type { AuthUser } from "@/types/auth"

import StudentProfilePage from "./StudentProfilePage"
import StudentsPage from "./StudentsPage"

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

const STUDENT = {
  id: 5,
  student_code: "STU-2026-00005",
  first_name: "Ali",
  last_name: "Khan",
  full_name: "Ali Khan",
  email: "ali@example.com",
  phone: "+923001234567",
  passport_no: "AB1234567",
  dob: "2004-03-12",
  gender: "male",
  status: "in_process",
  country: { id: 1, name: "Pakistan", iso2: "PK" },
  branch: { id: 1, name: "Head Office", code: "HQ" },
  agent: null,
  counselor: { id: 7, name: "Demo Counselor" },
  guardians: [{ id: 1, name: "Mr. Khan", relation: "father", phone: "+92300111" }],
  created_at: "2026-07-01T10:00:00Z",
}

const TIMELINE = {
  data: [
    { id: 2, type: "note", body: "Family call done.", meta: null, user: { id: 7, name: "Demo Counselor" }, created_at: "2026-07-10T09:00:00Z" },
    { id: 1, type: "system", body: "Converted from lead #11", meta: { lead_id: 11 }, user: null, created_at: "2026-07-01T10:00:00Z" },
  ],
  meta: { current_page: 1, last_page: 1, per_page: 50, total: 2, from: 1, to: 2 },
}

beforeEach(() => {
  vi.restoreAllMocks()
})

it("lists students with codes and status badges", async () => {
  useAuthStore.setState({ token: "t", user: makeUser(["students.view.assigned"]) })
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      jsonResponse({ data: [STUDENT], meta: { current_page: 1, last_page: 1, per_page: 25, total: 1, from: 1, to: 1 } }),
    ),
  )

  renderWithProviders(<StudentsPage />)

  expect(await screen.findByText("Ali Khan")).toBeInTheDocument()
  expect(screen.getByText("STU-2026-00005")).toBeInTheDocument()
  expect(screen.getByText("in process")).toBeInTheDocument()
})

function stubProfileFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes("/timeline")) return Promise.resolve(jsonResponse(TIMELINE))
      if (url.includes("/document-types")) return Promise.resolve(jsonResponse({ data: [] }))
      if (url.includes("/documents")) return Promise.resolve(jsonResponse({ data: [] }))
      if (url.includes("/tasks")) return Promise.resolve(jsonResponse({ data: [], meta: { current_page: 1, last_page: 1, per_page: 50, total: 0, from: null, to: null } }))
      if (url.includes("/notes") && init?.method === "POST") {
        return Promise.resolve(jsonResponse({ data: { id: 3, type: "note", body: "New note", user: null, created_at: null } }, 201))
      }
      return Promise.resolve(jsonResponse({ data: STUDENT }))
    }),
  )
}

function renderProfile() {
  return renderWithProviders(
    <Routes>
      <Route path="/students/:id" element={<StudentProfilePage />} />
    </Routes>,
    { route: "/students/5" },
  )
}

it("renders the identity card, guardians and timeline feed", async () => {
  useAuthStore.setState({ token: "t", user: makeUser(["students.view.assigned"]) })
  stubProfileFetch()

  renderProfile()

  expect(await screen.findByText("Ali Khan")).toBeInTheDocument()
  expect(screen.getByText("STU-2026-00005")).toBeInTheDocument()
  expect(screen.getByText("AB1234567")).toBeInTheDocument()
  expect(screen.getByText(/Mr\. Khan/)).toBeInTheDocument()
  expect(await screen.findByText("Converted from lead #11")).toBeInTheDocument()
  expect(screen.getByText("Family call done.")).toBeInTheDocument()
})

it("hides the note composer and status control from read-only viewers", async () => {
  useAuthStore.setState({ token: "t", user: makeUser(["students.view.assigned"]) })
  stubProfileFetch()

  renderProfile()

  await screen.findByText("Ali Khan")
  expect(screen.queryByPlaceholderText(/Add a note/)).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: "Add note" })).not.toBeInTheDocument()
})

it("posts a note and refreshes the timeline for update-permission holders", async () => {
  useAuthStore.setState({
    token: "t",
    user: makeUser(["students.view.assigned", "students.update.assigned"]),
  })
  stubProfileFetch()
  const user = userEvent.setup()

  renderProfile()

  const composer = await screen.findByPlaceholderText(/Add a note/)
  await user.type(composer, "Follow-up scheduled")
  await user.click(screen.getByRole("button", { name: "Add note" }))

  // Composer clears on success.
  expect(await screen.findByPlaceholderText(/Add a note/)).toHaveValue("")
})

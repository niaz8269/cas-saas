import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { useAuthStore } from "@/stores/auth"
import { jsonResponse, renderWithProviders } from "@/test/utils"
import type { AuthUser } from "@/types/auth"

import TasksPage from "./TasksPage"

const USER: AuthUser = {
  id: 2, name: "Counselor", email: "c@cas.moe", phone: null, status: "active",
  roles: ["Counselor"], permissions: ["dashboard.view.assigned"], last_login_at: null,
}

const META = { current_page: 1, last_page: 1, per_page: 25, total: 2, from: 1, to: 2 }

const TASKS = [
  {
    id: 11, title: "Call Ali about passport", description: null, status: "open", priority: "high",
    due_at: new Date(Date.now() - 3 * 86_400_000).toISOString(), overdue: true,
    student: { id: 5, name: "Ali Khan" }, related: { type: "Lead", id: 9 }, created_at: null,
  },
  {
    id: 12, title: "Send offer letter", description: null, status: "done", priority: "normal",
    due_at: null, overdue: false, student: null, related: null, created_at: null,
  },
]

beforeEach(() => {
  vi.restoreAllMocks()
  useAuthStore.setState({ token: "t", user: USER })
})

it("lists tasks with priority, due label and links to the student and lead", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: TASKS, meta: META })))

  renderWithProviders(<TasksPage />)

  expect(await screen.findByText("Call Ali about passport")).toBeInTheDocument()
  expect(screen.getByText("3d overdue")).toBeInTheDocument()
  expect(screen.getByRole("link", { name: "Ali Khan" })).toHaveAttribute("href", "/students/5")
  expect(screen.getByRole("link", { name: "Lead" })).toHaveAttribute("href", "/leads/9")
  // The finished task offers to reopen rather than complete.
  expect(screen.getByRole("button", { name: "Reopen task" })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Mark done" })).toBeInTheDocument()
})

it("shows the caught-up empty state when there is nothing active", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: [], meta: { ...META, total: 0, from: null, to: null } })))

  renderWithProviders(<TasksPage />)

  expect(await screen.findByText(/all caught up/)).toBeInTheDocument()
})

it("marks a task done with a PATCH and asks for the active tab by default", async () => {
  const user = userEvent.setup()
  const calls: { url: string; init?: RequestInit }[] = []

  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init })

      return Promise.resolve(jsonResponse({ data: init?.method === "PATCH" ? { ...TASKS[0], status: "done" } : TASKS, meta: META }))
    }),
  )

  renderWithProviders(<TasksPage />)

  await user.click(await screen.findByRole("button", { name: "Mark done" }))

  await waitFor(() => expect(calls.some((c) => c.init?.method === "PATCH")).toBe(true))
  const patch = calls.find((c) => c.init?.method === "PATCH")!
  expect(patch.url).toContain("/tasks/11")
  expect(JSON.parse(String(patch.init!.body))).toEqual({ status: "done" })
  expect(calls[0].url).toContain("filter%5Bstatus%5D=active")
})

it("switches tabs and refetches with that status", async () => {
  const user = userEvent.setup()
  const urls: string[] = []

  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((input: RequestInfo | URL) => {
      urls.push(String(input))

      return Promise.resolve(jsonResponse({ data: TASKS, meta: META }))
    }),
  )

  renderWithProviders(<TasksPage />)
  await screen.findByText("Call Ali about passport")

  await user.click(screen.getByRole("button", { name: "done" }))

  await waitFor(() => expect(urls.some((u) => u.includes("filter%5Bstatus%5D=done"))).toBe(true))
})

import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import AgentApplications from "./AgentApplications"

const ROW = (id: number, code: string, program: string, university: string, status: string, progress: { status: string; at: string }[]) => ({
  id, application_code: code, status, submitted_at: null, student: { id: 7, student_code: "STU-7", full_name: "Ali Raza" },
  university, program: { name: program, level: "master" }, intake: "Autumn 2027", progress,
})

const LIST = {
  data: [
    ROW(1, "APP-1", "Civil Engineering", "Harbin Institute of Technology", "under_review", [{ status: "draft", at: "2026-11-01T10:00:00Z" }, { status: "under_review", at: "2026-11-03T10:00:00Z" }]),
    ROW(2, "APP-2", "Clinical Medicine", "Harbin Medical University", "draft", [{ status: "draft", at: "2026-11-05T10:00:00Z" }]),
  ],
  meta: { current_page: 1, last_page: 1, per_page: 25, total: 2, from: 1, to: 2 },
}

it("lists every application of a student together, each with its own trail of steps", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(LIST)))
  renderWithProviders(<AgentApplications />)

  expect(await screen.findByRole("heading", { name: /Ali Raza/ })).toBeInTheDocument()
  expect(screen.getByText("Civil Engineering")).toBeInTheDocument()
  expect(screen.getByText("Clinical Medicine")).toBeInTheDocument()
  expect(screen.getAllByRole("list", { name: "Application progress" })).toHaveLength(2)
  expect(screen.getAllByText("under review").length).toBeGreaterThan(0)
})

it("offers to continue only an unfinished draft", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(LIST)))
  renderWithProviders(<AgentApplications />)

  const links = await screen.findAllByRole("link", { name: "Continue this application" })

  expect(links).toHaveLength(1)
  expect(links[0]).toHaveAttribute("href", "/portal/agent/apply?draft=2")
})

it("asks the server for one status or one student when filtered", async () => {
  const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse(LIST)))
  vi.stubGlobal("fetch", fetchMock)
  const user = userEvent.setup()
  renderWithProviders(<AgentApplications />, { route: "/portal/agent/applications?student=7" })

  await screen.findByRole("heading", { name: /Ali Raza/ })
  expect(fetchMock.mock.calls.some(([u]) => String(u).includes("filter%5Bstudent_id%5D=7"))).toBe(true)

  await user.click(screen.getByRole("button", { name: "draft" }))
  await screen.findByRole("heading", { name: /Ali Raza/ })
  expect(fetchMock.mock.calls.some(([u]) => String(u).includes("filter%5Bstatus%5D=draft"))).toBe(true)
})

it("shows a friendly empty state", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: [], meta: { current_page: 1, last_page: 1, per_page: 25, total: 0, from: null, to: null } })))
  renderWithProviders(<AgentApplications />)

  expect(await screen.findByText("No applications yet")).toBeInTheDocument()
})

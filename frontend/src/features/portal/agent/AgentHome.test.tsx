import { screen } from "@testing-library/react"

import { usePortalAuthStore } from "@/stores/portalAuth"
import { jsonResponse, renderWithProviders } from "@/test/utils"

import AgentHome from "./AgentHome"

const STUDENTS = {
  data: [
    { id: 1, student_code: "STU-1", full_name: "Saige Mueller", status: "enrolled", country: "Bangladesh", applications_count: 2, created_at: null },
    { id: 2, student_code: "STU-2", full_name: "Adriana White", status: "in_process", country: "Egypt", applications_count: 1, created_at: null },
  ],
  meta: { current_page: 1, last_page: 1, per_page: 25, total: 2, from: 1, to: 2 },
}

const COMMISSIONS = {
  data: [],
  meta: { current_page: 1, last_page: 1, per_page: 25, total: 0, from: 0, to: 0 },
  totals: { payable: 4120, paid: 8400 },
}

beforeEach(() => {
  vi.restoreAllMocks()
  usePortalAuthStore.setState({
    token: "t", kind: "agent",
    profile: { id: 1, name: "Global Study Partners", email: null, status: "active", code: "GSP-0001" },
  })

  vi.stubGlobal("fetch", vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes("/agent/commissions")) return Promise.resolve(jsonResponse(COMMISSIONS))
    return Promise.resolve(jsonResponse(STUDENTS))
  }))
})

it("leads with the three partner actions, each pointing at its own route", async () => {
  renderWithProviders(<AgentHome />)

  expect(await screen.findByRole("link", { name: /Apply for a student/ })).toHaveAttribute("href", "/portal/agent/apply")
  expect(screen.getByRole("link", { name: /Add student/ })).toHaveAttribute("href", "/portal/agent/students/new")
  expect(screen.getByRole("link", { name: /Government scholarship/ })).toHaveAttribute("href", "/portal/agent/apply-scholarship")
})

it("summarises the book and the money underneath the actions", async () => {
  renderWithProviders(<AgentHome />)

  expect(await screen.findByText("4,120")).toBeInTheDocument() // awaiting payout
  expect(screen.getByText("8,400")).toBeInTheDocument() // paid to date
  expect(screen.getByText("2")).toBeInTheDocument() // student count
})

it("lists recent students with their status", async () => {
  renderWithProviders(<AgentHome />)

  expect(await screen.findByText("Saige Mueller")).toBeInTheDocument()
  expect(screen.getByText("Adriana White")).toBeInTheDocument()
  expect(screen.getByText("Enrolled")).toBeInTheDocument()
  expect(screen.getByRole("link", { name: "View all" })).toHaveAttribute("href", "/portal/agent/students")
})

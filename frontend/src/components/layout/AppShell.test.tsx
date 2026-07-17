import { screen } from "@testing-library/react"
import { Route, Routes } from "react-router-dom"

import AppShell from "@/components/layout/AppShell"
import { useAuthStore } from "@/stores/auth"
import { renderWithProviders } from "@/test/utils"
import type { AuthUser } from "@/types/auth"

function makeUser(overrides: Partial<AuthUser>): AuthUser {
  return {
    id: 1,
    name: "Test Staff",
    email: "staff@cas.moe",
    phone: null,
    status: "active",
    roles: [],
    permissions: [],
    last_login_at: null,
    ...overrides,
  }
}

function renderShell() {
  return renderWithProviders(
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<div>PAGE CONTENT</div>} />
      </Route>
    </Routes>,
  )
}

beforeEach(() => {
  useAuthStore.setState({ token: "token", user: null })
})

it("gates navigation by module permissions (counselor)", () => {
  useAuthStore.setState({
    user: makeUser({
      roles: ["Counselor"],
      permissions: [
        "dashboard.view.assigned",
        "leads.view.assigned",
        "students.view.assigned",
        "commission.view.own",
      ],
    }),
  })

  renderShell()

  expect(screen.getByRole("link", { name: /Dashboard/ })).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /Leads/ })).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /Students/ })).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /Commissions/ })).toBeInTheDocument()

  expect(screen.queryByRole("link", { name: /Users/ })).not.toBeInTheDocument()
  expect(screen.queryByRole("link", { name: /Settings/ })).not.toBeInTheDocument()
  expect(screen.queryByRole("link", { name: /Finance/ })).not.toBeInTheDocument()
})

it("shows every module to Super Admin", () => {
  useAuthStore.setState({
    user: makeUser({ name: "CAS Super Admin", roles: ["Super Admin"] }),
  })

  renderShell()

  for (const link of ["Dashboard", "Leads", "Students", "Applications", "Universities", "Finance", "Visa", "Users", "Settings"]) {
    expect(screen.getByRole("link", { name: new RegExp(link) })).toBeInTheDocument()
  }
})

it("renders the page content and the topbar title", () => {
  useAuthStore.setState({ user: makeUser({ roles: ["Super Admin"] }) })

  renderShell()

  expect(screen.getByText("PAGE CONTENT")).toBeInTheDocument()
  expect(screen.getByRole("heading", { name: "Dashboard" })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Account menu" })).toBeInTheDocument()
})

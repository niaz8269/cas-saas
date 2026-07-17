import { screen } from "@testing-library/react"
import { Route, Routes } from "react-router-dom"

import { useAuthStore } from "@/stores/auth"
import { renderWithProviders } from "@/test/utils"

import RequireAuth from "./RequireAuth"

function renderGuarded(route = "/") {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<div>LOGIN PAGE</div>} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<div>PROTECTED</div>} />
      </Route>
    </Routes>,
    { route },
  )
}

beforeEach(() => {
  useAuthStore.setState({ token: null, user: null })
})

it("redirects unauthenticated visitors to /login", () => {
  renderGuarded()

  expect(screen.getByText("LOGIN PAGE")).toBeInTheDocument()
  expect(screen.queryByText("PROTECTED")).not.toBeInTheDocument()
})

it("renders the protected outlet when a token is present", () => {
  useAuthStore.setState({
    token: "token",
    user: {
      id: 1,
      name: "Staff",
      email: "staff@cas.moe",
      phone: null,
      status: "active",
      roles: [],
      permissions: [],
      last_login_at: null,
    },
  })

  renderGuarded()

  expect(screen.getByText("PROTECTED")).toBeInTheDocument()
})

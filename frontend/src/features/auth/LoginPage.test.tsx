import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"

import { useAuthStore } from "@/stores/auth"
import { jsonResponse, renderWithProviders } from "@/test/utils"

import LoginPage from "./LoginPage"

function renderLogin() {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<div>DASHBOARD</div>} />
    </Routes>,
    { route: "/login" },
  )
}

beforeEach(() => {
  useAuthStore.setState({ token: null, user: null })
  vi.restoreAllMocks()
})

it("renders the branded login form", () => {
  renderLogin()

  expect(
    screen.getByAltText("CAS — Consultancy for Abroad Study"),
  ).toBeInTheDocument()
  expect(screen.getByLabelText("Email")).toBeInTheDocument()
  expect(screen.getByLabelText("Password")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument()
})

it("shows inline validation errors on empty submit", async () => {
  const user = userEvent.setup()
  renderLogin()

  await user.click(screen.getByRole("button", { name: "Sign in" }))

  expect(await screen.findByText("Email is required")).toBeInTheDocument()
  expect(screen.getByText("Password is required")).toBeInTheDocument()
})

it("logs in, stores the token and navigates to the dashboard", async () => {
  const user = userEvent.setup()
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      jsonResponse({
        token: "test-token",
        token_type: "Bearer",
        user: {
          id: 1,
          name: "CAS Super Admin",
          email: "admin@cas.moe",
          phone: null,
          status: "active",
          roles: ["Super Admin"],
          permissions: [],
          last_login_at: null,
        },
      }),
    ),
  )

  renderLogin()

  await user.type(screen.getByLabelText("Email"), "admin@cas.moe")
  await user.type(screen.getByLabelText("Password"), "CasDemo#2026")
  await user.click(screen.getByRole("button", { name: "Sign in" }))

  expect(await screen.findByText("DASHBOARD")).toBeInTheDocument()
  expect(useAuthStore.getState().token).toBe("test-token")
  expect(useAuthStore.getState().user?.email).toBe("admin@cas.moe")
})

it("surfaces server-side credential errors inline", async () => {
  const user = userEvent.setup()
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      jsonResponse(
        {
          message: "These credentials do not match our records.",
          errors: { email: ["These credentials do not match our records."] },
          code: "VALIDATION_ERROR",
        },
        422,
      ),
    ),
  )

  renderLogin()

  await user.type(screen.getByLabelText("Email"), "admin@cas.moe")
  await user.type(screen.getByLabelText("Password"), "wrong")
  await user.click(screen.getByRole("button", { name: "Sign in" }))

  expect(
    await screen.findByText("These credentials do not match our records."),
  ).toBeInTheDocument()
  expect(useAuthStore.getState().token).toBeNull()
})

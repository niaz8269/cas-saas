import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import { ForgotPasswordPage, ResetPasswordPage } from "./PasswordPages"

beforeEach(() => vi.restoreAllMocks())

function renderForgot(mode: "staff" | "portal", route: string) {
  return renderWithProviders(
    <Routes>
      <Route path={route} element={<ForgotPasswordPage mode={mode} />} />
    </Routes>,
    { route },
  )
}

it("asks the staff endpoint for a link and shows the same confirmation", async () => {
  const user = userEvent.setup()
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: "ok" }))
  vi.stubGlobal("fetch", fetchMock)

  renderForgot("staff", "/admin/forgot-password")
  await user.type(screen.getByLabelText("Email"), "boss@cas.moe")
  await user.click(screen.getByRole("button", { name: "Send reset link" }))

  expect(await screen.findByText("Check your email")).toBeInTheDocument()
  expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/auth/staff/forgot-password")
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: "boss@cas.moe" })
})

it("lets portal users pick student or agent", async () => {
  const user = userEvent.setup()
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: "ok" }))
  vi.stubGlobal("fetch", fetchMock)

  renderForgot("portal", "/portal/forgot-password")
  await user.click(screen.getByRole("tab", { name: "Agent" }))
  await user.type(screen.getByLabelText("Email"), "a@x.com")
  await user.click(screen.getByRole("button", { name: "Send reset link" }))

  await screen.findByText("Check your email")
  expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/auth/agent/forgot-password")
})

it("validates the email before calling the server", async () => {
  const user = userEvent.setup()
  const fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)

  renderForgot("staff", "/admin/forgot-password")
  await user.click(screen.getByRole("button", { name: "Send reset link" }))

  expect(await screen.findByText("Email is required")).toBeInTheDocument()
  expect(fetchMock).not.toHaveBeenCalled()
})

function renderReset(route: string, mode: "staff" | "portal" = "staff") {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/reset-password" element={<ResetPasswordPage mode={mode} />} />
      <Route path="/portal/reset-password" element={<ResetPasswordPage mode={mode} />} />
    </Routes>,
    { route },
  )
}

it("changes the password with the token from the link", async () => {
  const user = userEvent.setup()
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: "done" }))
  vi.stubGlobal("fetch", fetchMock)

  renderReset("/admin/reset-password?token=abc&email=boss%40cas.moe&as=staff")
  await user.type(screen.getByLabelText("New password"), "brand-new-pass-9")
  await user.type(screen.getByLabelText("Confirm new password"), "brand-new-pass-9")
  await user.click(screen.getByRole("button", { name: "Change password" }))

  expect(await screen.findByText("Password changed")).toBeInTheDocument()
  expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/auth/staff/reset-password")
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ email: "boss@cas.moe", token: "abc", password: "brand-new-pass-9" })
})

it("uses the agent endpoint when the portal link says so, and flags mismatched passwords", async () => {
  const user = userEvent.setup()
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: "done" }))
  vi.stubGlobal("fetch", fetchMock)

  renderReset("/portal/reset-password?token=abc&email=a%40x.com&as=agent", "portal")
  await user.type(screen.getByLabelText("New password"), "brand-new-pass-9")
  await user.type(screen.getByLabelText("Confirm new password"), "different-pass-1")
  await user.click(screen.getByRole("button", { name: "Change password" }))
  expect(await screen.findByText("Passwords don't match")).toBeInTheDocument()
  expect(fetchMock).not.toHaveBeenCalled()

  await user.clear(screen.getByLabelText("Confirm new password"))
  await user.type(screen.getByLabelText("Confirm new password"), "brand-new-pass-9")
  await user.click(screen.getByRole("button", { name: "Change password" }))
  await screen.findByText("Password changed")
  expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/auth/agent/reset-password")
})

it("shows an expired-link error with a way to request another", async () => {
  const user = userEvent.setup()
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      jsonResponse({ message: "This reset link is invalid or has expired. Request a new one.", errors: { token: ["x"] }, code: "invalid_reset_token" }, 422),
    ),
  )

  renderReset("/admin/reset-password?token=old&email=boss%40cas.moe&as=staff")
  await user.type(screen.getByLabelText("New password"), "brand-new-pass-9")
  await user.type(screen.getByLabelText("Confirm new password"), "brand-new-pass-9")
  await user.click(screen.getByRole("button", { name: "Change password" }))

  expect(await screen.findByText(/invalid or has expired/)).toBeInTheDocument()
  expect(screen.getByRole("link", { name: "Request a new link" })).toHaveAttribute("href", "/admin/forgot-password")
})

it("explains an incomplete link instead of showing a form", () => {
  renderReset("/admin/reset-password")

  expect(screen.getByText(/incomplete/)).toBeInTheDocument()
  expect(screen.queryByLabelText("New password")).not.toBeInTheDocument()
})

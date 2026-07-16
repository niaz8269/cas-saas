import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import LoginPage from "./LoginPage"

it("renders the branded login form", () => {
  render(<LoginPage />)

  expect(
    screen.getByAltText("CAS — Consultancy for Abroad Study"),
  ).toBeInTheDocument()
  expect(screen.getByLabelText("Email")).toBeInTheDocument()
  expect(screen.getByLabelText("Password")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument()
})

it("shows inline validation errors on empty submit", async () => {
  const user = userEvent.setup()
  render(<LoginPage />)

  await user.click(screen.getByRole("button", { name: "Sign in" }))

  expect(await screen.findByText("Email is required")).toBeInTheDocument()
  expect(screen.getByText("Password is required")).toBeInTheDocument()
})

it("rejects a malformed email", async () => {
  const user = userEvent.setup()
  render(<LoginPage />)

  await user.type(screen.getByLabelText("Email"), "not-an-email")
  await user.click(screen.getByRole("button", { name: "Sign in" }))

  expect(
    await screen.findByText("Enter a valid email address"),
  ).toBeInTheDocument()
})

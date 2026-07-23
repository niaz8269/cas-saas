import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { usePortalAuthStore } from "@/stores/portalAuth"
import { jsonResponse, renderWithProviders } from "@/test/utils"

import StudentVerifyBanner from "./StudentVerifyBanner"

function setStudent(emailVerified: boolean) {
  usePortalAuthStore.setState({
    token: "t",
    kind: "student",
    profile: { id: 5, name: "Ali", email: "ali@example.com", status: "active", code: "STU-1", email_verified: emailVerified },
  })
}

it("prompts an unverified student and resends the email", async () => {
  setStudent(false)
  const user = userEvent.setup()
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ message: "Verification email sent." })))

  renderWithProviders(<StudentVerifyBanner />)

  expect(screen.getByText(/verify your email/i)).toBeInTheDocument()

  await user.click(screen.getByRole("button", { name: "Resend" }))

  expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument()
})

it("renders nothing once the email is verified", () => {
  setStudent(true)

  renderWithProviders(<StudentVerifyBanner />)

  expect(screen.queryByText(/verify your email/i)).not.toBeInTheDocument()
})

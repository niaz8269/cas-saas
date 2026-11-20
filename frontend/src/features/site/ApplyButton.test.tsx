import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { renderWithProviders } from "@/test/utils"
import { usePortalAuthStore } from "@/stores/portalAuth"

import ApplyButton from "./ApplyButton"

const APPLY = "/portal/student/apply?university=jilin-medical"

beforeEach(() => usePortalAuthStore.setState({ token: null, kind: null, profile: null }))
afterEach(() => vi.restoreAllMocks())

function setup() {
  const open = vi.spyOn(window, "open").mockReturnValue({} as Window)
  renderWithProviders(<ApplyButton universitySlug="jilin-medical">Apply now</ApplyButton>)

  return open
}

it("opens the login in a new tab, with a redirect back to the scoped apply form, for a guest", async () => {
  const user = userEvent.setup()
  const open = setup()

  await user.click(screen.getByRole("button", { name: /Apply now/ }))

  expect(open).toHaveBeenCalledWith(`/portal/login?redirect=${encodeURIComponent(APPLY)}`, "_blank", "noopener,noreferrer")
})

it("opens the scoped apply form in a new tab for a signed-in student", async () => {
  const user = userEvent.setup()
  usePortalAuthStore.setState({ token: "tok", kind: "student", profile: null })
  const open = setup()

  await user.click(screen.getByRole("button", { name: /Apply now/ }))

  expect(open).toHaveBeenCalledWith(APPLY, "_blank", "noopener,noreferrer")
})

it("tells screen readers that it opens a new tab", () => {
  setup()

  expect(screen.getByRole("button", { name: "Apply now (opens in a new tab)" })).toBeInTheDocument()
})

import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes, useLocation } from "react-router-dom"

import { renderWithProviders } from "@/test/utils"
import { usePortalAuthStore } from "@/stores/portalAuth"

import ApplyButton from "./ApplyButton"

function LocationProbe() {
  const loc = useLocation()
  return <div data-testid="loc">{loc.pathname + loc.search}</div>
}

function setup() {
  return renderWithProviders(
    <>
      <ApplyButton universitySlug="jilin-medical">Apply now</ApplyButton>
      <Routes>
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </>,
  )
}

const APPLY = "/portal/student/apply?university=jilin-medical"

beforeEach(() => usePortalAuthStore.setState({ token: null, kind: null, profile: null }))

it("sends a guest to login with a redirect back to the scoped apply form", async () => {
  const user = userEvent.setup()
  setup()

  await user.click(screen.getByRole("button", { name: "Apply now" }))

  expect(screen.getByTestId("loc")).toHaveTextContent(`/portal/login?redirect=${encodeURIComponent(APPLY)}`)
})

it("sends a signed-in student straight to the scoped apply form", async () => {
  const user = userEvent.setup()
  usePortalAuthStore.setState({ token: "tok", kind: "student", profile: null })
  setup()

  await user.click(screen.getByRole("button", { name: "Apply now" }))

  expect(screen.getByTestId("loc")).toHaveTextContent(APPLY)
})

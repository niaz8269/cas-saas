import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import type { DraftApplication, WizardProgram } from "@/features/portal/api"
import { renderWithProviders } from "@/test/utils"

import { CustomFieldsCard, ReviewStep } from "./applySteps"

it("renders a radio custom field and reports the chosen option", async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  const fields = [
    { key: "preferred_major", label: "Preferred major", type: "radio" as const, required: true, options: ["Medicine", "Engineering"] },
  ]

  renderWithProviders(<CustomFieldsCard fields={fields} answers={{}} onChange={onChange} />)

  await user.click(screen.getByRole("radio", { name: "Medicine" }))

  expect(onChange).toHaveBeenCalledWith("preferred_major", "Medicine")
})

it("reviews the applicant's details, documents and a preview link", () => {
  const program = { name: "MBBS", university: { name: "Xinjiang Medical University", city: "Urumqi" } } as unknown as WizardProgram
  const draft = {
    id: 1,
    application_code: "APP-2026-00019",
    required_documents: [{ id: 5, name: "Passport" }, { id: 6, name: "School Leaving Certificate" }],
  } as unknown as DraftApplication

  renderWithProviders(
    <ReviewStep
      program={program}
      draft={draft}
      agreed={false}
      onAgreed={() => {}}
      profile={{ passport_no: "AB1234567", city: "Lahore" }}
      guardians={[{ relation: "father", name: "Ali Khan" }]}
      education={[{ degree_name: "FSc Pre-Medical", institution: "Govt College", end_year: 2024 }]}
      uploaded={{ 5: "passport.jpg" }}
      previews={{ 5: "blob:preview-url" }}
    />,
  )

  // Personal details + background
  expect(screen.getByText("AB1234567")).toBeInTheDocument()
  expect(screen.getByText("Ali Khan")).toBeInTheDocument()
  expect(screen.getByText(/FSc Pre-Medical/)).toBeInTheDocument()

  // Documents: uploaded one has a preview link; the missing one is flagged
  expect(screen.getByText(/passport\.jpg/)).toBeInTheDocument()
  expect(screen.getByRole("link", { name: "View" })).toHaveAttribute("href", "blob:preview-url")
  expect(screen.getByText("Not uploaded")).toBeInTheDocument()
})

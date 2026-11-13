import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import type { DraftApplication, WizardProgram } from "@/features/portal/api"
import { renderWithProviders } from "@/test/utils"

import { CourseStep, CustomFieldsCard, ReviewStep } from "./applySteps"

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

function prog(id: number, name: string, uni: string, city: string, lang: string): WizardProgram {
  return {
    id, name, level: "master", teaching_language: lang, duration_months: 24, tuition_fee: 3000, hostel_fee: null, currency: "CNY", service_charge: null,
    university: { id, name: uni, slug: null, city, country: "China", moe_listed: true }, intakes: [], scholarships: [],
  }
}

const PROGRAMS = [
  prog(1, "Civil Engineering", "Harbin Institute of Technology", "Harbin", "English"),
  prog(2, "Clinical Medicine", "Harbin Medical University", "Harbin", "English"),
  prog(3, "Chinese Language", "Beijing Normal University", "Beijing", "Chinese"),
]

function renderCourse() {
  return renderWithProviders(
    <CourseStep
      degree="master" funding="self" program={null} intakeId="" scholarshipId="" programs={PROGRAMS} loading={false} failed={false}
      fundingAvailable={{ self: true, scholarship: false, partial: false }} fundingLoading={false} customAnswers={{}}
      onDegree={() => {}} onFunding={() => {}} onProgram={() => {}} onIntake={() => {}} onScholarship={() => {}} onCustomAnswer={() => {}}
    />,
  )
}

it("lets you search the available programs by program, university or city", async () => {
  const user = userEvent.setup()
  renderCourse()

  expect(screen.getByText("Showing 3 of 3 programs")).toBeInTheDocument()
  await user.type(screen.getByRole("searchbox"), "harbin engineering")

  expect(screen.getByText("Civil Engineering")).toBeInTheDocument()
  expect(screen.queryByText("Clinical Medicine")).not.toBeInTheDocument()
  expect(screen.queryByText("Chinese Language")).not.toBeInTheDocument()
  expect(screen.getByText("Showing 1 of 3 programs")).toBeInTheDocument()
})

it("filters by university, city and teaching language, and clears them again", async () => {
  const user = userEvent.setup()
  renderCourse()

  await user.selectOptions(screen.getByLabelText("City"), "Harbin")
  expect(screen.getByText("Showing 2 of 3 programs")).toBeInTheDocument()

  await user.selectOptions(screen.getByLabelText("University"), "Harbin Medical University")
  expect(screen.getByText("Clinical Medicine")).toBeInTheDocument()
  expect(screen.queryByText("Civil Engineering")).not.toBeInTheDocument()

  await user.selectOptions(screen.getByLabelText("Teaching language"), "Chinese")
  expect(screen.getByText(/No programs match your search/)).toBeInTheDocument()

  await user.click(screen.getByRole("button", { name: "Clear filters" }))
  expect(screen.getByText("Showing 3 of 3 programs")).toBeInTheDocument()
})

it("still finds the program when the search has a typing mistake", async () => {
  const user = userEvent.setup()
  renderCourse()

  await user.type(screen.getByRole("searchbox"), "herbin enginering")

  expect(screen.getByText("Civil Engineering")).toBeInTheDocument()
  expect(screen.queryByText("Clinical Medicine")).not.toBeInTheDocument()
})

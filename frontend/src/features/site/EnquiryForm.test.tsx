import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import EnquiryForm from "./EnquiryForm"

beforeEach(() => vi.restoreAllMocks())

it("submits an enquiry and shows the thank-you state", async () => {
  const user = userEvent.setup()
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: "Thank you — a CAS advisor will be in touch shortly." }, 202))
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<EnquiryForm universityId={1} universityName="Jilin Medical University" />)

  await user.type(screen.getByLabelText("First name"), "Ali")
  await user.type(screen.getByLabelText("Email"), "ali@example.com")
  await user.type(screen.getByLabelText("Message"), "Interested in MBBS")
  await user.click(screen.getByRole("button", { name: /Send enquiry/ }))

  expect(await screen.findByText("Thank you!")).toBeInTheDocument()

  const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
  expect(body).toMatchObject({ first_name: "Ali", email: "ali@example.com", interested_university_id: 1 })
})

it("surfaces server validation errors", async () => {
  const user = userEvent.setup()
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
    jsonResponse({ message: "The first name field is required.", errors: { first_name: ["The first name field is required."] } }, 422),
  ))

  renderWithProviders(<EnquiryForm />)

  await user.type(screen.getByLabelText("Email"), "x@example.com")
  await user.click(screen.getByRole("button", { name: /Send enquiry/ }))

  expect(await screen.findByText("The first name field is required.")).toBeInTheDocument()
})

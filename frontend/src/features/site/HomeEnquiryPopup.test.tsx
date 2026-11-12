import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, expect, it, vi } from "vitest"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import HomeEnquiryPopup from "./HomeEnquiryPopup"
import { homePopupState } from "./homePopupState"

const EMPTY = { data: [] }

beforeEach(() => { homePopupState.shown = false })
afterEach(() => vi.unstubAllGlobals())

it("opens after a short delay with the CAS title and the degree choices", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(EMPTY)))
  renderWithProviders(<HomeEnquiryPopup delayMs={10} />)

  expect(await screen.findByRole("dialog")).toBeInTheDocument()
  expect(screen.getByText("Apply to Study in China with CAS")).toBeInTheDocument()
  const degree = screen.getByLabelText("Degree") as HTMLSelectElement
  expect(Array.from(degree.options).map((o) => o.text)).toEqual(["Degree", "Bachelors", "Master", "PhD", "Non-Degree"])
})

it("asks for the missing details instead of submitting", async () => {
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse(EMPTY))
  vi.stubGlobal("fetch", fetchMock)
  const user = userEvent.setup()
  renderWithProviders(<HomeEnquiryPopup delayMs={10} />)

  await screen.findByRole("dialog")
  await user.click(screen.getByRole("button", { name: "Submit" }))

  expect(await screen.findByText("Please choose a degree")).toBeInTheDocument()
  expect(screen.getByText("Please enter your name")).toBeInTheDocument()
  expect(fetchMock.mock.calls.some(([u]) => String(u).includes("/public/enquiries"))).toBe(false)
})

it("sends the visitor to the enquiry endpoint as a lead with their degree and program", async () => {
  const fetchMock = vi.fn().mockImplementation((url: string) =>
    Promise.resolve(String(url).includes("/public/enquiries") ? jsonResponse({ message: "ok" }, 202) : jsonResponse(EMPTY)),
  )
  vi.stubGlobal("fetch", fetchMock)
  const user = userEvent.setup()
  renderWithProviders(<HomeEnquiryPopup delayMs={10} />)

  await screen.findByRole("dialog")
  await user.selectOptions(screen.getByLabelText("Degree"), "master")
  await user.selectOptions(screen.getByLabelText("Program"), "engineering")
  await user.type(screen.getByLabelText("Name"), "Ali Raza")
  await user.selectOptions(screen.getByLabelText("Nationality"), "PK")
  await user.type(screen.getByLabelText("WhatsApp"), "+92 300 1234567")
  await user.click(screen.getByRole("button", { name: "Submit" }))

  await screen.findByText("Thank you!")
  const call = fetchMock.mock.calls.find(([u]) => String(u).includes("/public/enquiries"))!
  const body = JSON.parse((call[1] as RequestInit).body as string)
  expect(body).toMatchObject({ first_name: "Ali", last_name: "Raza", phone: "+92 300 1234567", country: "PK", form_type: "home_popup" })
  expect(body.details).toMatchObject({ degree: "Master", program: "Engineering", nationality: "Pakistan" })
})

it("does not open for automated browsers such as search engine crawlers", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(EMPTY)))
  vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue("Mozilla/5.0 (compatible; Googlebot/2.1)")
  renderWithProviders(<HomeEnquiryPopup delayMs={10} />)

  await new Promise((r) => setTimeout(r, 80))
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
})

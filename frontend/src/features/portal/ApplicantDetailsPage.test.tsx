import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import ApplicantDetailsPage from "./ApplicantDetailsPage"

const RECORD = {
  data: {
    id: 7, student_code: "STU-7", first_name: "Ali", last_name: "Raza", full_name: "Ali Raza", email: null, status: "active",
    profile: { city: "Lahore", place_of_birth: "Karachi" },
    guardians: [{ relation: "father", name: "Raza Khan" }],
    education: [{ degree_name: "FSc", level: "", institution: "Govt College" }],
  },
}

function stub(saveStatus = 200, saveBody: unknown = RECORD) {
  const calls: { url: string; method: string; body: unknown }[] = []
  vi.stubGlobal("fetch", vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? "GET"
    calls.push({ url, method, body: init?.body })
    if (method === "PUT") return Promise.resolve(jsonResponse(saveBody, saveStatus))
    if (url.includes("/countries")) return Promise.resolve(jsonResponse({ data: [{ id: 1, name: "Pakistan", iso2: "PK" }] }))

    return Promise.resolve(jsonResponse(RECORD))
  }))

  return calls
}

const renderAgent = () => renderWithProviders(
  <Routes><Route path="/portal/agent/students/:id/details" element={<ApplicantDetailsPage kind="agent" />} /></Routes>,
  { route: "/portal/agent/students/7/details" },
)

it("shows what is on file for the student and saves a correction to the partner's student", async () => {
  const user = userEvent.setup()
  const calls = stub()
  renderAgent()

  expect(await screen.findByText(/Correct or complete the details of Ali Raza/)).toBeInTheDocument()
  expect(await screen.findByDisplayValue("Lahore")).toBeInTheDocument()

  const city = screen.getByDisplayValue("Lahore")
  await user.clear(city)
  await user.type(city, "Islamabad")
  await user.click(screen.getByRole("button", { name: "Save details" }))

  await waitFor(() => expect(calls.some((c) => c.method === "PUT" && c.url.endsWith("/agent/students/7/details"))).toBe(true))
  const body = JSON.parse(String(calls.find((c) => c.method === "PUT")!.body))
  expect(body.profile).toMatchObject({ city: "Islamabad", place_of_birth: "Karachi" })
  expect(body.guardians[0]).toMatchObject({ relation: "father", name: "Raza Khan" })
  expect(body.education[0]).toMatchObject({ degree_name: "FSc" })
})

it("says why when the details are locked", async () => {
  const user = userEvent.setup()
  stub(409, { message: "These details are locked because an application was accepted. Contact CAS to change them.", code: "LOCKED" })
  renderAgent()

  await user.click(await screen.findByRole("button", { name: "Save details" }))

  expect(await screen.findByRole("alert")).toHaveTextContent("locked because an application was accepted")
})

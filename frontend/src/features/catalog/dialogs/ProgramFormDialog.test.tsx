import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { jsonResponse, renderWithProviders } from "@/test/utils"
import type { Program } from "@/features/catalog/api"

import ProgramFormDialog from "./ProgramFormDialog"

const PROGRAM: Program = {
  id: 10, university_id: 1, name: "MBBS", level: "bachelor",
  duration_months: 72, tuition_fee: "30000.00", currency: "CNY",
  teaching_language: "English", apply_link: "https://apply.example.cn",
  requirements: null, service_charges: null, status: "active",
}

const DOC_TYPES = [
  { id: 1, name: "Passport", category: "identity", is_sensitive: true, required_for: ["application"] },
  { id: 2, name: "Academic Transcript", category: "academic", is_sensitive: false, required_for: ["application"] },
]

/** Wrap a POST/PATCH mock so GET /document-types returns the type list. */
function withDocTypes(main: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) {
  return vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) =>
    String(input).includes("/document-types")
      ? Promise.resolve(jsonResponse({ data: DOC_TYPES }))
      : main(input, init))
}

beforeEach(() => vi.restoreAllMocks())

it("creates a program with numeric fields coerced", async () => {
  const user = userEvent.setup()
  const fetchMock = withDocTypes(() => Promise.resolve(jsonResponse({ data: { ...PROGRAM, id: 11 } }, 201)))
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<ProgramFormDialog universityId={1} open onOpenChange={() => {}} />)

  await user.type(screen.getByLabelText("Name"), "Nursing")
  await user.type(screen.getByLabelText("Tuition / year"), "26000")
  await user.click(screen.getByRole("button", { name: "Add program" }))

  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/programs", expect.objectContaining({ method: "POST" })))
  const body = JSON.parse((fetchMock.mock.calls.find(([u, i]) => u === "/api/v1/programs" && (i as RequestInit)?.method === "POST")![1] as RequestInit).body as string)
  expect(body).toMatchObject({ university_id: 1, name: "Nursing", tuition_fee: 26000, level: "bachelor" })
})

it("sends the per-course service-charge matrix", async () => {
  const user = userEvent.setup()
  const fetchMock = withDocTypes(() => Promise.resolve(jsonResponse({ data: { ...PROGRAM, id: 12 } }, 201)))
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<ProgramFormDialog universityId={1} open onOpenChange={() => {}} />)

  await user.type(screen.getByLabelText("Name"), "MBBS")
  await user.type(screen.getByLabelText("Partial student charge"), "450")
  await user.type(screen.getByLabelText("Partial agent charge"), "220")
  await user.click(screen.getByRole("button", { name: "Add program" }))

  await waitFor(() => expect(fetchMock).toHaveBeenCalled())
  const body = JSON.parse((fetchMock.mock.calls.find(([u, i]) => u === "/api/v1/programs" && (i as RequestInit)?.method === "POST")![1] as RequestInit).body as string)
  expect(body.service_charges).toMatchObject({ currency: "USD", partial: { student: 450, agent: 220 } })
})

it("saves required documents and section toggles", async () => {
  const user = userEvent.setup()
  const fetchMock = withDocTypes(() => Promise.resolve(jsonResponse({ data: { ...PROGRAM, id: 13 } }, 201)))
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<ProgramFormDialog universityId={1} open onOpenChange={() => {}} />)

  await user.type(screen.getByLabelText("Name"), "PhD Physics")
  await user.click(await screen.findByLabelText("Passport"))
  await user.click(screen.getByLabelText("Research details"))
  await user.click(screen.getByRole("button", { name: "Add program" }))

  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/programs", expect.objectContaining({ method: "POST" })))
  const body = JSON.parse((fetchMock.mock.calls.find(([u, i]) => u === "/api/v1/programs" && (i as RequestInit)?.method === "POST")![1] as RequestInit).body as string)
  expect(body.requirements).toMatchObject({ documents: [1], sections: { research: true } })
})

it("edits an existing program (PATCH, pre-filled)", async () => {
  const user = userEvent.setup()
  const fetchMock = withDocTypes(() => Promise.resolve(jsonResponse({ data: PROGRAM })))
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<ProgramFormDialog universityId={1} program={PROGRAM} open onOpenChange={() => {}} />)

  expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("MBBS")
  expect(screen.getByDisplayValue("English")).toBeInTheDocument()

  await user.click(screen.getByRole("button", { name: "Save changes" }))

  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/programs/10", expect.objectContaining({ method: "PATCH" })))
})

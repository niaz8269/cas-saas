import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { jsonResponse, renderWithProviders } from "@/test/utils"
import type { University } from "@/features/catalog/api"

import UniversityFormDialog from "./UniversityFormDialog"

const UNI: University = {
  id: 1, name: "Jilin Medical University", code: "JLMU", slug: "jilin-medical-university",
  city: "Jilin City", address: null, website: "www.jlmu.cn", apply_link: null,
  logo_path: null, cover_path: null, logo_url: null, cover_url: null,
  status: "active", moe_listed: true,
  nearest_airport: null, about: null, requirements: ["IELTS 6.0"],
  representative_professor: { name: "Prof. Li Wei", title: "Dean", photo: null, photo_url: null },
}

/** Route /document-types to `docs`; every other request → a fresh `main`. */
function stubFetch(main: () => Response, docs: unknown[] = []) {
  const fn = vi.fn((url: RequestInfo | URL) =>
    Promise.resolve(String(url).includes("/document-types") ? jsonResponse({ data: docs }) : main()),
  )
  vi.stubGlobal("fetch", fn)

  return fn
}

const uniCall = (fn: ReturnType<typeof vi.fn>, path = "/api/v1/universities") =>
  fn.mock.calls.find((c) => c[0] === path)!

beforeEach(() => vi.restoreAllMocks())

it("creates a university with content fields", async () => {
  const user = userEvent.setup()
  const fetchMock = stubFetch(() => jsonResponse({ data: { ...UNI, id: 2 } }, 201))

  renderWithProviders(<UniversityFormDialog open onOpenChange={() => {}} />)

  await user.type(screen.getByLabelText("Name"), "Dalian Medical University")
  await user.type(screen.getByLabelText("Code"), "dmu")
  // Add a requirement
  await user.click(screen.getByRole("button", { name: "Add" }))
  await user.type(screen.getByPlaceholderText("e.g. IELTS 6.0"), "High school diploma")
  await user.click(screen.getByRole("button", { name: "Create university" }))

  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/universities", expect.objectContaining({ method: "POST" })))
  const body = JSON.parse((uniCall(fetchMock)[1] as RequestInit).body as string)
  expect(body).toMatchObject({ name: "Dalian Medical University", code: "DMU", requirements: ["High school diploma"] })
})

it("saves an application form (document + custom field) on the university", async () => {
  const user = userEvent.setup()
  const fetchMock = stubFetch(() => jsonResponse({ data: { ...UNI, id: 2 } }, 201), [{ id: 3, name: "Passport" }])

  renderWithProviders(<UniversityFormDialog open onOpenChange={() => {}} />)

  await user.type(screen.getByLabelText("Name"), "Peking University")
  await user.type(screen.getByLabelText("Code"), "pku")

  // Application form: require the Passport document + add a custom question.
  await user.click(await screen.findByLabelText("Passport"))
  await user.click(screen.getByRole("button", { name: "Add field" }))
  await user.type(screen.getByLabelText("Field 1 label"), "Preferred major")
  await user.click(screen.getByRole("button", { name: "Create university" }))

  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/universities", expect.objectContaining({ method: "POST" })))
  const body = JSON.parse((uniCall(fetchMock)[1] as RequestInit).body as string)
  expect(body.application_form.documents).toEqual([3])
  expect(body.application_form.fields[0]).toMatchObject({ key: "preferred_major", label: "Preferred major", type: "text" })
})

it("edits an existing university (PATCH, pre-filled)", async () => {
  const user = userEvent.setup()
  const fetchMock = stubFetch(() => jsonResponse({ data: UNI }))

  renderWithProviders(<UniversityFormDialog open onOpenChange={() => {}} university={UNI} />)

  // Pre-filled from the university.
  expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Jilin Medical University")
  expect(screen.getByDisplayValue("IELTS 6.0")).toBeInTheDocument()

  await user.click(screen.getByRole("button", { name: "Save changes" }))

  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/universities/1", expect.objectContaining({ method: "PATCH" })))
})

it("surfaces a server validation error", async () => {
  const user = userEvent.setup()
  stubFetch(() => jsonResponse(
    { message: "The code has already been taken.", errors: { code: ["The code has already been taken."] }, code: "VALIDATION_ERROR" },
    422,
  ))

  renderWithProviders(<UniversityFormDialog open onOpenChange={() => {}} />)

  await user.type(screen.getByLabelText("Name"), "X")
  await user.type(screen.getByLabelText("Code"), "JLMU")
  await user.click(screen.getByRole("button", { name: "Create university" }))

  expect(await screen.findByText("The code has already been taken.")).toBeInTheDocument()
})

import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { usePortalAuthStore } from "@/stores/portalAuth"
import { jsonResponse, renderWithProviders } from "@/test/utils"

import TestimonialPage from "./TestimonialPage"

beforeEach(() => {
  vi.restoreAllMocks()
  usePortalAuthStore.setState({ token: "t", kind: "student", profile: { id: 5, name: "Sara Khan", email: null, status: "active", code: "STU-1" } })
})

function mockApi(onPost?: (init: RequestInit) => void) {
  let submitted = false
  const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (String(url).endsWith("/testimonial/photo")) return Promise.resolve(jsonResponse({ path: "/uploads/testimonials/11111111-1111-1111-1111-111111111111.webp", url: "/uploads/testimonials/p.webp" }, 201))
    if (init?.method === "POST") {
      submitted = true
      onPost?.(init)

      return Promise.resolve(jsonResponse({ data: { id: 1, status: "pending" } }, 201))
    }

    return Promise.resolve(jsonResponse({ data: submitted ? { id: 1, status: "pending", quote: "x".repeat(40) } : null }))
  })
  vi.stubGlobal("fetch", fetchMock)

  return fetchMock
}

it("has no star rating and asks a student for name, photo, nationality, university, degree, major and experience", async () => {
  mockApi()
  renderWithProviders(<TestimonialPage kind="student" />)

  expect(await screen.findByLabelText(/Your name/)).toHaveValue("Sara Khan")
  for (const label of [/Nationality/, /University you are enrolled in/, /Degree/, /Major/, /Your experience/]) {
    expect(screen.getByLabelText(label)).toBeInTheDocument()
  }
  expect(screen.getByRole("button", { name: "Upload photo" })).toBeInTheDocument()
  expect(screen.queryByRole("radio", { name: /star/ })).not.toBeInTheDocument()
})

it("uploads the photo, sends everything and then shows a thank-you", async () => {
  const user = userEvent.setup()
  let body: Record<string, unknown> = {}
  const fetchMock = mockApi((init) => { body = JSON.parse(init.body as string) })

  renderWithProviders(<TestimonialPage kind="student" />)

  await user.upload(await screen.findByLabelText("Upload photo", { selector: "input" }).catch(() => document.getElementById("tm-photo") as HTMLInputElement), new File(["x"], "me.jpg", { type: "image/jpeg" }))
  expect(await screen.findByRole("img", { name: "Your photo" })).toBeInTheDocument()

  await user.selectOptions(screen.getByLabelText(/Nationality/), "PK")
  await user.type(screen.getByLabelText(/University you are enrolled in/), "Jilin University")
  await user.selectOptions(screen.getByLabelText(/Degree/), "bachelor")
  await user.type(screen.getByLabelText(/Major/), "MBBS")
  await user.type(screen.getByLabelText(/Your experience/), "The team guided me at every step of my application.")
  await user.click(screen.getByRole("button", { name: "Admission" }))
  await user.click(screen.getByRole("checkbox"))
  await user.click(screen.getByRole("button", { name: "Send" }))

  expect(await screen.findByText(/Our team will review your words soon/)).toBeInTheDocument()
  const upload = fetchMock.mock.calls.find(([u]) => String(u).endsWith("/testimonial/photo"))!
  expect(upload[1].body).toBeInstanceOf(FormData)
  expect(body).toMatchObject({
    display_name: "Sara Khan", country_code: "PK", university: "Jilin University", degree: "bachelor", program: "MBBS",
    photo_path: "/uploads/testimonials/11111111-1111-1111-1111-111111111111.webp", services: ["admission"], consent_public: true,
  })
  expect(body).not.toHaveProperty("rating")
}, 20000)

it("shows the server's message for each missing required field", async () => {
  const user = userEvent.setup()
  vi.stubGlobal("fetch", vi.fn().mockImplementation((_u: string, init?: RequestInit) =>
    Promise.resolve(init?.method === "POST"
      ? jsonResponse({ message: "x", errors: { photo_path: ["Please add your photo."], university: ["The university field is required."], consent_public: ["Please confirm that we may show your words and name on the website."] } }, 422)
      : jsonResponse({ data: null }))))

  renderWithProviders(<TestimonialPage kind="student" />)

  await user.click(await screen.findByRole("button", { name: "Send" }))

  expect(await screen.findByText("Please add your photo.")).toBeInTheDocument()
  expect(screen.getByText("The university field is required.")).toBeInTheDocument()
  expect(screen.getByText(/Please confirm that we may show/)).toBeInTheDocument()
})

it("asks a partner for agency details and an optional photo or logo, not study details", async () => {
  usePortalAuthStore.setState({ kind: "agent" })
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: null })))

  renderWithProviders(<TestimonialPage kind="agent" />)

  expect(await screen.findByLabelText("Students sent to CAS")).toBeInTheDocument()
  expect(screen.getByLabelText("Partner since (year)")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Commissions" })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Upload photo" })).toBeInTheDocument()
  expect(screen.getByLabelText(/Agency name/)).toBeInTheDocument()
  expect(screen.queryByLabelText(/University you are enrolled in/)).not.toBeInTheDocument()
})

it("lets a partner set the name it is shown under and add a photo or logo", async () => {
  const user = userEvent.setup()
  usePortalAuthStore.setState({ token: "t", kind: "agent", profile: { id: 3, name: "Bright Future", email: null, status: "active", code: "AGT-1" } })
  let body: Record<string, unknown> = {}
  const fetchMock = mockApi((init) => { body = JSON.parse(init.body as string) })

  renderWithProviders(<TestimonialPage kind="agent" />)

  const name = await screen.findByLabelText(/Agency name/)
  expect(name).toHaveValue("Bright Future")
  expect(screen.getByRole("button", { name: "Upload photo" })).toBeInTheDocument()

  await user.clear(name)
  await user.type(name, "Sara Khan")
  await user.upload(document.getElementById("tm-photo") as HTMLInputElement, new File(["x"], "logo.png", { type: "image/png" }))
  expect(await screen.findByRole("img", { name: "Your photo" })).toBeInTheDocument()
  expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/agent/testimonial/photo"), expect.objectContaining({ method: "POST" }))

  await user.type(screen.getByLabelText(/Your experience/), "CAS is a reliable partner with clear commissions and quick replies.")
  await user.click(screen.getByRole("checkbox"))
  await user.click(screen.getByRole("button", { name: "Send" }))

  await screen.findByText(/Thank you/)
  expect(body).toMatchObject({ display_name: "Sara Khan", photo_path: "/uploads/testimonials/11111111-1111-1111-1111-111111111111.webp" })
})

import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import SiteShareExperience from "./SiteShareExperience"

beforeEach(() => vi.restoreAllMocks())

function renderPage(route = "/site/share-your-experience") {
  return renderWithProviders(
    <Routes>
      <Route path="/site/share-your-experience" element={<SiteShareExperience />} />
      <Route path="/site" element={<div>HOME</div>} />
    </Routes>,
    { route },
  )
}

it("opens to anyone with no sign-in and asks a student for the required details and an email", async () => {
  vi.stubGlobal("fetch", vi.fn())
  renderPage()

  expect(await screen.findByRole("heading", { name: "Share your experience" })).toBeInTheDocument()
  for (const label of [/Your name/, /Nationality/, /University you are enrolled in/, /Degree/, /Major/, /Your experience/, /Your email/]) {
    expect(screen.getByLabelText(label)).toBeInTheDocument()
  }
  expect(screen.getByRole("button", { name: "Upload photo" })).toBeInTheDocument()
  expect(screen.getByRole("tab", { name: "A student", selected: true })).toBeInTheDocument()
})

it("uploads the photo and sends the student's testimonial without any Authorization header", async () => {
  const user = userEvent.setup()
  const fetchMock = vi.fn().mockImplementation((url: string) =>
    Promise.resolve(String(url).endsWith("/photo")
      ? jsonResponse({ path: "/uploads/testimonials/11111111-1111-1111-1111-111111111111.webp", url: "/uploads/testimonials/p.webp" }, 201)
      : jsonResponse({ data: { id: 1, status: "pending" } }, 201)))
  vi.stubGlobal("fetch", fetchMock)
  renderPage()

  await user.upload(document.getElementById("tm-photo") as HTMLInputElement, new File(["x"], "me.jpg", { type: "image/jpeg" }))
  expect(await screen.findByRole("img", { name: "Your photo" })).toBeInTheDocument()
  await user.type(screen.getByLabelText(/Your name/), "Sara Khan")
  await user.selectOptions(screen.getByLabelText(/Nationality/), "PK")
  await user.type(screen.getByLabelText(/University you are enrolled in/), "Jilin University")
  await user.selectOptions(screen.getByLabelText(/Degree/), "bachelor")
  await user.type(screen.getByLabelText(/Major/), "MBBS")
  await user.type(screen.getByLabelText(/Your experience/), "The team guided me at every step of my application.")
  await user.type(screen.getByLabelText(/Your email/), "sara@example.com")
  await user.click(screen.getByRole("checkbox"))
  await user.click(screen.getByRole("button", { name: "Send" }))

  expect(await screen.findByText("Thank you!")).toBeInTheDocument()
  const post = fetchMock.mock.calls.find(([u]) => String(u) === "/api/v1/public/testimonials")!
  expect(post[1].headers).not.toHaveProperty("Authorization")
  expect(JSON.parse(post[1].body)).toMatchObject({
    audience: "student", contact_email: "sara@example.com", display_name: "Sara Khan", country_code: "PK", university: "Jilin University",
    degree: "bachelor", program: "MBBS", photo_path: "/uploads/testimonials/11111111-1111-1111-1111-111111111111.webp", consent_public: true, website: "",
  })
}, 20000)

it("opens on the partner form with ?as=agent: agency name, no study fields", async () => {
  vi.stubGlobal("fetch", vi.fn())
  renderPage("/site/share-your-experience?as=agent")

  expect(await screen.findByRole("tab", { name: "A partner agency", selected: true })).toBeInTheDocument()
  expect(screen.getByLabelText(/Agency name/)).toBeInTheDocument()
  expect(screen.getByLabelText("Students sent to CAS")).toBeInTheDocument()
  expect(screen.getByLabelText(/Your email/)).toBeInTheDocument()
  expect(screen.queryByLabelText(/University you are enrolled in/)).not.toBeInTheDocument()
})

it("shows the server's message when something is missing or the email was already used", async () => {
  const user = userEvent.setup()
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ message: "x", errors: { contact_email: ["We already have a testimonial from this email address. Thank you!"], photo_path: ["Please add your photo."] } }, 422)))
  renderPage()

  await user.click(await screen.findByRole("button", { name: "Send" }))

  expect(await screen.findByText(/We already have a testimonial/)).toBeInTheDocument()
  expect(screen.getByText("Please add your photo.")).toBeInTheDocument()
})

it("keeps a hidden honeypot field that people never see", async () => {
  vi.stubGlobal("fetch", vi.fn())
  renderPage()

  const trap = await screen.findByLabelText("Website", { selector: "input" })
  expect(trap.closest("[aria-hidden=true]")).not.toBeNull()
  expect(trap).toHaveAttribute("tabindex", "-1")
})

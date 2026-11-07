import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import Testimonials from "./Testimonials"

beforeEach(() => vi.restoreAllMocks())

const item = (over: object = {}) => ({
  id: 1, audience: "student", name: "Sara Khan", headline: null, country: "Pakistan", country_code: "PK", quote: "They answered every question quickly.",
  photo_url: "/uploads/testimonials/a.webp", title: "Smooth from offer to arrival", university: "Jilin University", degree: "bachelor",
  program: "MBBS", intake_year: 2026, services: ["admission", "visa"], recommend: true, partner_since: null, students_referred: null, verified: true, ...over,
})

const two = () => ({
  data: [item(), item({ id: 2, name: "Omar Rashid", country: "Egypt", country_code: "EG", photo_url: null, verified: false, title: null, services: null, degree: "master", program: "Engineering" })],
  summary: { count: 2, recommend_percent: 100 },
})

it("shows students only as photos on a globe, with no search box, summary pill, credit line or card list", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(two())))

  renderWithProviders(<Testimonials audience="student" />)

  expect(await screen.findByRole("heading", { name: "What our students say" })).toBeInTheDocument()
  expect(await screen.findByRole("img", { name: "Globe showing where our students come from" }, { timeout: 5000 })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Zoom in" })).toBeInTheDocument()

  expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
  expect(screen.queryByText(/would recommend CAS/)).not.toBeInTheDocument()
  expect(screen.queryByText(/NASA Visible Earth/)).not.toBeInTheDocument()
  expect(screen.queryByText(/All 2 testimonials/)).not.toBeInTheDocument()
  // No card is on the page until someone opens a marker.
  expect(screen.queryByText("They answered every question quickly.")).not.toBeInTheDocument()
  expect(screen.queryByRole("figure")).not.toBeInTheDocument()
})

it("opens a student's card from their photo on their country, and closes it again", async () => {
  const user = userEvent.setup()
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(two())))

  renderWithProviders(<Testimonials audience="student" />)

  const marker = await screen.findByRole("button", { name: "1 testimonial from Pakistan" }, { timeout: 5000 })
  await user.click(marker)

  const dialog = await screen.findByRole("dialog", { name: "1 testimonial from Pakistan" }, { timeout: 5000 })
  const card = within(dialog).getByRole("figure")
  expect(within(card).getByText("Sara Khan")).toBeInTheDocument()
  expect(within(card).getByText("Bachelor's · MBBS")).toBeInTheDocument()
  expect(within(card).getByText("Jilin University")).toBeInTheDocument()
  expect(within(card).getByText("Pakistan · Intake 2026")).toBeInTheDocument()
  expect(within(card).getByText("They answered every question quickly.")).toBeInTheDocument()
  expect(within(card).getByText("Verified student")).toBeInTheDocument()
  expect(within(dialog).getByText("Pakistan")).toBeInTheDocument()

  await user.click(within(dialog).getByRole("button", { name: "Close" }))
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
})

it("ties each student to their own country: one marker per nationality", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(two())))

  renderWithProviders(<Testimonials audience="student" />)

  expect(await screen.findByRole("button", { name: "1 testimonial from Pakistan" }, { timeout: 5000 })).toBeInTheDocument()
  expect(await screen.findByRole("button", { name: "1 testimonial from Egypt" }, { timeout: 5000 })).toBeInTheDocument()
})

it("keeps partners as a simple grid of cards with no globe", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
    data: [item({ id: 5, audience: "agent", name: "Bright Path", headline: "Partner agency", country_code: null, photo_url: null, university: null, degree: null, program: null })],
    summary: { count: 1, recommend_percent: 100 },
  })))

  renderWithProviders(<Testimonials audience="agent" />)

  expect(await screen.findByRole("heading", { name: "What our partners say" })).toBeInTheDocument()
  expect(screen.getByText("Bright Path", { selector: "figure span" })).toBeInTheDocument()
  expect(screen.queryByRole("img", { name: /Globe/ })).not.toBeInTheDocument()
})

it("renders nothing at all when there are none yet", async () => {
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [], summary: { count: 0, recommend_percent: null } }))
  vi.stubGlobal("fetch", fetchMock)

  const { container } = renderWithProviders(<Testimonials audience="agent" />)
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())

  expect(String(fetchMock.mock.calls[0][0])).toContain("audience=agent")
  expect(container.querySelector("section")).toBeNull()
})

it("has a Share your experience button that leads to the public form (partners to the partner form)", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(two())))
  const { unmount } = renderWithProviders(<Testimonials audience="student" />)

  expect(await screen.findByRole("link", { name: "Share your experience" })).toHaveAttribute("href", "/site/share-your-experience")
  unmount()

  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ data: [item({ id: 9, audience: "agent", country_code: null })], summary: { count: 1, recommend_percent: 100 } })))
  renderWithProviders(<Testimonials audience="agent" />)

  expect(await screen.findByRole("link", { name: "Share your experience" })).toHaveAttribute("href", "/site/share-your-experience?as=agent")
})

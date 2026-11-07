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

it("shows each student's photo, degree, major, university and nationality, with no star rating", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(two())))

  renderWithProviders(<Testimonials audience="student" />)

  expect(await screen.findByRole("heading", { name: "What our students say" })).toBeInTheDocument()
  expect(screen.getByText("100% would recommend CAS")).toBeInTheDocument()
  expect(screen.getByText("from 2 testimonials")).toBeInTheDocument()
  expect(screen.queryByRole("img", { name: /stars/ })).not.toBeInTheDocument()

  const card = (await screen.findByText("Sara Khan", { selector: "figure span" })).closest("figure") as HTMLElement
  expect(within(card).getByRole("img", { name: "Sara Khan" })).toHaveAttribute("src", "/uploads/testimonials/a.webp")
  expect(within(card).getByText("Bachelor's · MBBS")).toBeInTheDocument()
  expect(within(card).getByText("Jilin University")).toBeInTheDocument()
  expect(within(card).getByText("Pakistan · Intake 2026")).toBeInTheDocument()
  expect(within(card).getByText("Verified student")).toBeInTheDocument()

  // No photo: initials. Entered by staff: not marked verified.
  const other = screen.getByText("Omar Rashid", { selector: "figure span" }).closest("figure") as HTMLElement
  expect(within(other).getByText("OR")).toBeInTheDocument()
  expect(within(other).queryByText(/Verified/)).not.toBeInTheDocument()
})

it("puts the students on a globe, with a marker per country that opens their card", async () => {
  const user = userEvent.setup()
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(two())))

  renderWithProviders(<Testimonials audience="student" />)

  expect(await screen.findByRole("img", { name: "Globe showing where our students come from" })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Zoom in" })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Zoom out" })).toBeInTheDocument()

  const marker = await screen.findByRole("button", { name: "1 testimonial from Pakistan" }, { timeout: 5000 })
  await user.click(marker)

  const dialog = await screen.findByRole("dialog", { name: "1 testimonial from Pakistan" }, { timeout: 5000 })
  expect(within(dialog).getByText("Pakistan")).toBeInTheDocument()
  expect(within(dialog).getByText("They answered every question quickly.")).toBeInTheDocument()

  await user.click(within(dialog).getByRole("button", { name: "Close" }))
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
})

it("searches testimonials by country name, flies to the country and filters the list", async () => {
  const user = userEvent.setup()
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(two())))

  renderWithProviders(<Testimonials audience="student" />)

  const box = await screen.findByRole("combobox", { name: "Search testimonials by country" })
  await user.type(box, "egy")
  await user.click(await screen.findByRole("option", { name: /Egypt/ }, { timeout: 5000 }).then((o) => within(o).getByRole("button")))

  expect(screen.getByText("1 from Egypt")).toBeInTheDocument()
  expect(await screen.findByRole("dialog", {}, { timeout: 5000 })).toBeInTheDocument()
  const list = screen.getAllByText("Omar Rashid", { selector: "figure span" })
  expect(list.length).toBeGreaterThan(0)
  expect(screen.queryByText("Sara Khan", { selector: "figure span" })).not.toBeInTheDocument()

  await user.click(screen.getByRole("button", { name: "Clear search" }))
  expect(screen.getByText("All 2 testimonials")).toBeInTheDocument()
}, 20000)

it("says so when nobody from that country has written yet", async () => {
  const user = userEvent.setup()
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(two())))

  renderWithProviders(<Testimonials audience="student" />)

  await user.type(await screen.findByRole("combobox", { name: "Search testimonials by country" }), "zzz")

  expect(screen.getByText("No testimonials from there yet.")).toBeInTheDocument()
})

it("keeps partners as a simple grid with no globe", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
    data: [item({ id: 5, audience: "agent", name: "Bright Path", headline: "Partner agency", country_code: null, photo_url: null, university: null, degree: null, program: null })],
    summary: { count: 1, recommend_percent: 100 },
  })))

  renderWithProviders(<Testimonials audience="agent" />)

  expect(await screen.findByRole("heading", { name: "What our partners say" })).toBeInTheDocument()
  expect(screen.getByText("Bright Path", { selector: "figure span" })).toBeInTheDocument()
  expect(screen.queryByRole("img", { name: /Globe/ })).not.toBeInTheDocument()
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
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

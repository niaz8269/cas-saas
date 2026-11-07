import { screen, within } from "@testing-library/react"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import Testimonials from "./Testimonials"

beforeEach(() => vi.restoreAllMocks())

const item = (over: object = {}) => ({
  id: 1, audience: "student", name: "Sara Khan", headline: null, country: "Pakistani", quote: "They answered every question quickly.",
  photo_url: "/uploads/testimonials/a.webp", title: "Smooth from offer to arrival", university: "Jilin University", degree: "bachelor",
  program: "MBBS", intake_year: 2026, services: ["admission", "visa"], recommend: true, partner_since: null, students_referred: null, verified: true, ...over,
})

it("shows the student's photo, name, degree, major, university and nationality, with no star rating", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
    data: [item(), item({ id: 2, name: "Omar R.", photo_url: null, verified: false, title: null, services: null })],
    summary: { count: 2, recommend_percent: 100 },
  })))

  renderWithProviders(<Testimonials audience="student" />)

  expect(await screen.findByRole("heading", { name: "What our students say" })).toBeInTheDocument()
  expect(screen.getByText("100% would recommend CAS")).toBeInTheDocument()
  expect(screen.getByText("from 2 testimonials")).toBeInTheDocument()
  expect(screen.queryByRole("img", { name: /stars/ })).not.toBeInTheDocument()

  const card = screen.getByText("Sara Khan").closest("figure") as HTMLElement
  expect(within(card).getByRole("img", { name: "Sara Khan" })).toHaveAttribute("src", "/uploads/testimonials/a.webp")
  expect(within(card).getByText("Bachelor's · MBBS")).toBeInTheDocument()
  expect(within(card).getByText("Jilin University")).toBeInTheDocument()
  expect(within(card).getByText("Pakistani · Intake 2026")).toBeInTheDocument()
  expect(within(card).getByText("Smooth from offer to arrival")).toBeInTheDocument()
  expect(within(card).getByText("Verified student")).toBeInTheDocument()
  expect(within(card).getByText("Visa support")).toBeInTheDocument()

  // No photo: initials instead. Staff-entered: not marked verified.
  const other = screen.getByText("Omar R.").closest("figure") as HTMLElement
  expect(within(other).getByText("OR")).toBeInTheDocument()
  expect(within(other).queryByText(/Verified/)).not.toBeInTheDocument()
})

it("renders nothing at all when there are none yet", async () => {
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [], summary: { count: 0, recommend_percent: null } }))
  vi.stubGlobal("fetch", fetchMock)

  const { container } = renderWithProviders(<Testimonials audience="agent" />)
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())

  expect(String(fetchMock.mock.calls[0][0])).toContain("audience=agent")
  expect(container.querySelector("section")).toBeNull()
})

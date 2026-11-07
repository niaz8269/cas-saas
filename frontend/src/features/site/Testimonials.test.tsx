import { screen } from "@testing-library/react"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import Testimonials from "./Testimonials"

beforeEach(() => vi.restoreAllMocks())

it("shows approved testimonials with who said them", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
    data: [{ id: 1, audience: "student", name: "Sara", headline: "MBBS student", country: "Pakistan", quote: "They answered every question quickly." }],
  })))

  renderWithProviders(<Testimonials audience="student" />)

  expect(await screen.findByText("They answered every question quickly.")).toBeInTheDocument()
  expect(screen.getByText("Sara")).toBeInTheDocument()
  expect(screen.getByText("MBBS student · Pakistan")).toBeInTheDocument()
  expect(screen.getByRole("heading", { name: "What our students say" })).toBeInTheDocument()
})

it("renders nothing at all when there are none yet", async () => {
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }))
  vi.stubGlobal("fetch", fetchMock)

  const { container } = renderWithProviders(<Testimonials audience="agent" />)
  await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled())

  expect(String(fetchMock.mock.calls[0][0])).toContain("audience=agent")
  expect(container.querySelector("section")).toBeNull()
})

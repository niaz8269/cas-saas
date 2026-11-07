import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import TestimonialPage from "./TestimonialPage"

beforeEach(() => vi.restoreAllMocks())

it("sends the words with the consent and then shows a thank-you", async () => {
  const user = userEvent.setup()
  let submitted = false
  const fetchMock = vi.fn().mockImplementation((_url: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      submitted = true

      return Promise.resolve(jsonResponse({ data: { id: 1, status: "pending" } }, 201))
    }

    return Promise.resolve(jsonResponse({ data: submitted ? { id: 1, status: "pending", quote: "x".repeat(40) } : null }))
  })
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<TestimonialPage kind="student" />)

  await user.type(await screen.findByLabelText("Your experience"), "The team guided me at every step of my application.")
  await user.click(screen.getByRole("checkbox"))
  await user.click(screen.getByRole("button", { name: "Send" }))

  expect(await screen.findByText(/Our team will review your words soon/)).toBeInTheDocument()
  const post = fetchMock.mock.calls.find(([, init]) => init?.method === "POST")!
  expect(String(post[0])).toBe("/api/v1/student/testimonial")
  expect(JSON.parse(post[1].body)).toMatchObject({ consent_public: true, quote: "The team guided me at every step of my application." })
})

it("shows the server's message when the consent box is left unticked", async () => {
  const user = userEvent.setup()
  vi.stubGlobal("fetch", vi.fn().mockImplementation((_u: string, init?: RequestInit) =>
    Promise.resolve(init?.method === "POST"
      ? jsonResponse({ message: "x", errors: { consent_public: ["Please confirm that we may show your words and name on the website."] } }, 422)
      : jsonResponse({ data: null }))))

  renderWithProviders(<TestimonialPage kind="agent" />)

  await user.type(await screen.findByLabelText("Your experience"), "A reliable partner with clear commissions and fast replies.")
  await user.click(screen.getByRole("button", { name: "Send" }))

  expect(await screen.findByText(/Please confirm that we may show/)).toBeInTheDocument()
})

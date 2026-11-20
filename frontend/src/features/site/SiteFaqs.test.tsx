import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import PageFaqs, { FaqList } from "./SiteFaqs"

it("shows each question with its answer in the page, and opens it from the keyboard", async () => {
  const user = userEvent.setup()
  renderWithProviders(<FaqList faqs={[{ q: "Where is Test University?", a: "Test University is in Dalian, Liaoning, China." }, { q: "How do I apply?", a: "Apply online through CAS." }]} />)

  expect(screen.getByRole("heading", { level: 2, name: "Frequently asked questions" })).toBeInTheDocument()
  // The answer is in the document even while the row is closed, so crawlers and screen readers get it.
  expect(screen.getByText("Test University is in Dalian, Liaoning, China.")).toBeInTheDocument()

  const row = screen.getByText("Where is Test University?").closest("details") as HTMLDetailsElement
  expect(row.open).toBe(false)
  await user.click(screen.getByText("Where is Test University?"))
  expect(row.open).toBe(true)
})

it("renders nothing when a page has no questions", () => {
  const { container } = renderWithProviders(<FaqList faqs={[]} />)
  expect(container).toBeEmptyDOMElement()
})

it("loads the questions of a fixed page from the public API", async () => {
  const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ data: [{ q: "What is the CSC scholarship?", a: "A Chinese Government Scholarship." }] })))
  vi.stubGlobal("fetch", fetchMock)
  renderWithProviders(<PageFaqs path="site/csc-scholarship" />)

  expect(await screen.findByText("What is the CSC scholarship?")).toBeInTheDocument()
  expect(String(fetchMock.mock.calls[0][0])).toContain("/public/page-faqs?path=site%2Fcsc-scholarship")
})

import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import StudentDocuments from "./StudentDocuments"

const DOCS = {
  data: [
    { id: 1, type: { id: 3, name: "Passport", category: "identity", is_sensitive: true }, file_name: "passport.pdf", mime: "application/pdf", size: 100000, status: "verified", version: 1, created_at: null },
  ],
}
const TYPES = { data: [{ id: 3, name: "Passport", category: "identity", is_sensitive: true, required_for: null }] }

beforeEach(() => vi.restoreAllMocks())

it("lists the student's documents", async () => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation((input: RequestInfo | URL) =>
    Promise.resolve(jsonResponse(String(input).includes("document-types") ? TYPES : DOCS)),
  ))

  renderWithProviders(<StudentDocuments studentId="5" canUpload={false} />)

  expect(await screen.findByText("Passport")).toBeInTheDocument()
  expect(screen.getByText("passport.pdf")).toBeInTheDocument()
  expect(screen.getByText("verified")).toBeInTheDocument()
  // View-only: no upload control.
  expect(screen.queryByRole("button", { name: /Upload document/ })).not.toBeInTheDocument()
})

it("downloads a document via the brokered url", async () => {
  const user = userEvent.setup()
  const openSpy = vi.fn()
  vi.stubGlobal("open", openSpy)
  vi.stubGlobal("fetch", vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes("/download")) return Promise.resolve(jsonResponse({ url: "http://minio/passport.pdf", expires_at: "" }))
    if (url.includes("document-types")) return Promise.resolve(jsonResponse(TYPES))

    return Promise.resolve(jsonResponse(DOCS))
  }))

  renderWithProviders(<StudentDocuments studentId="5" canUpload />)

  await user.click(await screen.findByRole("button", { name: "Download passport.pdf" }))

  await waitFor(() => expect(openSpy).toHaveBeenCalledWith("http://minio/passport.pdf", "_blank", "noopener"))
})

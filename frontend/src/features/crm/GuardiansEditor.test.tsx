import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { jsonResponse, renderWithProviders } from "@/test/utils"
import type { Guardian } from "@/features/crm/api"

import GuardiansEditor from "./GuardiansEditor"

const GUARDIANS: Guardian[] = [
  { id: 1, name: "Jane Doe", relation: "Mother", phone: "+92 300 111", email: null },
]

beforeEach(() => {
  vi.restoreAllMocks()
})

it("lists guardians and hides editing from view-only users", () => {
  renderWithProviders(<GuardiansEditor studentId="5" guardians={GUARDIANS} canEdit={false} />)

  expect(screen.getByText("Jane Doe")).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /Add/ })).not.toBeInTheDocument()
})

it("adds a guardian", async () => {
  const user = userEvent.setup()
  const fetchMock = vi.fn().mockResolvedValue(
    jsonResponse({ data: { id: 2, name: "John Doe", relation: "Father", phone: null, email: null } }, 201),
  )
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<GuardiansEditor studentId="5" guardians={[]} canEdit />)

  await user.click(screen.getByRole("button", { name: /Add/ }))
  await user.type(screen.getByPlaceholderText("Full name"), "John Doe")
  await user.click(screen.getByRole("button", { name: "Save" }))

  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
    "/api/v1/students/5/guardians",
    expect.objectContaining({ method: "POST" }),
  ))
  const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
  expect(body).toMatchObject({ name: "John Doe" })
})

it("removes a guardian", async () => {
  const user = userEvent.setup()
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: "Guardian removed." }))
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<GuardiansEditor studentId="5" guardians={GUARDIANS} canEdit />)

  await user.click(screen.getByRole("button", { name: "Remove Jane Doe" }))

  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
    "/api/v1/students/5/guardians/1",
    expect.objectContaining({ method: "DELETE" }),
  ))
})

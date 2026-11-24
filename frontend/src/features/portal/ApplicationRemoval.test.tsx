import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import ApplicationRemoval from "./ApplicationRemoval"

function stub() {
  const calls: { url: string; method: string; body: unknown }[] = []
  vi.stubGlobal("fetch", vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), method: init?.method ?? "GET", body: init?.body })

    return Promise.resolve(jsonResponse({ message: "ok", data: { id: 1, application_code: "APP-1", status: "withdrawn" } }))
  }))

  return calls
}

it("asks before deleting a draft, then deletes it", async () => {
  const user = userEvent.setup()
  const calls = stub()
  renderWithProviders(<ApplicationRemoval kind="student" applicationId={5} status="draft" />)

  await user.click(screen.getByRole("button", { name: "Delete draft" }))
  expect(calls).toHaveLength(0)
  expect(screen.getByRole("alertdialog")).toHaveTextContent("Delete this draft?")

  await user.click(screen.getByRole("button", { name: "Yes, delete" }))

  await waitFor(() => expect(calls.some((c) => c.method === "DELETE" && c.url.endsWith("/student/applications/5"))).toBe(true))
})

it("lets you change your mind", async () => {
  const user = userEvent.setup()
  const calls = stub()
  renderWithProviders(<ApplicationRemoval kind="agent" applicationId={5} status="draft" />)

  await user.click(screen.getByRole("button", { name: "Delete draft" }))
  await user.click(screen.getByRole("button", { name: "Keep it" }))

  expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  expect(calls).toHaveLength(0)
})

it("withdraws an application that is with CAS, with an optional reason", async () => {
  const user = userEvent.setup()
  const calls = stub()
  renderWithProviders(<ApplicationRemoval kind="agent" applicationId={9} status="documents_pending" />)

  await user.click(screen.getByRole("button", { name: "Withdraw application" }))
  await user.type(screen.getByLabelText("Reason (optional)"), "Chose another university")
  await user.click(screen.getByRole("button", { name: "Yes, withdraw" }))

  await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.url.endsWith("/agent/applications/9/withdraw"))).toBe(true))
  expect(JSON.parse(String(calls.find((c) => c.url.endsWith("/withdraw"))!.body))).toEqual({ reason: "Chose another university" })
})

it("offers nothing once the application is accepted, rejected or withdrawn", () => {
  stub()
  for (const status of ["accepted", "rejected", "withdrawn"]) {
    const { container, unmount } = renderWithProviders(<ApplicationRemoval kind="student" applicationId={1} status={status} />)
    expect(container).toBeEmptyDOMElement()
    unmount()
  }
})

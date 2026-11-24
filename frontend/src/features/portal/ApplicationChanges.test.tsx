import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import ApplicationChanges from "./ApplicationChanges"

function stub() {
  const calls: { url: string; method: string; body: unknown }[] = []
  vi.stubGlobal("fetch", vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), method: init?.method ?? "GET", body: init?.body })

    return Promise.resolve(jsonResponse({ message: "ok" }, 201))
  }))

  return calls
}

it("links a partner to the student's details, and a student to their own", () => {
  stub()
  const { unmount } = renderWithProviders(<ApplicationChanges kind="agent" applicationId={4} status="under_review" studentId={7} />)
  expect(screen.getByRole("link", { name: "Edit student details" })).toHaveAttribute("href", "/portal/agent/students/7/details")
  unmount()

  renderWithProviders(<ApplicationChanges kind="student" applicationId={4} status="documents_pending" />)
  expect(screen.getByRole("link", { name: "Edit student details" })).toHaveAttribute("href", "/portal/student/details")
})

it("asks CAS to change the program or funding, with the message", async () => {
  const user = userEvent.setup()
  const calls = stub()
  renderWithProviders(<ApplicationChanges kind="student" applicationId={4} status="under_review" />)

  await user.click(screen.getByRole("button", { name: "Ask CAS to change the program or funding" }))
  const send = screen.getByRole("button", { name: "Send to CAS" })
  expect(send).toBeDisabled()

  await user.type(screen.getByLabelText("What should change"), "Please move me to the Master program")
  await user.click(send)

  await waitFor(() => expect(calls.some((c) => c.method === "POST" && c.url.endsWith("/student/applications/4/change-request"))).toBe(true))
  expect(JSON.parse(String(calls.find((c) => c.url.endsWith("/change-request"))!.body))).toEqual({ message: "Please move me to the Master program" })
  expect(await screen.findByRole("status")).toHaveTextContent("Sent to CAS")
})

it("offers a draft only the details, and an accepted or closed application nothing", () => {
  stub()
  const { unmount } = renderWithProviders(<ApplicationChanges kind="student" applicationId={1} status="draft" />)
  expect(screen.getByRole("link", { name: "Edit student details" })).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /Ask CAS/ })).not.toBeInTheDocument()
  unmount()

  for (const status of ["accepted", "rejected", "withdrawn"]) {
    const { container, unmount: done } = renderWithProviders(<ApplicationChanges kind="student" applicationId={1} status={status} />)
    expect(container).toBeEmptyDOMElement()
    done()
  }
})

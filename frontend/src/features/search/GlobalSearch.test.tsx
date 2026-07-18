import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import GlobalSearch from "./GlobalSearch"

function renderSearch() {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<GlobalSearch />} />
      <Route path="/students/:id" element={<div>STUDENT PAGE</div>} />
    </Routes>,
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

it("groups results and navigates to a picked entity", async () => {
  const user = userEvent.setup()
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      jsonResponse({
        data: [
          { type: "student", id: 5, label: "Ali Khan", sublabel: "STU-2026-00005" },
          { type: "lead", id: 11, label: "Grace Otieno", sublabel: "grace@example.com" },
        ],
      }),
    ),
  )

  renderSearch()

  await user.type(screen.getByLabelText("Global search"), "Ali")

  // Grouped headers plus the matching rows.
  expect(await screen.findByText("Students")).toBeInTheDocument()
  expect(screen.getByText("Leads")).toBeInTheDocument()

  await user.click(await screen.findByRole("option", { name: /Ali Khan/ }))

  expect(await screen.findByText("STUDENT PAGE")).toBeInTheDocument()
})

it("navigates with arrow keys and Enter, including universities", async () => {
  const user = userEvent.setup()
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      jsonResponse({
        data: [
          { type: "student", id: 5, label: "Ali Khan", sublabel: "STU-2026-00005" },
          { type: "university", id: 1, label: "Jilin Medical University", sublabel: "JLMU · Jilin" },
        ],
      }),
    ),
  )

  renderWithProviders(
    <Routes>
      <Route path="/" element={<GlobalSearch />} />
      <Route path="/students/:id" element={<div>STUDENT PAGE</div>} />
      <Route path="/universities/:id" element={<div>UNIVERSITY PAGE</div>} />
    </Routes>,
  )

  await user.type(screen.getByLabelText("Global search"), "Ji")
  expect(await screen.findByText("Universities")).toBeInTheDocument()

  // First row is the student; arrow down to the university, then select it.
  await user.keyboard("{ArrowDown}{Enter}")

  expect(await screen.findByText("UNIVERSITY PAGE")).toBeInTheDocument()
})

it("does not query for a single character", async () => {
  const user = userEvent.setup()
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: [] }))
  vi.stubGlobal("fetch", fetchMock)

  renderSearch()

  await user.type(screen.getByLabelText("Global search"), "A")
  // Give the debounce time to (not) fire.
  await new Promise((r) => setTimeout(r, 350))

  expect(fetchMock).not.toHaveBeenCalled()
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
})

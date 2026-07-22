import { fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { useAuthStore } from "@/stores/auth"
import { jsonResponse, renderWithProviders } from "@/test/utils"
import type { AuthUser } from "@/types/auth"

import LeadPipelineBoard from "./LeadPipelineBoard"

function makeUser(permissions: string[]): AuthUser {
  return {
    id: 7, name: "Demo", email: "d@cas.moe", phone: null, status: "active",
    roles: ["Counselor"], permissions, last_login_at: null,
  }
}

const NEW_LEAD = {
  id: 1, first_name: "Ali", last_name: "M", full_name: "Ali M", email: "ali@x.com", phone: null,
  status: "new", intake_route: "info", form_type: "enquiry", form_fields: {}, message: null,
  assignee: null, student_id: null, duplicate_of: null, review: false, created_at: "2026-07-20T00:00:00Z",
}

const pageOf = (leads: unknown[]) => ({
  data: leads,
  meta: { current_page: 1, last_page: 1, per_page: 50, total: leads.length, from: leads.length ? 1 : null, to: leads.length || null },
})

const dataTransfer = { effectAllowed: "", setData: () => {}, getData: () => "" }

beforeEach(() => {
  vi.restoreAllMocks()
  useAuthStore.setState({ token: "t", user: makeUser(["leads.view.assigned", "leads.update.assigned", "leads.convert.assigned"]) })
})

/** Column GETs return the "new" lead in the New column, others empty. */
function stubBoard(onWrite?: (url: string, init: RequestInit) => Response) {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = decodeURIComponent(String(input))
      if (init?.method === "PATCH" || init?.method === "POST") {
        return Promise.resolve(onWrite ? onWrite(url, init) : jsonResponse({ data: { ...NEW_LEAD } }))
      }
      if (url.includes("filter[status]=new")) return Promise.resolve(jsonResponse(pageOf([NEW_LEAD])))
      return Promise.resolve(jsonResponse(pageOf([])))
    }),
  )
}

it("renders pipeline columns and the seeded card", async () => {
  stubBoard()
  renderWithProviders(<LeadPipelineBoard />)

  expect(await screen.findByText("Ali M")).toBeInTheDocument()
  for (const label of ["New", "Assigned", "Contacted", "Qualified", "Converted"]) {
    expect(screen.getByText(label)).toBeInTheDocument()
  }
})

it("PATCHes the lead's status when dragged to another column", async () => {
  let patched: { url: string; body: Record<string, unknown> } | null = null
  stubBoard((url, init) => {
    patched = { url, body: JSON.parse(String(init.body)) }

    return jsonResponse({ data: { ...NEW_LEAD, status: "contacted" } })
  })

  renderWithProviders(<LeadPipelineBoard />)

  const card = (await screen.findByText("Ali M")).closest("[draggable]") as HTMLElement
  const contacted = document.querySelector('[data-status="contacted"]') as HTMLElement

  fireEvent.dragStart(card, { dataTransfer })
  fireEvent.dragOver(contacted, { dataTransfer })
  fireEvent.drop(contacted, { dataTransfer })

  await waitFor(() => expect(patched).not.toBeNull())
  expect(patched!.url).toContain("/leads/1")
  expect(patched!.body).toEqual({ status: "contacted" })
})

it("asks to confirm before converting when dragged to the Converted column", async () => {
  const user = userEvent.setup()
  let converted = false
  stubBoard((url, init) => {
    if (init.method === "POST" && url.includes("/convert")) {
      converted = true

      return jsonResponse({ data: { id: 99, student_code: "STU-2026-00099" } }, 201)
    }

    return jsonResponse({ data: { ...NEW_LEAD } })
  })

  renderWithProviders(<LeadPipelineBoard />)

  const card = (await screen.findByText("Ali M")).closest("[draggable]") as HTMLElement
  const convertedCol = document.querySelector('[data-status="converted"]') as HTMLElement

  fireEvent.dragStart(card, { dataTransfer })
  fireEvent.drop(convertedCol, { dataTransfer })

  // A confirm dialog appears — nothing converted yet until confirmed.
  await screen.findByRole("heading", { name: "Convert to student" })
  expect(converted).toBe(false)

  await user.click(screen.getByRole("button", { name: "Convert" }))
  await waitFor(() => expect(converted).toBe(true))
})

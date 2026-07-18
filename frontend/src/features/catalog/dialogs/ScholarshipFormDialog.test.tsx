import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { jsonResponse, renderWithProviders } from "@/test/utils"
import type { Scholarship } from "@/features/catalog/api"

import ScholarshipFormDialog from "./ScholarshipFormDialog"

const SCH: Scholarship = {
  id: 5, university_id: 1, scope: "university", name: "Belt & Road Scholarship", slug: "belt-road-scholarship",
  type: "full", coverage: "Full tuition", amount: "30000.00",
  tuition_after: null, hostel_after: null, stipend_monthly: null, currency: "CNY",
  description: "Flagship award.", eligibility: "First-year internationals.",
  how_to_apply: "Via your counselor.", apply_link: "https://apply.example.cn", deadline: "2026-06-30",
  benefits: null, university_ids: [], status: "active",
}

beforeEach(() => vi.restoreAllMocks())

it("creates a scholarship with the new content fields", async () => {
  const user = userEvent.setup()
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: { ...SCH, id: 9 } }, 201))
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<ScholarshipFormDialog universityId={1} open onOpenChange={() => {}} />)

  await user.type(screen.getByLabelText("Name"), "Merit Award")
  await user.type(screen.getByLabelText("Amount"), "5000")
  await user.type(screen.getByLabelText("Tuition after"), "2000")
  await user.type(screen.getByLabelText("Stipend / month"), "800")
  await user.type(screen.getByLabelText("Eligibility"), "Top 10% of applicants")
  await user.click(screen.getByRole("button", { name: "Add scholarship" }))

  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/scholarships", expect.objectContaining({ method: "POST" })))
  const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
  expect(body).toMatchObject({ university_id: 1, name: "Merit Award", amount: 5000, tuition_after: 2000, stipend_monthly: 800, eligibility: "Top 10% of applicants" })
})

it("creates a government scholarship with universities and per-level benefits", async () => {
  const user = userEvent.setup()
  const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
    if (String(input).includes("/universities")) {
      return Promise.resolve(jsonResponse({
        data: [{ id: 3, name: "Jilin Medical University", code: "JLMU", slug: null, city: null, address: null, website: null, apply_link: null, logo_path: null }],
        meta: { current_page: 1, last_page: 1, per_page: 100, total: 1, from: 1, to: 1 },
      }))
    }
    return Promise.resolve(jsonResponse({ data: { id: 9 } }, 201))
  })
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<ScholarshipFormDialog scope="government" open onOpenChange={() => {}} />)

  await user.type(screen.getByLabelText("Name"), "CSC")
  await user.click(await screen.findByLabelText("Jilin Medical University"))
  await user.type(screen.getByLabelText("Bachelor stipend"), "2500")
  await user.click(screen.getByRole("button", { name: "Add scholarship" }))

  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/scholarships", expect.objectContaining({ method: "POST" })))
  const body = JSON.parse((fetchMock.mock.calls.find(([u, i]) => u === "/api/v1/scholarships" && (i as RequestInit)?.method === "POST")![1] as RequestInit).body as string)
  expect(body.scope).toBe("government")
  expect(body.university_id).toBeNull()
  expect(body.university_ids).toEqual([3])
  expect(body.benefits).toMatchObject({ bachelor: { stipend_monthly: 2500 } })
})

it("edits an existing scholarship (PATCH, pre-filled)", async () => {
  const user = userEvent.setup()
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ data: SCH }))
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<ScholarshipFormDialog universityId={1} scholarship={SCH} open onOpenChange={() => {}} />)

  expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe("Belt & Road Scholarship")
  expect(screen.getByDisplayValue("Flagship award.")).toBeInTheDocument()

  await user.click(screen.getByRole("button", { name: "Save changes" }))

  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/scholarships/5", expect.objectContaining({ method: "PATCH" })))
})

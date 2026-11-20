import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import AgentExclusives from "@/features/portal/agent/AgentExclusives"
import { usePortalAuthStore } from "@/stores/portalAuth"
import { useAuthStore } from "@/stores/auth"
import { jsonResponse, renderWithProviders } from "@/test/utils"
import type { AuthUser } from "@/types/auth"

import ExclusivesPage from "./ExclusivesPage"

const staff = (permissions: string[]): AuthUser => ({
  id: 1, name: "Staff", email: "s@cas.moe", phone: null, status: "active",
  roles: ["Counselor"], permissions, last_login_at: null,
})

const MATERIAL = { id: 9, exclusive_offer_id: 1, title: "2027 brochure", description: null, category: "brochure", original_name: "brochure.pdf", mime: "application/pdf", size: 204800, created_at: null }

const OFFER = {
  id: 1, title: "Dalian MBBS exclusive", slug: "dalian-mbbs-exclusive", offer_type: "program", summary: "Only through CAS agencies.",
  university: { id: 2, name: "Dalian Medical University", slug: "dalian-medical", city: "Dalian" }, program: { id: 3, name: "MBBS", level: "bachelor" },
  commission_notes: "Paid after the first-year fee.", fee_structure: [{ label: "Tuition", amount: 30000, currency: "CNY", note: "per year" }], fee_notes: null,
  eligible_nationalities: [], restricted_nationalities: ["Country A"], nationality_notes: null, conditions: "Age 17 to 25.",
  published_at: null, updated_at: null, materials: [MATERIAL], materials_count: 1,
  status: "published", sort_order: 0, university_id: 2, program_id: 3,
  audience: "partners", commission_rates: { partner: { value: 3000 }, sub: { value: 2000 } },
}

beforeEach(() => vi.restoreAllMocks())

it("lets a counselor read an exclusive, with every agency level's commission, but not change it", async () => {
  useAuthStore.setState({ token: "t", user: staff(["exclusives.view.global"]) })
  vi.stubGlobal("fetch", vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes("/exclusives/1")) return Promise.resolve(jsonResponse({ data: OFFER }))
    if (url.includes("/exclusives/library")) return Promise.resolve(jsonResponse({ data: [] }))

    return Promise.resolve(jsonResponse({ data: [OFFER, { ...OFFER, id: 2, title: "CAS-only package", audience: "private" }], meta: { current_page: 1, last_page: 1, per_page: 20, total: 2, from: 1, to: 2 } }))
  }))
  const user = userEvent.setup()

  renderWithProviders(<ExclusivesPage />)

  expect(await screen.findByText("Dalian MBBS exclusive")).toBeInTheDocument()
  expect(screen.getByText("CAS-only package")).toBeInTheDocument()
  expect(screen.getAllByText("Private")).toHaveLength(2)
  expect(screen.queryByRole("button", { name: /New exclusive/ })).not.toBeInTheDocument()
  expect(screen.getAllByText("3,000 RMB")).toHaveLength(2) // one on each card
  // The filter button and the card badge both say Partners.
  expect(screen.getAllByText("Partners")).toHaveLength(2)
  expect(screen.getAllByText("Dalian Medical University · Dalian")).toHaveLength(2)

  await user.click(screen.getByRole("button", { name: "Dalian MBBS exclusive" }))
  const dialog = await screen.findByRole("dialog")
  expect(await within(dialog).findByText("Partner agency")).toBeInTheDocument()
  expect(within(dialog).getByText("Sub-agency")).toBeInTheDocument()
  expect(within(dialog).getByText("Age 17 to 25.")).toBeInTheDocument()
  expect(within(dialog).getByText(/Not accepted:/)).toBeInTheDocument()
  expect(within(dialog).queryByRole("button", { name: "Edit" })).not.toBeInTheDocument()
})

it("opens the editor from the detail view of the same exclusive, with its files", async () => {
  useAuthStore.setState({ token: "t", user: staff(["exclusives.view.global", "exclusives.manage.global"]) })
  vi.stubGlobal("fetch", vi.fn().mockImplementation((input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes("/exclusives/1")) return Promise.resolve(jsonResponse({ data: OFFER }))
    if (url.includes("/exclusives/library")) return Promise.resolve(jsonResponse({ data: [] }))
    if (url.includes("/countries")) return Promise.resolve(jsonResponse({ data: [] }))

    return Promise.resolve(jsonResponse({ data: [OFFER], meta: { current_page: 1, last_page: 1, per_page: 20, total: 1, from: 1, to: 1 } }))
  }))
  const user = userEvent.setup()

  renderWithProviders(<ExclusivesPage />)
  await user.click(await screen.findByRole("button", { name: "Dalian MBBS exclusive" }))
  await user.click(await screen.findByRole("button", { name: "Edit" }))

  const editor = await screen.findByRole("dialog", { name: "Edit exclusive" })
  expect(await within(editor).findByText("2027 brochure")).toBeInTheDocument()
  expect(within(editor).getByLabelText("Title")).toHaveValue("Dalian MBBS exclusive")
})

it("gives an admin the New exclusive button", async () => {
  useAuthStore.setState({ token: "t", user: staff(["exclusives.view.global", "exclusives.manage.global"]) })
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(jsonResponse({ data: [], meta: { current_page: 1, last_page: 1, per_page: 20, total: 0, from: null, to: null } }))))

  renderWithProviders(<ExclusivesPage />)

  expect(await screen.findByRole("button", { name: /New exclusive/ })).toBeInTheDocument()
})

it("shows an agency its own commission, the conditions and the files to download", async () => {
  usePortalAuthStore.setState({ token: "t", kind: "agent", profile: { id: 1, name: "Agency", email: null, status: "active", code: "A-1" } })
  const agencyOffer = { ...OFFER, commission: { value: 2000 }, agency_level: "sub", commission_rates: undefined, status: undefined }
  const fetchMock = vi.fn().mockImplementation((input: RequestInfo | URL) => {
    if (String(input).includes("/download")) return Promise.resolve(new Response(new Blob(["pdf"]), { status: 200 }))

    return Promise.resolve(jsonResponse({ data: [agencyOffer], library: [{ ...MATERIAL, id: 10, title: "Logo pack", exclusive_offer_id: null }] }))
  })
  vi.stubGlobal("fetch", fetchMock)
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: () => "blob:x", revokeObjectURL: () => {} }))
  const user = userEvent.setup()

  renderWithProviders(<AgentExclusives />)

  const open = await screen.findByRole("button", { name: "Dalian MBBS exclusive" })
  expect(screen.getByText("Your commission:")).toBeInTheDocument()
  expect(screen.getByText("2,000 RMB")).toBeInTheDocument()
  expect(screen.getByText("Logo pack")).toBeInTheDocument()

  await user.click(open)
  const dialog = await screen.findByRole("dialog")
  expect(within(dialog).getByText("Age 17 to 25.")).toBeInTheDocument()
  expect(within(dialog).queryByText("Partner agency")).not.toBeInTheDocument()

  await user.click(within(dialog).getByRole("button", { name: "Download 2027 brochure" }))
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/agent/exclusive-materials/9/download"), expect.anything()))
})

it("shows the agency card and detail text in the visitor's language", async () => {
  const i18n = (await import("@/i18n")).default
  i18n.addResourceBundle("fr", "translation", { exclusives: { badge: "Exclusif", view: "Voir", files_one: "{{count}} fichier", files_other: "{{count}} fichiers", yourCommission: "Votre commission" } }, true, true)
  await i18n.changeLanguage("fr")
  try {
    const { default: ExclusiveCard } = await import("./ExclusiveCard")
    renderWithProviders(<ExclusiveCard offer={{ ...OFFER, materials_count: 2 } as never} forAgency onOpen={() => {}} />)

    expect(screen.getByText("Exclusif")).toBeInTheDocument()
    expect(screen.getByText("2 fichiers")).toBeInTheDocument()
    expect(screen.getByText("Voir")).toBeInTheDocument()
  } finally {
    await i18n.changeLanguage("en")
  }
})

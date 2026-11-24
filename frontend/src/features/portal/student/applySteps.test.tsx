import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import type { DraftApplication, WizardProgram } from "@/features/portal/api"
import type { ProgramSearch } from "@/features/portal/useProgramSearch"
import { renderWithProviders } from "@/test/utils"

import { CourseStep, CustomFieldsCard, DocumentsStep, ReviewStep } from "./applySteps"

it("renders a radio custom field and reports the chosen option", async () => {
  const user = userEvent.setup()
  const onChange = vi.fn()
  const fields = [
    { key: "preferred_major", label: "Preferred major", type: "radio" as const, required: true, options: ["Medicine", "Engineering"] },
  ]

  renderWithProviders(<CustomFieldsCard fields={fields} answers={{}} onChange={onChange} />)

  await user.click(screen.getByRole("radio", { name: "Medicine" }))

  expect(onChange).toHaveBeenCalledWith("preferred_major", "Medicine")
})

it("reviews the applicant's details, documents and a preview link", () => {
  const program = { name: "MBBS", university: { name: "Xinjiang Medical University", city: "Urumqi" } } as unknown as WizardProgram
  const draft = {
    id: 1,
    application_code: "APP-2026-00019",
    required_documents: [{ id: 5, name: "Passport" }, { id: 6, name: "School Leaving Certificate" }],
  } as unknown as DraftApplication

  renderWithProviders(
    <ReviewStep
      program={program}
      draft={draft}
      agreed={false}
      onAgreed={() => {}}
      profile={{ passport_no: "AB1234567", city: "Lahore" }}
      guardians={[{ relation: "father", name: "Ali Khan" }]}
      education={[{ degree_name: "FSc Pre-Medical", institution: "Govt College", end_year: 2024 }]}
      uploaded={{ 5: "passport.jpg" }}
      previews={{ 5: "blob:preview-url" }}
    />,
  )

  // Personal details + background
  expect(screen.getByText("AB1234567")).toBeInTheDocument()
  expect(screen.getByText("Ali Khan")).toBeInTheDocument()
  expect(screen.getByText(/FSc Pre-Medical/)).toBeInTheDocument()

  // Documents: uploaded one has a preview link; the missing one is flagged
  expect(screen.getByText(/passport\.jpg/)).toBeInTheDocument()
  expect(screen.getByRole("link", { name: "View" })).toHaveAttribute("href", "blob:preview-url")
  expect(screen.getByText("Not uploaded")).toBeInTheDocument()
})

function prog(id: number, name: string, uni: string, city: string, lang: string): WizardProgram {
  return {
    id, name, level: "master", teaching_language: lang, duration_months: 24, tuition_fee: 3000, hostel_fee: null, currency: "CNY", service_charge: null,
    university: { id, name: uni, slug: null, city, country: "China", moe_listed: true }, intakes: [], scholarships: [],
  }
}

const PROGRAMS = [
  prog(1, "Civil Engineering", "Harbin Institute of Technology", "Harbin", "English"),
  prog(2, "Clinical Medicine", "Harbin Medical University", "Harbin", "English"),
  prog(3, "Chinese Language", "Beijing Normal University", "Beijing", "Chinese"),
]

// The search itself runs on the server; these tests check what the step shows and asks for.
function makeSearch(over: Partial<ProgramSearch> = {}): ProgramSearch {
  return {
    programs: PROGRAMS, total: 3, loading: false, loadingMore: false, failed: false, hasMore: false, suggestion: null,
    facets: {
      universities: [{ id: 1, name: "Harbin Institute of Technology" }, { id: 2, name: "Harbin Medical University" }, { id: 3, name: "Beijing Normal University" }],
      cities: ["Beijing", "Harbin"],
    },
    search: "", university: "", city: "", filtering: false,
    loadMore: vi.fn(), retry: vi.fn(), clear: vi.fn(),
    setSearch: vi.fn(), setUniversity: vi.fn(), setCity: vi.fn(),
    ...over,
  }
}

function renderCourse(search: ProgramSearch) {
  return renderWithProviders(
    <CourseStep
      degree="master" funding="self" program={null} intakeId="" scholarshipId="" programSearch={search}
      fundingAvailable={{ self: true, scholarship: false, partial: false }} fundingLoading={false} customAnswers={{}}
      onDegree={() => {}} onFunding={() => {}} onProgram={() => {}} onIntake={() => {}} onScholarship={() => {}} onCustomAnswer={() => {}}
    />,
  )
}

it("offers every university and city, and shows how many programs match", () => {
  renderCourse(makeSearch({ total: 20490 }))

  expect(screen.getByText("Showing 3 of 20490 programs")).toBeInTheDocument()
  expect(screen.getByRole("option", { name: "Beijing Normal University" })).toBeInTheDocument()
  expect(screen.getByRole("option", { name: "Beijing" })).toBeInTheDocument()
  // The medium of teaching is not mentioned, filtered or shown anywhere in the program list.
  expect(screen.queryByLabelText("Teaching language")).not.toBeInTheDocument()
  expect(screen.queryByRole("option", { name: "English" })).not.toBeInTheDocument()
  expect(screen.queryByText("English")).not.toBeInTheDocument()
})

it("hands what is typed and chosen to the search", async () => {
  const user = userEvent.setup()
  const search = makeSearch()
  renderCourse(search)

  await user.type(screen.getByRole("searchbox"), "s")
  expect(search.setSearch).toHaveBeenCalledWith("s")

  await user.selectOptions(screen.getByLabelText("City"), "Harbin")
  expect(search.setCity).toHaveBeenCalledWith("Harbin")
  await user.selectOptions(screen.getByLabelText("University"), "2")
  expect(search.setUniversity).toHaveBeenCalledWith("2")
})

it("asks for the next programs, and clears the filters, on request", async () => {
  const user = userEvent.setup()
  const search = makeSearch({ total: 60, hasMore: true, filtering: true, city: "Harbin" })
  renderCourse(search)

  await user.click(screen.getByRole("button", { name: /Show more programs \(57 more\)/ }))
  expect(search.loadMore).toHaveBeenCalled()

  await user.click(screen.getByRole("button", { name: "Clear filters" }))
  expect(search.clear).toHaveBeenCalled()
})

it("says so when a misspelled search was corrected, and when nothing matches", () => {
  const { unmount } = renderCourse(makeSearch({ suggestion: { original: "herbin", query: "harbin" }, search: "herbin", filtering: true }))
  expect(screen.getByText(/Showing results for/)).toBeInTheDocument()
  unmount()

  renderCourse(makeSearch({ programs: [], total: 0, search: "zzz", filtering: true }))
  expect(screen.getByText(/No programs match your search/)).toBeInTheDocument()
})

it("lets you try again when the programs could not be loaded", async () => {
  const user = userEvent.setup()
  const search = makeSearch({ programs: [], total: 0, failed: true })
  renderCourse(search)

  await user.click(screen.getByRole("button", { name: "Try again" }))
  expect(search.retry).toHaveBeenCalled()
})

it("shows what to upload for each document, all listed alike with no required or optional tags", () => {
  renderWithProviders(
    <DocumentsStep
      draft={{
        id: 1, application_code: "APP-1", status: "draft",
        required_documents: [{ id: 1, name: "Study Plan / Personal Statement", category: null, is_sensitive: false, instruction: "Master: 800-1000 words. PhD: 1000-1500 words." }],
        optional_documents: [{ id: 2, name: "Experience Letter", category: null, is_sensitive: false, instruction: "If you have one." }],
      }}
      uploaded={{}} onUploaded={() => {}} onError={() => {}}
    />,
  )

  expect(screen.getByText("Master: 800-1000 words. PhD: 1000-1500 words.")).toBeInTheDocument()
  expect(screen.getByText("Experience Letter")).toBeInTheDocument()
  expect(screen.getByText("If you have one.")).toBeInTheDocument()
  expect(screen.queryByText("Optional")).not.toBeInTheDocument()
  expect(screen.queryByText("Optional, if you have them")).not.toBeInTheDocument()
  expect(screen.queryByText("Required")).not.toBeInTheDocument()
})

// ── Several files per document, and looking at them ─────────────────────────

import { waitFor } from "@testing-library/react"
import { jsonResponse } from "@/test/utils"

const FILES = [
  { id: 11, document_type_id: 1, file_name: "letter-1.pdf", mime: "application/pdf", size: 1000, status: "pending", version: 1, type: null, uploaded_at: null },
  { id: 12, document_type_id: 1, file_name: "photo.jpg", mime: "image/jpeg", size: 1000, status: "pending", version: 2, type: null, uploaded_at: null },
]

function renderDocuments(extra?: (url: string, init?: RequestInit) => Response | undefined) {
  const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    const custom = extra?.(String(url), init)
    if (custom) return Promise.resolve(custom)
    if (String(url).includes("/documents/presign")) return Promise.resolve(jsonResponse({ url: "https://storage.test/put", key: "k", headers: {} }))
    if (String(url) === "https://storage.test/put") return Promise.resolve(new Response(null, { status: 200 }))
    if (String(url).endsWith("/view")) return Promise.resolve(jsonResponse({ url: "https://files.test/doc", expires_at: "x", file_name: "letter-1.pdf", mime: "application/pdf" }))
    if (init?.method === "DELETE") return Promise.resolve(jsonResponse({ message: "Document removed." }))
    if (String(url).endsWith("/documents")) return Promise.resolve(init?.method === "POST" ? jsonResponse({ data: FILES[0] }, 201) : jsonResponse({ data: FILES }))

    return Promise.resolve(jsonResponse({}))
  })
  vi.stubGlobal("fetch", fetchMock)
  const onUploaded = vi.fn()
  const onRemoved = vi.fn()
  renderWithProviders(
    <DocumentsStep
      draft={{ id: 7, application_code: "APP-7", status: "draft", required_documents: [{ id: 1, name: "Recommendation Letters", category: null, is_sensitive: false }] }}
      uploaded={{}} onUploaded={onUploaded} onRemoved={onRemoved} onError={() => {}}
    />,
  )

  return { fetchMock, onUploaded, onRemoved }
}

it("shows every file already uploaded for a document, and the input takes more than one", async () => {
  renderDocuments()

  expect(await screen.findByRole("button", { name: "View letter-1.pdf" })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "View photo.jpg" })).toBeInTheDocument()
  expect(screen.getByLabelText("Upload Recommendation Letters")).toHaveAttribute("multiple")
  expect(screen.getByText("Add more")).toBeInTheDocument()
})

it("uploads each chosen file", async () => {
  const user = userEvent.setup()
  const { fetchMock } = renderDocuments()

  await screen.findByRole("button", { name: "View letter-1.pdf" })
  await user.upload(screen.getByLabelText("Upload Recommendation Letters"), [
    new File(["a"], "a.pdf", { type: "application/pdf" }),
    new File(["b"], "b.jpg", { type: "image/jpeg" }),
  ])

  await waitFor(() => expect(fetchMock.mock.calls.filter(([u]) => String(u).includes("/documents/presign"))).toHaveLength(2))
})

it("opens a file in a popup when it is clicked", async () => {
  const user = userEvent.setup()
  renderDocuments()

  await user.click(await screen.findByRole("button", { name: "View letter-1.pdf" }))

  expect(await screen.findByRole("dialog")).toBeInTheDocument()
  expect(await screen.findByTitle("letter-1.pdf")).toHaveAttribute("src", "https://files.test/doc")
  expect(screen.getByRole("link", { name: "Open in a new tab" })).toHaveAttribute("href", "https://files.test/doc")
})

it("removes one file and only tells the wizard when the last one is gone", async () => {
  const user = userEvent.setup()
  const { fetchMock, onRemoved } = renderDocuments()

  await user.click(await screen.findByRole("button", { name: "Remove letter-1.pdf" }))

  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/documents/11"), expect.objectContaining({ method: "DELETE" })))
  expect(onRemoved).not.toHaveBeenCalled()
})

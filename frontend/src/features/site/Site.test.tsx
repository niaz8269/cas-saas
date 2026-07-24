import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import SiteAbout from "./SiteAbout"
import SiteContact from "./SiteContact"
import ScrollToTop from "./ScrollToTop"
import SiteHome from "./SiteHome"
import SiteCities from "./SiteCities"
import SiteFAQ from "./SiteFAQ"
import SiteHelpDock from "./SiteHelpDock"
import SitePartner from "./SitePartner"
import SitePricing from "./SitePricing"
import SiteLeadPanel from "./SiteLeadPanel"
import SiteMegaMenu from "./SiteMegaMenu"
import SiteStudyPlan from "./SiteStudyPlan"
import SiteNews from "./SiteNews"
import SiteServices from "./SiteServices"
import SiteWhyChina from "./SiteWhyChina"
import SiteProgramFinder from "./SiteProgramFinder"
import SiteScholarships from "./SiteScholarships"
import SiteUniversities from "./SiteUniversities"
import SiteUniversity from "./SiteUniversity"

const LIST = {
  data: [
    { id: 1, name: "Jilin Medical University", slug: "jilin-medical-university", city: "Jilin City", country: "China", moe_listed: true, about: "A leading medical university.", logo_url: null, cover_url: null, apply_link: null, requirements: [], representative_professor: null, programs_count: 2, address: null, website: null, nearest_airport: null },
    { id: 2, name: "Beta Tech", slug: "beta-tech", city: "Beijing", country: "China", moe_listed: false, about: null, logo_url: null, cover_url: null, apply_link: null, requirements: [], representative_professor: null, programs_count: 1, address: null, website: null, nearest_airport: null },
  ],
  meta: { current_page: 1, last_page: 1, total: 2, from: 1, to: 2 },
}

const DETAIL = {
  data: {
    id: 1, name: "Jilin Medical University", slug: "jilin-medical-university", city: "Jilin City", country: "China",
    address: null, website: "www.jlmu.cn", apply_link: "https://apply.jlmu.cn", logo_url: null, cover_url: null,
    moe_listed: true, nearest_airport: "Changchun (CGQ)", about: "A leading medical university.",
    requirements: ["IELTS 6.0"], representative_professor: { name: "Prof. Li Wei", title: "Dean", photo_url: null }, programs_count: 1,
    programs: [{ id: 10, name: "MBBS", level: "bachelor", teaching_language: "English", duration_months: 72, tuition_fee: "32000.00", currency: "CNY", apply_link: null, requirements: null }],
    intakes: [{ id: 5, name: "Sept 2026", start_date: "2026-09-01", application_deadline: "2030-07-15", seats: 100, program: "MBBS" }],
    scholarships: [{ id: 7, name: "Belt & Road Scholarship", slug: "belt-road", type: "full", coverage: "Full tuition", amount: "30000.00", currency: "CNY", description: "Flagship award.", eligibility: null, how_to_apply: null, apply_link: null, deadline: "2026-06-30" }],
  },
}

beforeEach(() => vi.restoreAllMocks())

it("renders the public universities grid", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(LIST)))

  renderWithProviders(<SiteUniversities />)

  expect(await screen.findByText("Jilin Medical University")).toBeInTheDocument()
  expect(screen.getByText("Beta Tech")).toBeInTheDocument()
  expect(screen.getByText("2 programs")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: /MoE-listed only/ })).toBeInTheDocument()
})

it("gates program fees for guests and shows the CAS service fee for members", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
    data: [
      { id: 1, name: "MBBS", level: "bachelor", teaching_language: "English", duration_months: 72, tuition_fee: null, currency: "CNY", apply_link: null, requirements: null, fee_locked: true, university: { name: "JLMU", slug: "jlmu" } },
      { id: 2, name: "BDS", level: "bachelor", teaching_language: "English", duration_months: 60, tuition_fee: "40000.00", currency: "CNY", apply_link: null, requirements: null, fee_locked: false, service_charge: { amount: 500, currency: "USD" }, university: { name: "JLMU", slug: "jlmu" } },
    ],
    meta: { current_page: 1, last_page: 1, total: 2, from: 1, to: 2 },
    audience: "student",
  })))

  renderWithProviders(<SiteProgramFinder />)

  expect(await screen.findByText("MBBS")).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /Sign in to see fees/i })).toBeInTheDocument()
  expect(screen.getByText(/CAS service fee/i)).toBeInTheDocument()
})

it("renders the CUCAS-style home with hero, search and sections", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(LIST)))

  renderWithProviders(<SiteHome />)

  expect(screen.getByRole("heading", { name: "Study in China", level: 1 })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument()
  expect(screen.getByLabelText("Search universities or programs")).toBeInTheDocument()
  expect(screen.getByText("Weekly Programs")).toBeInTheDocument()
  expect(screen.getByText("Highlights")).toBeInTheDocument()
  expect(screen.getByText("Reviews from our students")).toBeInTheDocument()
  // Live data from the public API renders in the university sections.
  expect((await screen.findAllByText("Jilin Medical University")).length).toBeGreaterThan(0)
})

it("finds programs and pre-fills the search from the URL", async () => {
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
    data: [{
      id: 10, name: "MBBS", level: "bachelor", teaching_language: "English", duration_months: 72,
      tuition_fee: "30000.00", currency: "CNY", apply_link: null, requirements: null,
      university: { name: "Jilin Medical", slug: "jilin-medical" },
    }],
    meta: { current_page: 1, last_page: 1, total: 1, from: 1, to: 1 },
  }))
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(
    <Routes><Route path="/site/programs" element={<SiteProgramFinder />} /></Routes>,
    { route: "/site/programs?q=MBBS" },
  )

  expect((screen.getByLabelText("Search programs") as HTMLInputElement).value).toBe("MBBS")
  expect(await screen.findByText("MBBS")).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /Jilin Medical/ })).toHaveAttribute("href", "/site/universities/jilin-medical")
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("q=MBBS"), expect.anything()))
})

it("lists scholarships with their university and coverage", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
    data: [{
      id: 7, name: "Belt & Road Scholarship", slug: "belt-road", type: "full", coverage: "Full tuition",
      amount: "30000.00", currency: "CNY", description: "Flagship award.", eligibility: null, how_to_apply: null,
      apply_link: null, deadline: "2026-06-30", university: { name: "Jilin Medical", slug: "jilin-medical" },
    }],
    meta: { current_page: 1, last_page: 1, total: 1, from: 1, to: 1 },
  })))

  renderWithProviders(<SiteScholarships />)

  expect(await screen.findByText("Belt & Road Scholarship")).toBeInTheDocument()
  expect(screen.getByText("Full tuition")).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /Jilin Medical/ })).toHaveAttribute("href", "/site/universities/jilin-medical")
})

it("renders the about page with the how-we-help steps", () => {
  renderWithProviders(<SiteAbout />)

  expect(screen.getByRole("heading", { name: "About CAS" })).toBeInTheDocument()
  expect(screen.getByText("How we help")).toBeInTheDocument()
  expect(screen.getByText("Choose")).toBeInTheDocument()
})

it("resets scroll to the top on navigation", () => {
  const spy = vi.spyOn(window, "scrollTo").mockImplementation(() => {})

  renderWithProviders(<ScrollToTop />, { route: "/site/programs" })

  expect(spy).toHaveBeenCalledWith(0, 0)
})

it("opens the hamburger mega-menu on hover with deep-linked 5 columns", async () => {
  const user = userEvent.setup()
  renderWithProviders(<SiteMegaMenu />)

  const trigger = screen.getByRole("button", { name: /Browse everything/ })
  expect(trigger).toHaveAttribute("aria-expanded", "false")

  await user.hover(trigger)
  expect(trigger).toHaveAttribute("aria-expanded", "true")

  // All five reference columns are present.
  for (const col of ["Destinations", "Universities", "Programs", "Scholarships", "About"]) {
    expect(screen.getByText(col)).toBeInTheDocument()
  }
  expect(screen.getByRole("link", { name: "Study MBBS in China" })).toHaveAttribute("href", "/site/programs?q=MBBS&src=menu")
  expect(screen.getByRole("link", { name: "MoE-listed universities" })).toHaveAttribute("href", "/site/universities?moe=1&src=menu")
})

it("opens the counsellor widget with CAS's own contact channels", async () => {
  const user = userEvent.setup()
  renderWithProviders(<SiteHelpDock />)

  await user.click(screen.getByRole("button", { name: "Leave Message" }))

  expect(screen.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute("href", "https://wa.me/8618041566030")
  expect(screen.getByRole("link", { name: /Call us/ })).toHaveAttribute("href", "tel:+8618041566030")
  expect(screen.getByRole("link", { name: /Email/ })).toHaveAttribute("href", "mailto:info@cas.moe")
})

it("submits the hero lead panel to the public enquiries endpoint", async () => {
  const user = userEvent.setup()
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: "Thank you" }))
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<SiteLeadPanel />)

  await user.type(screen.getByLabelText("Your name"), "Ali")
  await user.type(screen.getByLabelText("Email"), "ali@example.com")
  await user.click(screen.getByRole("button", { name: /Send message/ }))

  expect(await screen.findByText("Thank you!")).toBeInTheDocument()
  const post = fetchMock.mock.calls.find(([u, i]) => String(u).includes("/public/enquiries") && i?.method === "POST")
  expect(post).toBeTruthy()
  expect(JSON.parse((post![1] as RequestInit).body as string)).toMatchObject({ first_name: "Ali", email: "ali@example.com" })
})

it("completes the study-plan wizard and submits a tagged study_plan enquiry", async () => {
  const user = userEvent.setup()
  const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ message: "Thanks" }))
  vi.stubGlobal("fetch", fetchMock)

  renderWithProviders(<SiteStudyPlan />)

  // Step 1 — pick a level, then continue.
  await user.click(screen.getByRole("button", { name: "Master's" }))
  await user.click(screen.getByRole("button", { name: /Continue/ }))
  // Step 2 — optional, continue.
  await user.click(screen.getByRole("button", { name: /Continue/ }))
  // Step 3 — contact details.
  await user.type(screen.getByLabelText("Full name"), "Sara Ahmed")
  await user.type(screen.getByLabelText("Email"), "sara@example.com")
  await user.click(screen.getByRole("button", { name: /Get my study plan/ }))

  expect(await screen.findByText(/study plan is on its way/i)).toBeInTheDocument()
  const post = fetchMock.mock.calls.find(([u, i]) => String(u).includes("/public/enquiries") && i?.method === "POST")
  const body = JSON.parse((post![1] as RequestInit).body as string)
  expect(body.form_type).toBe("study_plan")
  expect(body.first_name).toBe("Sara")
  expect(body.details).toMatchObject({ Level: "Master's" })
})

it("renders the destinations page from the API city list", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
    data: [{ id: 1, name: "BIT", slug: "bit", city: "Beijing" }],
    meta: { current_page: 1, last_page: 1, total: 1, from: 1, to: 1 },
    cities: ["Beijing", "Shanghai"],
  })))

  renderWithProviders(<SiteCities />)

  expect(await screen.findByRole("heading", { name: "Study in China by city", level: 1 })).toBeInTheDocument()
  expect(await screen.findByRole("link", { name: /Beijing/ })).toHaveAttribute("href", "/site/universities?city=Beijing")
  expect(screen.getByText("1 university")).toBeInTheDocument()
})

it("renders the FAQ with categories and expands an answer", async () => {
  const user = userEvent.setup()
  renderWithProviders(<SiteFAQ />)

  expect(screen.getByRole("heading", { name: "Frequently asked questions", level: 1 })).toBeInTheDocument()
  expect(screen.getByText("Scholarships")).toBeInTheDocument()
  // Answers are collapsed until their question is clicked.
  expect(screen.queryByText(/globally recognised qualifications/)).not.toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: "Why study in China?" }))
  expect(screen.getByText(/globally recognised qualifications/)).toBeInTheDocument()
})

it("renders the pricing and partner pages", () => {
  renderWithProviders(<SitePricing />)
  expect(screen.getByRole("heading", { name: "Simple, transparent pricing", level: 1 })).toBeInTheDocument()
  expect(screen.getByText("Getting started")).toBeInTheDocument()

  renderWithProviders(<SitePartner />)
  expect(screen.getByRole("heading", { name: "Partner with CAS", level: 1 })).toBeInTheDocument()
  expect(screen.getAllByRole("link", { name: /Become a partner/ }).length).toBeGreaterThan(0)
})

it("renders the services, why-china and news pages", () => {
  renderWithProviders(<SiteServices />)
  expect(screen.getByRole("heading", { name: "Our services" })).toBeInTheDocument()
  expect(screen.getByText("Visa assistance")).toBeInTheDocument()

  renderWithProviders(<SiteWhyChina />)
  expect(screen.getByRole("heading", { name: "Why study in China" })).toBeInTheDocument()

  renderWithProviders(<SiteNews />)
  expect(screen.getByRole("heading", { name: "Latest from CAS" })).toBeInTheDocument()
})

it("renders the contact page with details and the enquiry form", () => {
  renderWithProviders(<SiteContact />)

  expect(screen.getByRole("heading", { name: "Get in touch" })).toBeInTheDocument()
  expect(screen.getByText("Offices")).toBeInTheDocument()
  // The shared enquiry form is embedded.
  expect(screen.getByRole("button", { name: /Send enquiry/ })).toBeInTheDocument()
})

it("renders a tabbed university detail with programs, scholarships and deadline", async () => {
  const user = userEvent.setup()
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(DETAIL)))

  renderWithProviders(
    <Routes>
      <Route path="/site/universities/:slug" element={<SiteUniversity />} />
    </Routes>,
    { route: "/site/universities/jilin-medical-university" },
  )

  // Fact header + Overview tab (default).
  expect(await screen.findByRole("heading", { name: "Jilin Medical University" })).toBeInTheDocument()
  expect(screen.getByText("China MoE-listed")).toBeInTheDocument()
  expect(screen.getByText("Prof. Li Wei")).toBeInTheDocument()
  // Future-dated intake shows a live countdown; header "Apply now" is now a
  // login-gated button into CAS's own application form (not an external link).
  expect(screen.getByText(/days left/)).toBeInTheDocument()
  expect(screen.getByRole("button", { name: /Apply now/ })).toBeInTheDocument()

  // Programs tab.
  await user.click(screen.getByRole("button", { name: /Programs/ }))
  expect(screen.getByText("MBBS")).toBeInTheDocument()
  expect(screen.getByText("English")).toBeInTheDocument()

  // Scholarships tab.
  await user.click(screen.getByRole("button", { name: /Scholarships/ }))
  expect(screen.getByText("Belt & Road Scholarship")).toBeInTheDocument()

  // Admission tab.
  await user.click(screen.getByRole("button", { name: /Admission/ }))
  expect(screen.getByText("IELTS 6.0")).toBeInTheDocument()
})

it("gates registered-only detail sections with sign-in prompts (ADR-0015)", async () => {
  const user = userEvent.setup()
  const LOCKED = {
    data: {
      ...DETAIL.data,
      // Backend hides gated sections for guests: empty intakes + null fees/amounts + locked flags.
      intakes: [],
      deadlines_locked: true,
      programs: [{ id: 10, name: "MBBS", level: "bachelor", teaching_language: "English", duration_months: 72, tuition_fee: null, currency: "CNY", apply_link: null, requirements: null, fee_locked: true }],
      scholarships: [{ id: 7, name: "Belt & Road Scholarship", slug: "belt-road", type: "full", coverage: "Full tuition", amount: null, currency: "CNY", description: "Flagship award.", eligibility: null, how_to_apply: null, apply_link: null, deadline: null, details_locked: true }],
    },
  }
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(LOCKED)))

  renderWithProviders(
    <Routes>
      <Route path="/site/universities/:slug" element={<SiteUniversity />} />
    </Routes>,
    { route: "/site/universities/jilin-medical-university" },
  )

  // Hero deadline chip becomes a sign-in prompt when intake deadlines are gated.
  expect(await screen.findByRole("heading", { name: "Jilin Medical University" })).toBeInTheDocument()
  expect(screen.getAllByRole("link", { name: /Sign in to see intake deadlines/i }).length).toBeGreaterThan(0)

  // Programs tab — fee is replaced by a sign-in prompt.
  await user.click(screen.getByRole("button", { name: /Programs/ }))
  expect(screen.getByRole("link", { name: /Sign in to see fees/i })).toBeInTheDocument()

  // Scholarships tab — award specifics are gated.
  await user.click(screen.getByRole("button", { name: /Scholarships/ }))
  expect(screen.getByRole("link", { name: /Sign in to see award details/i })).toBeInTheDocument()

  // Intakes tab is still offered and shows the prompt (not hidden entirely).
  await user.click(screen.getByRole("button", { name: /Intakes/ }))
  expect(screen.getAllByRole("link", { name: /Sign in to see intake deadlines/i }).length).toBeGreaterThan(0)
})

it("gates scholarship award details on the listing when locked", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({
    data: [{
      id: 7, name: "Belt & Road Scholarship", slug: "belt-road", type: "full", coverage: "Full tuition",
      amount: null, currency: "CNY", description: "Flagship award.", eligibility: null, how_to_apply: null,
      apply_link: null, deadline: null, details_locked: true, university: { name: "Jilin Medical", slug: "jilin-medical" },
    }],
    meta: { current_page: 1, last_page: 1, total: 1, from: 1, to: 1 },
  })))

  renderWithProviders(<SiteScholarships />)

  expect(await screen.findByText("Belt & Road Scholarship")).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /Sign in to see award details/i })).toBeInTheDocument()
})

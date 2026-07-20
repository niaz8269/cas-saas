import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import SiteAbout from "./SiteAbout"
import SiteContact from "./SiteContact"
import ScrollToTop from "./ScrollToTop"
import SiteHome from "./SiteHome"
import SiteHelpDock from "./SiteHelpDock"
import SiteMegaMenu from "./SiteMegaMenu"
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

it("renders the CUCAS-style home with hero, tabbed search and sections", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(LIST)))

  renderWithProviders(<SiteHome />)

  expect(screen.getByRole("heading", { name: "Study in China", level: 1 })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Programs" })).toBeInTheDocument()
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
  expect(screen.getByRole("link", { name: "Study MBBS in China" })).toHaveAttribute("href", "/site/programs?q=MBBS")
  expect(screen.getByRole("link", { name: "MoE-listed universities" })).toHaveAttribute("href", "/site/universities?moe=1")
})

it("opens the counsellor widget with CAS's own contact channels", async () => {
  const user = userEvent.setup()
  renderWithProviders(<SiteHelpDock />)

  await user.click(screen.getByRole("button", { name: "Talk to a counsellor" }))

  expect(screen.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute("href", "https://wa.me/8618041566030")
  expect(screen.getByRole("link", { name: /Call us/ })).toHaveAttribute("href", "tel:+8618041566030")
  expect(screen.getByRole("link", { name: /Email/ })).toHaveAttribute("href", "mailto:info@cas.moe")
})

it("renders the services, why-china and news pages", () => {
  renderWithProviders(<SiteServices />)
  expect(screen.getByRole("heading", { name: "Our services" })).toBeInTheDocument()
  expect(screen.getByText("Visa assistance")).toBeInTheDocument()

  renderWithProviders(<SiteWhyChina />)
  expect(screen.getByRole("heading", { name: "Why study in China" })).toBeInTheDocument()

  renderWithProviders(<SiteNews />)
  expect(screen.getByRole("heading", { name: "News & updates" })).toBeInTheDocument()
})

it("renders the contact page with details and the enquiry form", () => {
  renderWithProviders(<SiteContact />)

  expect(screen.getByRole("heading", { name: "Get in touch" })).toBeInTheDocument()
  expect(screen.getByText("Offices")).toBeInTheDocument()
  // The shared enquiry form is embedded.
  expect(screen.getByRole("button", { name: /Send enquiry/ })).toBeInTheDocument()
})

it("renders a university detail with programs, scholarships and deadline", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(DETAIL)))

  renderWithProviders(
    <Routes>
      <Route path="/site/universities/:slug" element={<SiteUniversity />} />
    </Routes>,
    { route: "/site/universities/jilin-medical-university" },
  )

  expect(await screen.findByRole("heading", { name: "Jilin Medical University" })).toBeInTheDocument()
  expect(screen.getByText("China MoE-listed")).toBeInTheDocument()
  expect(screen.getByText("MBBS")).toBeInTheDocument()
  expect(screen.getByText("English")).toBeInTheDocument()
  expect(screen.getByText("Belt & Road Scholarship")).toBeInTheDocument()
  expect(screen.getByText("IELTS 6.0")).toBeInTheDocument()
  expect(screen.getByText("Prof. Li Wei")).toBeInTheDocument()
  // Future-dated intake shows a live countdown.
  expect(screen.getByText(/days left/)).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /Apply now/ })).toHaveAttribute("href", "https://apply.jlmu.cn")
})

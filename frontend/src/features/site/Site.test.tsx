import { screen } from "@testing-library/react"
import { Route, Routes } from "react-router-dom"

import { jsonResponse, renderWithProviders } from "@/test/utils"

import SiteHome from "./SiteHome"
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

  renderWithProviders(<SiteHome />)

  expect(await screen.findByText("Jilin Medical University")).toBeInTheDocument()
  expect(screen.getByText("Beta Tech")).toBeInTheDocument()
  expect(screen.getByText("2 programs")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: /MoE-listed only/ })).toBeInTheDocument()
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

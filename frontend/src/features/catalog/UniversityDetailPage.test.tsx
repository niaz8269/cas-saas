import { screen } from "@testing-library/react"
import { Route, Routes } from "react-router-dom"

import { useAuthStore } from "@/stores/auth"
import { jsonResponse, renderWithProviders } from "@/test/utils"
import type { AuthUser } from "@/types/auth"

import UniversityDetailPage from "./UniversityDetailPage"

function makeUser(permissions: string[]): AuthUser {
  return {
    id: 1,
    name: "Test Staff",
    email: "staff@cas.moe",
    phone: null,
    status: "active",
    roles: [],
    permissions,
    last_login_at: null,
  }
}

const UNIVERSITY = {
  data: {
    id: 1,
    name: "Jilin Medical University",
    code: "JLMU",
    slug: "jilin-medical-university",
    city: "Jilin City",
    address: "No. 5 Jilin Avenue",
    website: "www.jlmu.cn",
    apply_link: "https://apply.jlmu.cn",
    logo_path: null,
    cover_path: null,
    status: "active",
    moe_listed: true,
    nearest_airport: "Changchun Longjia (CGQ)",
    about: "A leading medical university in Jilin.",
    requirements: ["High school diploma", "IELTS 6.0"],
    representative_professor: { name: "Prof. Li Wei", title: "Dean of International Education", photo: null },
    country: { id: 1, name: "China", iso2: "CN" },
    contacts: [{ id: 1, name: "Ms. Zhang Min", email: "admissions@jlmu.cn", phone: null, role: "International Office" }],
  },
}

const emptyList = { data: [], meta: { current_page: 1, last_page: 1, per_page: 100, total: 0, from: null, to: null } }

function stubFetchByUrl() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes("/universities/1")) return Promise.resolve(jsonResponse(UNIVERSITY))
      if (url.includes("/courses")) {
        return Promise.resolve(
          jsonResponse({
            ...emptyList,
            data: [{ id: 10, university_id: 1, name: "MBBS", level: "bachelor", duration_months: 72, tuition_fee: "32000.00", currency: "CNY", status: "active" }],
          }),
        )
      }
      if (url.includes("/agreements")) {
        return Promise.resolve(
          jsonResponse({
            ...emptyList,
            data: [{ id: 20, university_id: 1, course_id: null, course: null, commission_type: "percent", commission_value: "12.00", currency: null, eligibility_trigger: "arrival_first_year_paid", valid_from: "2026-01-01", valid_to: "2027-12-31" }],
          }),
        )
      }
      return Promise.resolve(jsonResponse(emptyList))
    }),
  )
}

function renderDetail() {
  return renderWithProviders(
    <Routes>
      <Route path="/universities/:id" element={<UniversityDetailPage />} />
    </Routes>,
    { route: "/universities/1" },
  )
}

beforeEach(() => {
  vi.restoreAllMocks()
})

it("renders the university header, contacts and courses", async () => {
  useAuthStore.setState({ token: "token", user: makeUser(["universities.view.global"]) })
  stubFetchByUrl()

  renderDetail()

  expect(await screen.findByText("Jilin Medical University")).toBeInTheDocument()
  expect(screen.getByText("Ms. Zhang Min")).toBeInTheDocument()
  expect(await screen.findByText("MBBS")).toBeInTheDocument()
  // Website content fields render.
  expect(screen.getByText("MoE listed")).toBeInTheDocument()
  expect(screen.getByText("IELTS 6.0")).toBeInTheDocument()
  expect(screen.getByText("Prof. Li Wei")).toBeInTheDocument()
  expect(screen.getByRole("link", { name: /Apply/ })).toHaveAttribute("href", "https://apply.jlmu.cn")
})

it("hides the agreements section from plain catalog viewers", async () => {
  useAuthStore.setState({ token: "token", user: makeUser(["universities.view.global"]) })
  stubFetchByUrl()

  renderDetail()

  await screen.findByText("Jilin Medical University")
  expect(screen.queryByText("Commission agreements")).not.toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /Add course/ })).not.toBeInTheDocument()
})

it("shows agreements and add actions to catalog managers", async () => {
  useAuthStore.setState({
    token: "token",
    user: makeUser(["universities.view.global", "universities.manage.global"]),
  })
  stubFetchByUrl()

  renderDetail()

  expect(await screen.findByText("Commission agreements")).toBeInTheDocument()
  expect(await screen.findByText("12%")).toBeInTheDocument()
  expect(screen.getByRole("button", { name: /Add course/ })).toBeInTheDocument()
  expect(screen.getByRole("button", { name: /Add agreement/ })).toBeInTheDocument()
})

it("shows agreements read-only to commission viewers (finance)", async () => {
  useAuthStore.setState({ token: "token", user: makeUser(["commission.view.global"]) })
  stubFetchByUrl()

  renderDetail()

  expect(await screen.findByText("Commission agreements")).toBeInTheDocument()
  expect(screen.queryByRole("button", { name: /Add agreement/ })).not.toBeInTheDocument()
})

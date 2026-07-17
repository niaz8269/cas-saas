import { screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Route, Routes } from "react-router-dom"

import { jsonResponse, renderWithProviders } from "@/test/utils"
import { usePortalAuthStore } from "@/stores/portalAuth"

import PortalLogin from "./PortalLogin"
import RequirePortalAuth from "./RequirePortalAuth"
import AgentCommissions from "./agent/AgentCommissions"
import StudentApplications from "./student/StudentApplications"

beforeEach(() => {
  vi.restoreAllMocks()
  usePortalAuthStore.setState({ token: null, kind: null, profile: null })
})

it("logs a student in through the portal toggle and stores the token", async () => {
  const user = userEvent.setup()
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      jsonResponse({
        token: "portal-token",
        token_type: "Bearer",
        student: { id: 5, student_code: "STU-2026-00005", full_name: "Ali Khan", email: "ali@x.com", status: "arrived" },
      }),
    ),
  )

  renderWithProviders(
    <Routes>
      <Route path="/portal/login" element={<PortalLogin />} />
      <Route path="/portal/student" element={<div>Student home</div>} />
    </Routes>,
    { route: "/portal/login" },
  )

  await user.type(screen.getByLabelText("Email"), "ali@x.com")
  await user.type(screen.getByLabelText("Password"), "secret")
  await user.click(screen.getByRole("button", { name: "Sign in" }))

  await waitFor(() => expect(usePortalAuthStore.getState().token).toBe("portal-token"))
  expect(usePortalAuthStore.getState().kind).toBe("student")
})

it("surfaces an inactive-account 403 on the portal login", async () => {
  const user = userEvent.setup()
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      jsonResponse({ message: "This account is inactive. Contact your counselor.", code: "ACCOUNT_INACTIVE" }, 403),
    ),
  )

  renderWithProviders(
    <Routes>
      <Route path="/portal/login" element={<PortalLogin />} />
    </Routes>,
    { route: "/portal/login" },
  )

  await user.type(screen.getByLabelText("Email"), "gone@x.com")
  await user.type(screen.getByLabelText("Password"), "secret")
  await user.click(screen.getByRole("button", { name: "Sign in" }))

  expect(await screen.findByRole("alert")).toHaveTextContent(/inactive/)
})

it("redirects an agent token away from the student area", async () => {
  usePortalAuthStore.setState({
    token: "t", kind: "agent",
    profile: { id: 1, name: "Partner", email: null, status: "active", code: "GSP-0001" },
  })

  renderWithProviders(
    <Routes>
      <Route element={<RequirePortalAuth />}>
        <Route path="/portal/student/applications" element={<div>Student apps</div>} />
        <Route path="/portal/agent" element={<div>Agent home</div>} />
      </Route>
    </Routes>,
    { route: "/portal/student/applications" },
  )

  expect(await screen.findByText("Agent home")).toBeInTheDocument()
})

it("renders the agent earnings totals from the API", async () => {
  usePortalAuthStore.setState({
    token: "t", kind: "agent",
    profile: { id: 1, name: "Partner", email: null, status: "active", code: "GSP-0001" },
  })
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      jsonResponse({
        data: [{ id: 1, amount: "1020.00", currency: "CNY", status: "payable", computed_at: null,
          student: { student_code: "STU-2026-00005", full_name: "Ali Khan" }, university: "JLMU" }],
        meta: { current_page: 1, last_page: 1, per_page: 25, total: 1, from: 1, to: 1 },
        totals: { payable: 1020, paid: 500 },
      }),
    ),
  )

  renderWithProviders(<AgentCommissions />)

  expect(await screen.findByText("Ali Khan")).toBeInTheDocument()
  // Payable card carries the currency; totals tiles render the bare number.
  expect(screen.getByText("1,020 CNY")).toBeInTheDocument()
  expect(screen.getByText("500")).toBeInTheDocument()
})

it("shows a student application with its offer banner", async () => {
  usePortalAuthStore.setState({
    token: "t", kind: "student",
    profile: { id: 5, name: "Ali Khan", email: null, status: "arrived", code: "STU-2026-00005" },
  })
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      jsonResponse({
        data: [{
          id: 21, application_code: "APP-2026-00021", status: "offer_received", submitted_at: null,
          university: "Jilin Medical University", course: { name: "MBBS", level: "bachelor" }, intake: "Sept 2026",
          offers: [{ offer_type: "unconditional", reference_no: "OFR-1", issued_date: null, expiry_date: null, status: "issued" }],
          progress: [{ status: "submitted", at: null }, { status: "offer_received", at: null }],
        }],
      }),
    ),
  )

  renderWithProviders(<StudentApplications />)

  expect(await screen.findByText("MBBS")).toBeInTheDocument()
  expect(screen.getByText(/Offer received/)).toBeInTheDocument()
})

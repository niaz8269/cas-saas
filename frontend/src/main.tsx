import "./index.css"
import "@/i18n"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { lazy, StrictMode, Suspense } from "react"
import { createRoot } from "react-dom/client"
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom"

import ErrorBoundary from "@/components/ErrorBoundary"
const AppShell = lazy(() => import("@/components/layout/AppShell"))
import LoginPage from "@/features/auth/LoginPage"
import RequireAuth from "@/features/auth/RequireAuth"
const ScholarshipsPage = lazy(() => import("@/features/catalog/ScholarshipsPage"))
const UniversitiesPage = lazy(() => import("@/features/catalog/UniversitiesPage"))
const UniversityDetailPage = lazy(() => import("@/features/catalog/UniversityDetailPage"))
const ApplicationDetailPage = lazy(() => import("@/features/admissions/ApplicationDetailPage"))
const ApplicationsPage = lazy(() => import("@/features/admissions/ApplicationsPage"))
const AgentPayablesPage = lazy(() => import("@/features/finance/AgentPayablesPage"))
const CommissionDetailPage = lazy(() => import("@/features/finance/CommissionDetailPage"))
const CommissionsPage = lazy(() => import("@/features/finance/CommissionsPage"))
const FinancePage = lazy(() => import("@/features/finance/FinancePage"))
const InvoiceDetailPage = lazy(() => import("@/features/finance/InvoiceDetailPage"))
const LeadDetailPage = lazy(() => import("@/features/crm/LeadDetailPage"))
const LeadsPage = lazy(() => import("@/features/crm/LeadsPage"))
const StudentProfilePage = lazy(() => import("@/features/crm/StudentProfilePage"))
const StudentsPage = lazy(() => import("@/features/crm/StudentsPage"))
const DashboardPage = lazy(() => import("@/features/dashboard/DashboardPage"))
const ReportsPage = lazy(() => import("@/features/dashboard/ReportsPage"))
const VisaCaseDetailPage = lazy(() => import("@/features/visa/VisaCaseDetailPage"))
const VisaCasesPage = lazy(() => import("@/features/visa/VisaCasesPage"))
const PortalLogin = lazy(() => import("@/features/portal/PortalLogin"))
const PortalRegister = lazy(() => import("@/features/portal/PortalRegister"))
const PortalShell = lazy(() => import("@/features/portal/PortalShell"))
const RequirePortalAuth = lazy(() => import("@/features/portal/RequirePortalAuth"))
const AgentHome = lazy(() => import("@/features/portal/agent/AgentHome"))
const AgentAddStudent = lazy(() => import("@/features/portal/agent/AgentAddStudent"))
const AgentStudents = lazy(() => import("@/features/portal/agent/AgentStudents"))
const AgentApplyWizard = lazy(() => import("@/features/portal/agent/AgentApplyWizard"))
const AgentScholarshipWizard = lazy(() => import("@/features/portal/agent/AgentScholarshipWizard"))
const AgentCommissions = lazy(() => import("@/features/portal/agent/AgentCommissions"))
const StudentHome = lazy(() => import("@/features/portal/student/StudentHome"))
const StudentApplyWizard = lazy(() => import("@/features/portal/student/StudentApplyWizard"))
const StudentScholarshipWizard = lazy(() => import("@/features/portal/student/StudentScholarshipWizard"))
const StudentApplications = lazy(() => import("@/features/portal/student/StudentApplications"))
const StudentVisa = lazy(() => import("@/features/portal/student/StudentVisa"))
const StudentContact = lazy(() => import("@/features/portal/student/StudentContact"))
const StudentInvoices = lazy(() => import("@/features/portal/student/StudentInvoices"))
const StudentDocuments = lazy(() => import("@/features/portal/student/StudentDocuments"))
import SiteLayout from "@/features/site/SiteLayout"
import SiteHome from "@/features/site/SiteHome"
import SiteUniversities from "@/features/site/SiteUniversities"
import SiteUniversity from "@/features/site/SiteUniversity"
import SiteProgramFinder from "@/features/site/SiteProgramFinder"
import SiteScholarships from "@/features/site/SiteScholarships"
import SiteAbout from "@/features/site/SiteAbout"
import SiteCities from "@/features/site/SiteCities"
import SiteCity from "@/features/site/SiteCity"
import SiteMbbs from "@/features/site/SiteMbbs"
import SiteCsc from "@/features/site/SiteCsc"
import SiteNotFound from "@/features/site/SiteNotFound"
import SitePhotoCredits from "@/features/site/SitePhotoCredits"
import SiteContact from "@/features/site/SiteContact"
import SiteFAQ from "@/features/site/SiteFAQ"
import SitePartner from "@/features/site/SitePartner"
import SitePricing from "@/features/site/SitePricing"
import SiteStudyPlan from "@/features/site/SiteStudyPlan"
import SiteServices from "@/features/site/SiteServices"
import SiteWhyChina from "@/features/site/SiteWhyChina"
import SiteNews from "@/features/site/SiteNews"
import SitePostDetail from "@/features/site/SitePostDetail"
const ContentPage = lazy(() => import("@/features/admin/ContentPage"))
const MarketingPage = lazy(() => import("@/features/marketing/MarketingPage"))
const PartnerRequestsPage = lazy(() => import("@/features/admin/PartnerRequestsPage"))
const UsersPage = lazy(() => import("@/features/admin/UsersPage"))
const SettingsPage = lazy(() => import("@/features/admin/SettingsPage"))
const IntegrationsPage = lazy(() => import("@/features/admin/IntegrationsPage"))
const ErrorLogPage = lazy(() => import("@/features/admin/ErrorLogPage"))
const TasksPage = lazy(() => import("@/features/tasks/TasksPage"))
import { initErrorReporting } from "@/lib/errorReporting"

initErrorReporting()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

const router = createBrowserRouter([
  // Staff/admin sign in lives at /admin; the public login/register is the
  // student/agent portal. /login stays as a redirect for old links.
  { path: "/admin", element: <LoginPage /> },
  { path: "/login", element: <Navigate to="/admin" replace /> },

  // Public website preview (unauthenticated) — consumes the public API
  {
    element: <SiteLayout />,
    children: [
      // The public website is the front door; /site stays as an alias for existing links.
      { path: "/", element: <SiteHome /> },
      { path: "/site", element: <Navigate to="/" replace /> },
      { path: "/site/universities", element: <SiteUniversities /> },
      { path: "/site/universities/:slug", element: <SiteUniversity /> },
      { path: "/site/programs", element: <SiteProgramFinder /> },
      { path: "/site/scholarships", element: <SiteScholarships /> },
      { path: "/site/services", element: <SiteServices /> },
      { path: "/site/why-china", element: <SiteWhyChina /> },
      { path: "/site/news", element: <SiteNews /> },
      { path: "/site/news/:slug", element: <SitePostDetail /> },
      { path: "/site/about", element: <SiteAbout /> },
      { path: "/site/contact", element: <SiteContact /> },
      { path: "/site/study-plan", element: <SiteStudyPlan /> },
      { path: "/site/pricing", element: <SitePricing /> },
      { path: "/site/partner", element: <SitePartner /> },
      { path: "/site/faq", element: <SiteFAQ /> },
      { path: "/site/cities", element: <SiteCities /> },
      { path: "/site/cities/:slug", element: <SiteCity /> },
      { path: "/site/mbbs-in-china", element: <SiteMbbs /> },
      { path: "/site/csc-scholarship", element: <SiteCsc /> },
      { path: "/site/photo-credits", element: <SitePhotoCredits /> },
      { path: "/site/*", element: <SiteNotFound /> },
    ],
  },

  // Mobile-first portals (agent + student) — separate token + shell (M7)
  { path: "/portal/login", element: <PortalLogin /> },
  { path: "/portal/register", element: <PortalRegister /> },
  {
    element: <RequirePortalAuth />,
    children: [
      {
        element: <PortalShell />,
        children: [
          { path: "/portal/agent", element: <AgentHome /> },
          { path: "/portal/agent/students", element: <AgentStudents /> },
          { path: "/portal/agent/students/new", element: <AgentAddStudent /> },
          { path: "/portal/agent/apply", element: <AgentApplyWizard /> },
          { path: "/portal/agent/apply-scholarship", element: <AgentScholarshipWizard /> },
          { path: "/portal/agent/commissions", element: <AgentCommissions /> },
          { path: "/portal/student", element: <StudentHome /> },
          { path: "/portal/student/apply", element: <StudentApplyWizard /> },
          { path: "/portal/student/apply-scholarship", element: <StudentScholarshipWizard /> },
          { path: "/portal/student/applications", element: <StudentApplications /> },
          { path: "/portal/student/visa", element: <StudentVisa /> },
          { path: "/portal/student/contact", element: <StudentContact /> },
          { path: "/portal/student/invoices", element: <StudentInvoices /> },
          { path: "/portal/student/documents", element: <StudentDocuments /> },
        ],
      },
    ],
  },

  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/tasks", element: <TasksPage /> },
          { path: "/leads", element: <LeadsPage /> },
          { path: "/leads/:id", element: <LeadDetailPage /> },
          { path: "/students", element: <StudentsPage /> },
          { path: "/students/:id", element: <StudentProfilePage /> },
          { path: "/applications", element: <ApplicationsPage /> },
          { path: "/applications/:id", element: <ApplicationDetailPage /> },
          { path: "/universities", element: <UniversitiesPage /> },
          { path: "/universities/:id", element: <UniversityDetailPage /> },
          { path: "/scholarships", element: <ScholarshipsPage /> },
          { path: "/finance", element: <FinancePage /> },
          { path: "/finance/:id", element: <InvoiceDetailPage /> },
          { path: "/commissions", element: <CommissionsPage /> },
          { path: "/commissions/:id", element: <CommissionDetailPage /> },
          { path: "/agent-payables", element: <AgentPayablesPage /> },
          { path: "/visa", element: <VisaCasesPage /> },
          { path: "/visa/:id", element: <VisaCaseDetailPage /> },
          { path: "/reports", element: <ReportsPage /> },
          { path: "/users", element: <UsersPage /> },
          { path: "/partner-requests", element: <PartnerRequestsPage /> },
          { path: "/content", element: <ContentPage /> },
          { path: "/campaigns", element: <MarketingPage /> },
          { path: "/integrations", element: <IntegrationsPage /> },
          { path: "/error-log", element: <ErrorLogPage /> },
          { path: "/settings", element: <SettingsPage /> },
        ],
      },
    ],
  },
])

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={null}><RouterProvider router={router} /></Suspense>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)

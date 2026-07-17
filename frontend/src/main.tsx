import "./index.css"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createBrowserRouter, RouterProvider } from "react-router-dom"

import AppShell from "@/components/layout/AppShell"
import ComingSoon from "@/components/layout/ComingSoon"
import LoginPage from "@/features/auth/LoginPage"
import RequireAuth from "@/features/auth/RequireAuth"
import UniversitiesPage from "@/features/catalog/UniversitiesPage"
import UniversityDetailPage from "@/features/catalog/UniversityDetailPage"
import ApplicationDetailPage from "@/features/admissions/ApplicationDetailPage"
import ApplicationsPage from "@/features/admissions/ApplicationsPage"
import CommissionDetailPage from "@/features/finance/CommissionDetailPage"
import CommissionsPage from "@/features/finance/CommissionsPage"
import FinancePage from "@/features/finance/FinancePage"
import InvoiceDetailPage from "@/features/finance/InvoiceDetailPage"
import LeadDetailPage from "@/features/crm/LeadDetailPage"
import LeadsPage from "@/features/crm/LeadsPage"
import StudentProfilePage from "@/features/crm/StudentProfilePage"
import StudentsPage from "@/features/crm/StudentsPage"
import DashboardPage from "@/features/dashboard/DashboardPage"
import ReportsPage from "@/features/dashboard/ReportsPage"
import VisaCaseDetailPage from "@/features/visa/VisaCaseDetailPage"
import VisaCasesPage from "@/features/visa/VisaCasesPage"
import PortalLogin from "@/features/portal/PortalLogin"
import PortalShell from "@/features/portal/PortalShell"
import RequirePortalAuth from "@/features/portal/RequirePortalAuth"
import AgentHome from "@/features/portal/agent/AgentHome"
import AgentStudents from "@/features/portal/agent/AgentStudents"
import AgentCommissions from "@/features/portal/agent/AgentCommissions"
import StudentHome from "@/features/portal/student/StudentHome"
import StudentApplications from "@/features/portal/student/StudentApplications"
import StudentVisa from "@/features/portal/student/StudentVisa"
import StudentInvoices from "@/features/portal/student/StudentInvoices"
import StudentDocuments from "@/features/portal/student/StudentDocuments"

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
  { path: "/login", element: <LoginPage /> },

  // Mobile-first portals (agent + student) — separate token + shell (M7)
  { path: "/portal/login", element: <PortalLogin /> },
  {
    element: <RequirePortalAuth />,
    children: [
      {
        element: <PortalShell />,
        children: [
          { path: "/portal/agent", element: <AgentHome /> },
          { path: "/portal/agent/students", element: <AgentStudents /> },
          { path: "/portal/agent/commissions", element: <AgentCommissions /> },
          { path: "/portal/student", element: <StudentHome /> },
          { path: "/portal/student/applications", element: <StudentApplications /> },
          { path: "/portal/student/visa", element: <StudentVisa /> },
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
          { path: "/", element: <DashboardPage /> },
          { path: "/leads", element: <LeadsPage /> },
          { path: "/leads/:id", element: <LeadDetailPage /> },
          { path: "/students", element: <StudentsPage /> },
          { path: "/students/:id", element: <StudentProfilePage /> },
          { path: "/applications", element: <ApplicationsPage /> },
          { path: "/applications/:id", element: <ApplicationDetailPage /> },
          { path: "/universities", element: <UniversitiesPage /> },
          { path: "/universities/:id", element: <UniversityDetailPage /> },
          { path: "/scholarships", element: <ComingSoon module="Scholarships" milestone="M2" /> },
          { path: "/finance", element: <FinancePage /> },
          { path: "/finance/:id", element: <InvoiceDetailPage /> },
          { path: "/commissions", element: <CommissionsPage /> },
          { path: "/commissions/:id", element: <CommissionDetailPage /> },
          { path: "/visa", element: <VisaCasesPage /> },
          { path: "/visa/:id", element: <VisaCaseDetailPage /> },
          { path: "/reports", element: <ReportsPage /> },
          { path: "/users", element: <ComingSoon module="User Management" milestone="M1+" /> },
          { path: "/settings", element: <ComingSoon module="Settings" milestone="M8" /> },
        ],
      },
    ],
  },
])

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)

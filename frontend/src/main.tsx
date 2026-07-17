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
import LeadDetailPage from "@/features/crm/LeadDetailPage"
import LeadsPage from "@/features/crm/LeadsPage"
import DashboardPage from "@/features/dashboard/DashboardPage"

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
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/", element: <DashboardPage /> },
          { path: "/leads", element: <LeadsPage /> },
          { path: "/leads/:id", element: <LeadDetailPage /> },
          { path: "/students", element: <ComingSoon module="Students" milestone="M3.6" /> },
          { path: "/students/:id", element: <ComingSoon module="Student profile" milestone="M3.6" /> },
          { path: "/applications", element: <ComingSoon module="Applications" milestone="M4" /> },
          { path: "/universities", element: <UniversitiesPage /> },
          { path: "/universities/:id", element: <UniversityDetailPage /> },
          { path: "/scholarships", element: <ComingSoon module="Scholarships" milestone="M2" /> },
          { path: "/finance", element: <ComingSoon module="Finance" milestone="M5" /> },
          { path: "/commissions", element: <ComingSoon module="Commissions" milestone="M5" /> },
          { path: "/visa", element: <ComingSoon module="Visa" milestone="M6" /> },
          { path: "/reports", element: <ComingSoon module="Reports" milestone="M9" /> },
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

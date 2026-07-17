import { useMutation } from "@tanstack/react-query"
import {
  FileText,
  GraduationCap,
  LayoutGrid,
  LogOut,
  Plane,
  Receipt,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { NavLink, Outlet, useNavigate } from "react-router-dom"

import casLogo from "@/assets/cas-logo.png"
import { portalLogout } from "@/features/portal/api"
import { usePortalAuthStore } from "@/stores/portalAuth"
import { cn } from "@/lib/utils"

interface PortalNavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}

const AGENT_NAV: PortalNavItem[] = [
  { to: "/portal/agent", label: "Home", icon: LayoutGrid, end: true },
  { to: "/portal/agent/students", label: "Students", icon: GraduationCap },
  { to: "/portal/agent/commissions", label: "Earnings", icon: Wallet },
]

const STUDENT_NAV: PortalNavItem[] = [
  { to: "/portal/student", label: "Home", icon: LayoutGrid, end: true },
  { to: "/portal/student/applications", label: "Apps", icon: FileText },
  { to: "/portal/student/visa", label: "Visa", icon: Plane },
  { to: "/portal/student/invoices", label: "Fees", icon: Receipt },
  { to: "/portal/student/documents", label: "Docs", icon: FileText },
]

export default function PortalShell() {
  const navigate = useNavigate()
  const kind = usePortalAuthStore((s) => s.kind)
  const profile = usePortalAuthStore((s) => s.profile)
  const clearAuth = usePortalAuthStore((s) => s.clearAuth)

  const nav = kind === "agent" ? AGENT_NAV : STUDENT_NAV

  const logoutMutation = useMutation({
    mutationFn: () => portalLogout(kind ?? "student"),
    onSettled: () => {
      clearAuth()
      navigate("/portal/login", { replace: true })
    },
  })

  return (
    <div className="flex min-h-dvh flex-col bg-subtle">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-4 py-3">
        <img src={casLogo} alt="CAS" className="h-8 w-auto" />
        <div className="flex items-center gap-3">
          <div className="text-right leading-tight">
            <p className="max-w-40 truncate text-sm font-medium">{profile?.name}</p>
            <p className="font-mono text-[11px] text-muted-foreground">{profile?.code}</p>
          </div>
          <button
            type="button"
            onClick={() => logoutMutation.mutate()}
            aria-label="Sign out"
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-subtle hover:text-foreground"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-24">
        <Outlet />
      </main>

      {/* Bottom nav (mobile-first; centered on wider screens) */}
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t bg-card/95 backdrop-blur">
        <ul className="mx-auto flex max-w-2xl items-stretch justify-around">
          {nav.map((item) => (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) => cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  isActive ? "text-cas-navy" : "text-muted-foreground",
                )}
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={cn("size-5", isActive && "stroke-[2.5]")} aria-hidden="true" />
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

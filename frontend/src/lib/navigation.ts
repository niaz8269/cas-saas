import {
  Award,
  Banknote,
  BarChart3,
  FileText,
  Filter,
  GraduationCap,
  KeyRound,
  LayoutDashboard,
  Plane,
  Receipt,
  School,
  Settings,
  Siren,
  UserCog,
  type LucideIcon,
} from "lucide-react"

import type { AuthUser } from "@/types/auth"

export interface NavItem {
  title: string
  to: string
  icon: LucideIcon
  /** Permission module prefix gating visibility (null = always visible). */
  module: string | null
}

export interface NavGroup {
  label?: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { title: "Dashboard", to: "/", icon: LayoutDashboard, module: "dashboard" },
    ],
  },
  {
    label: "CRM",
    items: [
      { title: "Leads", to: "/leads", icon: Filter, module: "leads" },
      { title: "Students", to: "/students", icon: GraduationCap, module: "students" },
    ],
  },
  {
    label: "Admissions",
    items: [
      { title: "Applications", to: "/applications", icon: FileText, module: "applications" },
      { title: "Universities", to: "/universities", icon: School, module: "universities" },
      { title: "Scholarships", to: "/scholarships", icon: Award, module: "scholarships" },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Finance", to: "/finance", icon: Receipt, module: "finance" },
      { title: "Commissions", to: "/commissions", icon: Banknote, module: "commission" },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Visa", to: "/visa", icon: Plane, module: "visa" },
      { title: "Reports", to: "/reports", icon: BarChart3, module: "reports" },
    ],
  },
  {
    label: "System",
    items: [
      { title: "Users", to: "/users", icon: UserCog, module: "users" },
      { title: "Integrations", to: "/integrations", icon: KeyRound, module: "settings" },
      { title: "Error monitor", to: "/error-log", icon: Siren, module: "settings" },
      { title: "Settings", to: "/settings", icon: Settings, module: "settings" },
    ],
  },
]

export function isSuperAdmin(user: AuthUser | null): boolean {
  return user?.roles.includes("Super Admin") ?? false
}

/**
 * A module is visible when the user holds any permission under its prefix
 * (Super Admin bypasses, mirroring the server-side Gate::before).
 */
export function canAccessModule(user: AuthUser | null, module: string | null): boolean {
  if (!user) return false
  if (module === null) return true
  if (isSuperAdmin(user)) return true

  return user.permissions.some((permission) => permission.startsWith(`${module}.`))
}

export function visibleNavGroups(user: AuthUser | null): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccessModule(user, item.module)),
  })).filter((group) => group.items.length > 0)
}

/** Page title for the topbar, derived from the nav config. */
export function pageTitle(pathname: string): string {
  const items = NAV_GROUPS.flatMap((group) => group.items)
  const exact = items.find((item) => item.to === pathname)
  if (exact) return exact.title

  const prefix = items
    .filter((item) => item.to !== "/" && pathname.startsWith(item.to))
    .sort((a, b) => b.to.length - a.to.length)[0]

  return prefix?.title ?? "CAS ERP"
}

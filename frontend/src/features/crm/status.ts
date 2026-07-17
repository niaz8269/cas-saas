/** Soft-tinted status badges per the design system (never loud). */
export const LEAD_STATUS_BADGE: Record<string, string> = {
  new: "bg-cas-navy-50 text-cas-navy",
  assigned: "bg-sky-50 text-sky-700",
  contacted: "bg-amber-50 text-amber-700",
  qualified: "bg-emerald-50 text-emerald-700",
  converted: "bg-green-100 text-green-800",
  unqualified: "bg-muted text-muted-foreground",
  lost: "bg-muted text-muted-foreground",
  duplicate: "bg-cas-red-50 text-cas-red",
}

export const LEAD_STATUSES = [
  "new", "assigned", "contacted", "qualified",
  "converted", "unqualified", "lost", "duplicate",
] as const

/** Statuses staff may set directly (converted/duplicate are flow-owned). */
export const LEAD_EDITABLE_STATUSES = [
  "new", "assigned", "contacted", "qualified", "unqualified", "lost",
] as const

export const STUDENT_STATUS_BADGE: Record<string, string> = {
  active: "bg-cas-navy-50 text-cas-navy",
  in_process: "bg-amber-50 text-amber-700",
  enrolled: "bg-emerald-50 text-emerald-700",
  arrived: "bg-green-100 text-green-800",
  withdrawn: "bg-cas-red-50 text-cas-red",
  inactive: "bg-muted text-muted-foreground",
}

export const STUDENT_STATUSES = [
  "active", "in_process", "enrolled", "arrived", "withdrawn", "inactive",
] as const

export const INVOICE_STATUS_BADGE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  issued: "bg-cas-navy-50 text-cas-navy",
  partially_paid: "bg-amber-50 text-amber-700",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-muted text-muted-foreground",
  overdue: "bg-cas-red-50 text-cas-red",
}

export const COMMISSION_LADDER = [
  "expected",
  "pending_arrival",
  "eligible",
  "invoiced",
  "received",
] as const

/** Mirrors backend CommissionEngine::TRANSITIONS (UI affordance only). */
export const COMMISSION_NEXT: Record<string, string | undefined> = {
  expected: "pending_arrival",
  pending_arrival: "eligible",
  eligible: "invoiced",
  invoiced: "received",
  received: undefined,
}

export const COMMISSION_STATUS_BADGE: Record<string, string> = {
  expected: "bg-cas-navy-50 text-cas-navy",
  pending_arrival: "bg-amber-50 text-amber-700",
  eligible: "bg-sky-50 text-sky-700",
  invoiced: "bg-emerald-50 text-emerald-700",
  received: "bg-green-100 text-green-800",
}

export const PAYABLE_STATUS_BADGE: Record<string, string> = {
  payable: "bg-amber-50 text-amber-700",
  paid: "bg-green-100 text-green-800",
}

export const money = (value: string | number | null | undefined, currency?: string | null) =>
  value == null ? "—" : `${Number(value).toLocaleString()} ${currency ?? ""}`.trim()

export const label = (status: string) => status.replace(/_/g, " ")

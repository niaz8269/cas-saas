export const VISA_LADDER = [
  "not_started",
  "documents_collection",
  "appointment_booked",
  "submitted",
  "approved",
  "travel_ready",
] as const

/** Mirrors backend VisaWorkflow::TRANSITIONS (UI affordance only). */
export const VISA_NEXT: Record<string, string[]> = {
  not_started: ["documents_collection"],
  documents_collection: ["appointment_booked"],
  appointment_booked: ["submitted"],
  submitted: ["approved", "rejected"],
  approved: ["travel_ready"],
  rejected: ["documents_collection"],
  travel_ready: [],
}

export const VISA_STATUS_BADGE: Record<string, string> = {
  not_started: "bg-muted text-muted-foreground",
  documents_collection: "bg-cas-navy-50 text-cas-navy",
  appointment_booked: "bg-sky-50 text-sky-700",
  submitted: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-cas-red-50 text-cas-red",
  travel_ready: "bg-green-100 text-green-800",
}

export const CHECKLIST_STATUS_BADGE: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  received: "bg-amber-50 text-amber-700",
  verified: "bg-green-100 text-green-800",
}

export const label = (status: string) => status.replace(/_/g, " ")

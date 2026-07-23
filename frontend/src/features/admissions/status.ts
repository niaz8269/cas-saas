/** Application status ladder (happy path) for the stepper. */
export const APPLICATION_LADDER = [
  "draft",
  "under_review",
  "documents_pending",
  "submitted",
  "offer_received",
  "accepted",
] as const

/** Mirrors backend ApplicationWorkflow::TRANSITIONS for button rendering
 *  (the API re-validates — this is UI affordance only). */
export const APPLICATION_TRANSITIONS: Record<string, string[]> = {
  draft: ["under_review", "withdrawn"],
  under_review: ["documents_pending", "submitted", "rejected", "withdrawn"],
  documents_pending: ["under_review", "submitted", "rejected", "withdrawn"],
  submitted: ["offer_received", "rejected", "withdrawn"],
  offer_received: ["accepted", "rejected", "deferred", "withdrawn"],
  deferred: ["under_review", "withdrawn"],
  accepted: [],
  rejected: [],
  withdrawn: [],
}

export const APPLICATION_STATUS_BADGE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  under_review: "bg-cas-navy-50 text-cas-navy",
  documents_pending: "bg-amber-50 text-amber-700",
  submitted: "bg-sky-50 text-sky-700",
  offer_received: "bg-emerald-50 text-emerald-700",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-cas-red-50 text-cas-red",
  withdrawn: "bg-muted text-muted-foreground",
  deferred: "bg-amber-50 text-amber-700",
}

export const DOCUMENT_STATUS_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  verified: "bg-green-100 text-green-800",
  rejected: "bg-cas-red-50 text-cas-red",
  missing: "bg-muted text-muted-foreground",
}

export const OFFER_STATUS_BADGE: Record<string, string> = {
  issued: "bg-cas-navy-50 text-cas-navy",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-cas-red-50 text-cas-red",
  expired: "bg-muted text-muted-foreground",
}

export const statusLabel = (status: string) => status.replace(/_/g, " ")

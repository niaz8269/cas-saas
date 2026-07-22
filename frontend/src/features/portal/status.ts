export const label = (status: string) => status.replace(/_/g, " ")

/**
 * Status code → i18n key (portalStatus namespace). The badge display labels are
 * translated at the render site — see `StatusBadge` in components.tsx — while the
 * status CODE values below remain unchanged. Unknown codes fall back to `label()`.
 */
export const STATUS_LABEL_KEY: Record<string, string> = {
  draft: "portalStatus.draft",
  under_review: "portalStatus.underReview",
  documents_pending: "portalStatus.documentsPending",
  submitted: "portalStatus.submitted",
  offer_received: "portalStatus.offerReceived",
  accepted: "portalStatus.accepted",
  rejected: "portalStatus.rejected",
  withdrawn: "portalStatus.withdrawn",
  deferred: "portalStatus.deferred",
  not_started: "portalStatus.notStarted",
  documents_collection: "portalStatus.documentsCollection",
  appointment_booked: "portalStatus.appointmentBooked",
  approved: "portalStatus.approved",
  travel_ready: "portalStatus.travelReady",
  issued: "portalStatus.issued",
  partially_paid: "portalStatus.partiallyPaid",
  paid: "portalStatus.paid",
  cancelled: "portalStatus.cancelled",
  overdue: "portalStatus.overdue",
  active: "portalStatus.active",
  in_process: "portalStatus.inProcess",
  enrolled: "portalStatus.enrolled",
  arrived: "portalStatus.arrived",
  inactive: "portalStatus.inactive",
  pending: "portalStatus.pending",
  verified: "portalStatus.verified",
  received: "portalStatus.received",
  payable: "portalStatus.payable",
}

export const money = (value: string | number | null | undefined, currency?: string | null) =>
  value == null ? "—" : `${Number(value).toLocaleString()} ${currency ?? ""}`.trim()

/** Application lifecycle → soft badge classes. */
export const APPLICATION_BADGE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  under_review: "bg-cas-navy-50 text-cas-navy",
  documents_pending: "bg-amber-50 text-amber-700",
  submitted: "bg-sky-50 text-sky-700",
  offer_received: "bg-violet-50 text-violet-700",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-cas-red-50 text-cas-red",
  withdrawn: "bg-muted text-muted-foreground",
  deferred: "bg-amber-50 text-amber-700",
}

export const VISA_BADGE: Record<string, string> = {
  not_started: "bg-muted text-muted-foreground",
  documents_collection: "bg-cas-navy-50 text-cas-navy",
  appointment_booked: "bg-sky-50 text-sky-700",
  submitted: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-cas-red-50 text-cas-red",
  travel_ready: "bg-green-100 text-green-800",
}

export const INVOICE_BADGE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  issued: "bg-cas-navy-50 text-cas-navy",
  partially_paid: "bg-amber-50 text-amber-700",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-muted text-muted-foreground",
  overdue: "bg-cas-red-50 text-cas-red",
}

export const STUDENT_BADGE: Record<string, string> = {
  active: "bg-cas-navy-50 text-cas-navy",
  in_process: "bg-sky-50 text-sky-700",
  enrolled: "bg-emerald-50 text-emerald-700",
  arrived: "bg-green-100 text-green-800",
  withdrawn: "bg-cas-red-50 text-cas-red",
  inactive: "bg-muted text-muted-foreground",
}

export const DOC_BADGE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  verified: "bg-green-100 text-green-800",
  rejected: "bg-cas-red-50 text-cas-red",
  received: "bg-sky-50 text-sky-700",
}

export const PAYABLE_BADGE: Record<string, string> = {
  payable: "bg-amber-50 text-amber-700",
  paid: "bg-green-100 text-green-800",
}

import type { ApplicationListItem, SubmittedVia } from "@/features/admissions/api"

/** The "Submitted by" choices in the admin filter. `unknown` is applications whose submitter was never recorded. */
export const SUBMITTED_BY_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "student", label: "Students" },
  { value: "agent", label: "Partners" },
  { value: "staff", label: "Staff" },
  { value: "ingest", label: "Website / API" },
  { value: "unknown", label: "Not recorded" },
]

const LABELS: Record<SubmittedVia, string> = { student: "Student", agent: "Partner", staff: "Staff", ingest: "Website / API" }

export const submittedByLabel = (via: ApplicationListItem["submitted_via"]) => (via ? LABELS[via] : "Not recorded")

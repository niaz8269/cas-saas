import type { Degree, Funding, WizardEducation } from "@/features/portal/api"

/** Flat key/value bag for the profile fields the apply wizards collect. */
export type Profile = Record<string, string>

export const EMPTY_EDUCATION: WizardEducation = { degree_name: "", level: "intermediate" }

/** Degree tiles shared by the apply wizards (step "Course"). */
export const DEGREES: { value: Degree; label: string; hint: string }[] = [
  { value: "mbbs", label: "MBBS", hint: "Bachelor of Medicine" },
  { value: "bds", label: "BDS", hint: "Bachelor of Dental Surgery" },
  { value: "bs", label: "Bachelor (BS)", hint: "Undergraduate degree" },
  { value: "master", label: "Master", hint: "Postgraduate degree" },
  { value: "phd", label: "PhD", hint: "Doctoral degree" },
  { value: "diploma", label: "Diploma", hint: "Short qualification" },
]

/** Funding tiles shared by the apply wizards (step "Course"). */
export const FUNDING: { value: Funding; label: string; hint: string }[] = [
  { value: "self", label: "Self-funded", hint: "Pay tuition yourself" },
  { value: "scholarship", label: "Scholarship", hint: "Full scholarship" },
  { value: "partial", label: "Partial scholarship", hint: "Partial support" },
]

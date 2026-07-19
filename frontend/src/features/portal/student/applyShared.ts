import type { WizardEducation } from "@/features/portal/api"

/** Flat key/value bag for the profile fields the apply wizards collect. */
export type Profile = Record<string, string>

export const EMPTY_EDUCATION: WizardEducation = { degree_name: "", level: "intermediate" }

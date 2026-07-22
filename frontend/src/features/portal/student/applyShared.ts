import type { Degree, Funding, ScholarshipLevel, ScholarshipPreference, WizardEducation } from "@/features/portal/api"

/** Flat key/value bag for the profile fields the apply wizards collect. */
export type Profile = Record<string, string>

export const EMPTY_EDUCATION: WizardEducation = { degree_name: "", level: "intermediate" }

/** Degree tiles shared by the apply wizards (step "Course"). */
export const DEGREES: { value: Degree; labelKey: string; hintKey: string }[] = [
  { value: "mbbs", labelKey: "wizard.degrees.mbbs.label", hintKey: "wizard.degrees.mbbs.hint" },
  { value: "bds", labelKey: "wizard.degrees.bds.label", hintKey: "wizard.degrees.bds.hint" },
  { value: "bs", labelKey: "wizard.degrees.bs.label", hintKey: "wizard.degrees.bs.hint" },
  { value: "master", labelKey: "wizard.degrees.master.label", hintKey: "wizard.degrees.master.hint" },
  { value: "phd", labelKey: "wizard.degrees.phd.label", hintKey: "wizard.degrees.phd.hint" },
  { value: "diploma", labelKey: "wizard.degrees.diploma.label", hintKey: "wizard.degrees.diploma.hint" },
]

/** Funding tiles shared by the apply wizards (step "Course"). */
export const FUNDING: { value: Funding; labelKey: string; hintKey: string }[] = [
  { value: "self", labelKey: "wizard.funding.self.label", hintKey: "wizard.funding.self.hint" },
  { value: "scholarship", labelKey: "wizard.funding.scholarship.label", hintKey: "wizard.funding.scholarship.hint" },
  { value: "partial", labelKey: "wizard.funding.partial.label", hintKey: "wizard.funding.partial.hint" },
]

/** Degree levels shared by the government-scholarship wizards. */
export const LEVELS: { value: ScholarshipLevel; labelKey: string; hintKey: string }[] = [
  { value: "bachelor", labelKey: "wizard.levels.bachelor.label", hintKey: "wizard.levels.bachelor.hint" },
  { value: "master", labelKey: "wizard.levels.master.label", hintKey: "wizard.levels.master.hint" },
  { value: "phd", labelKey: "wizard.levels.phd.label", hintKey: "wizard.levels.phd.hint" },
]

export const emptyPref = (): ScholarshipPreference => ({ major: "", university_id: null })

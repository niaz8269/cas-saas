/**
 * Medical programs (MBBS, BDS, Nursing, Pharmacy and their direct equivalents) always show the medium of instruction,
 * because it decides whether a student can be licensed and whether the university is approved for them. Every other
 * program says nothing about the language it is taught in.
 */
const MEDICAL = /\b(MBBS|BDS|Nursing|Pharmac\w*|Stomatolog\w*|Dentist\w*|Dental|Clinical Medicine)\b/i

export function isMedicalProgram(name: string | null | undefined): boolean {
  return MEDICAL.test(name ?? "")
}

/** The language to print next to a program: only for a medical program that has one recorded. */
export function mediumFor(program: { name: string; teaching_language?: string | null }): string | null {
  return isMedicalProgram(program.name) ? (program.teaching_language ?? null) : null
}

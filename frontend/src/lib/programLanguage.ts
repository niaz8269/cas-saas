/**
 * The medium of instruction printed next to a program. It follows the data: a program shows the language set on it in
 * the admin panel, and a program with none set shows nothing. So whoever manages the catalog decides which programs
 * (for example MBBS, BDS, Nursing, Pharmacy) carry it, by filling it in or leaving it empty.
 */
export function mediumFor(program: { teaching_language?: string | null }): string | null {
  const language = program.teaching_language?.trim()

  return language ? language : null
}

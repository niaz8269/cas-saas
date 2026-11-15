import type { TFunction } from "i18next"

/** A program length stored in months, shown in years: 48 → "4 years", 12 → "1 year", 18 → "1.5 years". */
export function formatDuration(months: number, t: TFunction): string {
  const years = Math.round((months / 12) * 10) / 10

  return t("duration.years", { count: years })
}

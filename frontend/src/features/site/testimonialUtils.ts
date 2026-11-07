import type { SiteTestimonial } from "@/features/site/api"
import { DEGREE_LABELS } from "@/features/site/testimonialLabels"

export function initials(name: string): string {
  const parts = name.replace(/\./g, "").split(/\s+/).filter(Boolean)

  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase()
}

/** The lines under a person's name: "Bachelor's · MBBS", the university, then where from. */
export function infoLines(it: SiteTestimonial): string[] {
  if (it.audience === "student") {
    const study = [it.degree ? DEGREE_LABELS[it.degree] ?? it.degree : null, it.program].filter(Boolean).join(" · ")

    return [study, it.university ?? "", [it.country, it.intake_year ? `Intake ${it.intake_year}` : null].filter(Boolean).join(" · ")].filter(Boolean)
  }

  return [it.headline ?? "", [it.country, it.partner_since ? `Partner since ${it.partner_since}` : null].filter(Boolean).join(" · ")].filter(Boolean)
}

/** Approximate centres for countries too small to appear in the 110m world map. */
export const SMALL_COUNTRY_CENTRES: Record<string, [number, number]> = {
  SG: [103.82, 1.35], BH: [50.55, 26.07], MV: [73.22, 3.2], MT: [14.4, 35.9], MU: [57.55, -20.25], SC: [55.49, -4.68],
  BB: [-59.55, 13.19], AG: [-61.8, 17.06], DM: [-61.37, 15.41], GD: [-61.68, 12.12], KN: [-62.75, 17.36], LC: [-60.98, 13.91],
  VC: [-61.2, 13.25], TT: [-61.22, 10.69], KM: [43.87, -11.64], ST: [6.61, 0.19], CV: [-23.6, 15.1], LI: [9.55, 47.17],
  MC: [7.42, 43.74], SM: [12.46, 43.94], AD: [1.52, 42.55], VA: [12.45, 41.9], BN: [114.73, 4.54], TL: [125.73, -8.87],
  HK: [114.17, 22.32], MO: [113.54, 22.2], PS: [35.2, 31.9], WS: [-172.1, -13.76], TO: [-175.2, -21.18], FJ: [178.07, -17.71],
  KI: [-157.4, 1.87], MH: [171.18, 7.13], FM: [158.2, 6.92], PW: [134.58, 7.51], NR: [166.93, -0.52], TV: [179.2, -8.52],
}

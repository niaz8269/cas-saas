import { useTranslation } from "react-i18next"

import { label, STATUS_LABEL_KEY } from "@/features/portal/status"
import { cn } from "@/lib/utils"

export interface TrackStep {
  status: string
  at?: string | null
}

/**
 * The record of one application: every status it has been through, oldest first, with the date, ending on where it
 * is now. Reads as a vertical trail so each step and its date stay clear on a phone.
 */
export default function ApplicationTrack({ steps }: { steps: TrackStep[] }) {
  const { t, i18n } = useTranslation()
  if (steps.length === 0) return null

  const when = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString(i18n.language, { day: "numeric", month: "short", year: "numeric" }) : "")

  return (
    <ol aria-label={t("portalTrack.label", { defaultValue: "Application progress" })} className="space-y-0 border-t pt-3">
      {steps.map((step, i) => {
        const current = i === steps.length - 1
        const text = STATUS_LABEL_KEY[step.status] ? t(STATUS_LABEL_KEY[step.status]) : label(step.status)

        return (
          <li key={`${step.status}-${i}`} className="relative flex gap-3 pb-3 last:pb-0">
            {!current && <span aria-hidden="true" className="absolute top-3 bottom-0 left-[5px] w-px bg-border" />}
            <span aria-hidden="true" className={cn("relative mt-1 size-2.5 shrink-0 rounded-full", current ? "bg-cas-navy ring-4 ring-cas-navy/15" : "bg-muted-foreground/40")} />
            <div className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
              <span className={cn("text-sm capitalize", current ? "font-medium text-cas-navy" : "text-muted-foreground")}>
                {text}
                {current && <span className="sr-only"> ({t("portalTrack.current", { defaultValue: "current" })})</span>}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{when(step.at)}</span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

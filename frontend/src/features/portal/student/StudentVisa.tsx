import { useQuery } from "@tanstack/react-query"
import { Check, Plane } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ApiError } from "@/lib/api"
import { getStudentVisaCase } from "@/features/portal/api"
import {
  EmptyState,
  ListSkeleton,
  LoadError,
  PageTitle,
  PortalCard,
  StatusBadge,
} from "@/features/portal/components"
import { DOC_BADGE, VISA_BADGE } from "@/features/portal/status"
import { cn } from "@/lib/utils"

export default function StudentVisa() {
  const { t } = useTranslation()
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["student", "visa-case"],
    queryFn: getStudentVisaCase,
    retry: false,
  })

  const noCase = error instanceof ApiError && error.status === 404

  if (isPending) return (<div><PageTitle title={t("studentPortal.visa.title")} /><ListSkeleton rows={2} /></div>)

  if (noCase) {
    return (
      <div>
        <PageTitle title={t("studentPortal.visa.title")} />
        <EmptyState icon={<Plane className="mx-auto size-8" />} title={t("studentPortal.visa.emptyTitle")}
          hint={t("studentPortal.visa.emptyHint")} />
      </div>
    )
  }

  if (isError || !data) return (<div><PageTitle title={t("studentPortal.visa.title")} /><LoadError onRetry={refetch} /></div>)

  const visa = data.data
  const milestones = [
    ["studentPortal.visa.milestoneAppointment", visa.appointment_at],
    ["studentPortal.visa.milestoneSubmitted", visa.submitted_at],
    ["studentPortal.visa.milestoneDecision", visa.decision_at],
    ["studentPortal.visa.milestoneTravelReady", visa.travel_ready_at],
  ] as const

  return (
    <div className="space-y-4">
      <PageTitle title={t("studentPortal.visa.title")} subtitle={visa.application_code ?? undefined} />

      <PortalCard>
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">{t("studentPortal.visa.currentStatus")}</p>
          <StatusBadge status={visa.status} map={VISA_BADGE} />
        </div>
        {/* Milestones in the order they happen — reached ones carry the brand. */}
        <ol className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {milestones.map(([labelKey, value]) => (
            <li
              key={labelKey}
              className={cn(
                "rounded-lg p-2.5",
                value ? "bg-cas-navy-50" : "bg-subtle",
              )}
            >
              <p className={cn(
                "text-[11px] font-medium tracking-wider uppercase",
                value ? "text-cas-navy/70" : "text-muted-foreground",
              )}>
                {t(labelKey)}
              </p>
              <p className={cn(
                "mt-0.5 text-sm font-medium tabular-nums",
                value ? "text-cas-navy" : "text-muted-foreground",
              )}>
                {value ? new Date(value).toLocaleDateString() : "—"}
              </p>
            </li>
          ))}
        </ol>
      </PortalCard>

      <div>
        <h2 className="mb-2 text-sm font-semibold">{t("studentPortal.visa.documentChecklist")}</h2>
        <div className="grid gap-2 lg:grid-cols-2">
          {visa.checklist?.map((item, i) => (
            <PortalCard key={i} className="flex items-center justify-between gap-3 py-3">
              <div className="flex min-w-0 items-center gap-2">
                {item.status === "verified"
                  ? <Check className="size-4 shrink-0 text-success" aria-hidden="true" />
                  : <span className="size-4 shrink-0 rounded-full border" aria-hidden="true" />}
                <span className="truncate text-sm">{item.name}{item.is_required ? "" : t("studentPortal.visa.optionalSuffix")}</span>
              </div>
              <StatusBadge status={item.status} map={DOC_BADGE} />
            </PortalCard>
          ))}
        </div>
      </div>
    </div>
  )
}

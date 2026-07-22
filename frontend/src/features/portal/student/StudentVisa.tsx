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
        <div className="mt-3 grid grid-cols-2 gap-2">
          {milestones.map(([labelKey, value]) => (
            <div key={labelKey} className="rounded-lg bg-subtle p-2.5">
              <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">{t(labelKey)}</p>
              <p className="mt-0.5 text-sm font-medium tabular-nums">
                {value ? new Date(value).toLocaleDateString() : "—"}
              </p>
            </div>
          ))}
        </div>
      </PortalCard>

      <div>
        <h2 className="mb-2 text-sm font-semibold">{t("studentPortal.visa.documentChecklist")}</h2>
        <div className="space-y-2">
          {visa.checklist?.map((item, i) => (
            <PortalCard key={i} className="flex items-center justify-between gap-3 py-3">
              <div className="flex items-center gap-2">
                {item.status === "verified"
                  ? <Check className="size-4 text-green-600" />
                  : <span className="size-4 rounded-full border" aria-hidden="true" />}
                <span className="text-sm">{item.name}{item.is_required ? "" : t("studentPortal.visa.optionalSuffix")}</span>
              </div>
              <StatusBadge status={item.status} map={DOC_BADGE} />
            </PortalCard>
          ))}
        </div>
      </div>
    </div>
  )
}

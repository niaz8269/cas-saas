import { useQuery } from "@tanstack/react-query"
import { ChevronRight, FileText, PartyPopper, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { getStudentApplications } from "@/features/portal/api"
import {
  EmptyState,
  ListSkeleton,
  LoadError,
  PageTitle,
  PortalCard,
  StatusBadge,
} from "@/features/portal/components"
import { APPLICATION_BADGE, label } from "@/features/portal/status"
import { cn } from "@/lib/utils"

export default function StudentApplications() {
  const { t } = useTranslation()
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["student", "applications"],
    queryFn: getStudentApplications,
  })

  return (
    <div>
      <PageTitle title={t("studentPortal.applications.title")} subtitle={t("studentPortal.applications.subtitle")} />

      <Button asChild className="mb-4 h-11 w-full">
        <Link to="/portal/student/apply"><Plus className="size-4" /> {t("studentPortal.applications.startNewApplication")}</Link>
      </Button>

      {isPending && <ListSkeleton rows={3} />}
      {isError && <LoadError onRetry={refetch} />}

      {data && data.data.length === 0 && (
        <EmptyState icon={<FileText className="mx-auto size-8" />} title={t("studentPortal.applications.emptyTitle")} />
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {data?.data.map((app) => (
          <PortalCard key={app.id} className="flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{app.program?.name ?? app.application_code}</p>
                <p className="text-sm text-muted-foreground">{app.university}{app.intake ? ` · ${app.intake}` : ""}</p>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{app.application_code}</p>
              </div>
              <StatusBadge status={app.status} map={APPLICATION_BADGE} />
            </div>

            {app.offers && app.offers.length > 0 && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
                <PartyPopper className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  {t("studentPortal.applications.offerReceived")}{app.offers[0].reference_no ? t("studentPortal.applications.offerReference", { reference: app.offers[0].reference_no }) : ""}
                  {app.offers[0].expiry_date ? t("studentPortal.applications.offerValidTo", { date: new Date(app.offers[0].expiry_date).toLocaleDateString() }) : ""}
                </span>
              </div>
            )}

            {/* Where this application has been, oldest first. */}
            {app.progress && app.progress.length > 0 && (
              <ol className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-1.5 border-t pt-3">
                {app.progress.map((step, i) => (
                  <li key={i} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="size-3 text-muted-foreground/50 rtl:rotate-180" aria-hidden="true" />}
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] capitalize",
                      i === app.progress!.length - 1
                        ? "bg-cas-navy-50 font-medium text-cas-navy"
                        : "bg-subtle text-muted-foreground",
                    )}>
                      {label(step.status)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </PortalCard>
        ))}
      </div>
    </div>
  )
}

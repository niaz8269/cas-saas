import { useQuery } from "@tanstack/react-query"
import { FileText } from "lucide-react"

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

export default function StudentApplications() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["student", "applications"],
    queryFn: getStudentApplications,
  })

  return (
    <div>
      <PageTitle title="My applications" subtitle="Track each application's progress" />

      {isPending && <ListSkeleton rows={3} />}
      {isError && <LoadError onRetry={refetch} />}

      {data && data.data.length === 0 && (
        <EmptyState icon={<FileText className="mx-auto size-8" />} title="No applications yet" />
      )}

      <div className="space-y-3">
        {data?.data.map((app) => (
          <PortalCard key={app.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{app.course?.name ?? app.application_code}</p>
                <p className="text-sm text-muted-foreground">{app.university}{app.intake ? ` · ${app.intake}` : ""}</p>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{app.application_code}</p>
              </div>
              <StatusBadge status={app.status} map={APPLICATION_BADGE} />
            </div>

            {app.offers && app.offers.length > 0 && (
              <div className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
                Offer received{app.offers[0].reference_no ? ` · ${app.offers[0].reference_no}` : ""}
                {app.offers[0].expiry_date ? ` · valid to ${new Date(app.offers[0].expiry_date).toLocaleDateString()}` : ""}
              </div>
            )}

            {app.progress && app.progress.length > 0 && (
              <ol className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
                {app.progress.map((step, i) => (
                  <li key={i} className="rounded-full bg-subtle px-2 py-0.5 text-[11px] capitalize text-muted-foreground">
                    {label(step.status)}
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

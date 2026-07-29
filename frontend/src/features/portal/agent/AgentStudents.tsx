import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { FilePlus2, GraduationCap, UserPlus } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { getAgentStudents } from "@/features/portal/api"
import {
  EmptyState,
  ListSkeleton,
  LoadError,
  PageTitle,
  PortalCard,
  StatusBadge,
} from "@/features/portal/components"
import { STUDENT_BADGE } from "@/features/portal/status"
import { useState } from "react"
import { useTranslation } from "react-i18next"

export default function AgentStudents() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["agent", "students", { page }],
    queryFn: () => getAgentStudents({ page }),
    placeholderData: keepPreviousData,
  })

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <PageTitle title={t("agentPortal.students.title")} subtitle={t("agentPortal.students.subtitle")} />
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link to="/portal/agent/apply"><FilePlus2 className="size-4" /> {t("agentPortal.students.newApplication")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/portal/agent/students/new"><UserPlus className="size-4" /> {t("agentPortal.students.addStudent")}</Link>
          </Button>
        </div>
      </div>

      {isPending && <ListSkeleton rows={4} />}
      {isError && <LoadError onRetry={refetch} />}

      {data && data.data.length === 0 && (
        <EmptyState
          icon={<GraduationCap className="mx-auto size-8" />}
          title={t("agentPortal.students.emptyTitle")}
          hint={t("agentPortal.students.emptyHint")}
          action={
            <Button asChild>
              <Link to="/portal/agent/students/new"><UserPlus className="size-4" /> {t("agentPortal.students.addStudent")}</Link>
            </Button>
          }
        />
      )}

      <div className="space-y-2">
        {data?.data.map((s) => (
          <PortalCard key={s.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{s.full_name}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {s.student_code}{s.country ? ` · ${s.country}` : ""} · {t("agentPortal.students.appCount", { count: s.applications_count })}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge status={s.status} map={STUDENT_BADGE} />
              <Button asChild variant="secondary" size="sm" className="gap-1">
                <Link to={`/portal/agent/apply?student=${s.id}&name=${encodeURIComponent(s.full_name)}`}>
                  <FilePlus2 className="size-4" /> {t("agentPortal.students.apply")}
                </Link>
              </Button>
            </div>
          </PortalCard>
        ))}
      </div>

      {data && data.meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>{t("agentPortal.students.paginationRange", { from: data.meta.from, to: data.meta.to, total: data.meta.total })}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={data.meta.current_page <= 1} onClick={() => setPage((p) => p - 1)}>{t("agentPortal.students.prev")}</Button>
            <Button variant="secondary" size="sm" disabled={data.meta.current_page >= data.meta.last_page} onClick={() => setPage((p) => p + 1)}>{t("agentPortal.students.next")}</Button>
          </div>
        </div>
      )}
    </div>
  )
}

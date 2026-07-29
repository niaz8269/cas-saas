import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { FilePlus2, GraduationCap, Search, UserPlus } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getAgentStudents } from "@/features/portal/api"
import {
  EmptyState,
  Initials,
  ListSkeleton,
  LoadError,
  PageTitle,
  PortalCard,
  StatusBadge,
} from "@/features/portal/components"
import { STUDENT_BADGE } from "@/features/portal/status"

export default function AgentStudents() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [term, setTerm] = useState("")

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["agent", "students", { page, term }],
    queryFn: () => getAgentStudents({ page, q: term || undefined }),
    placeholderData: keepPreviousData,
  })

  const addStudent = (
    <Button asChild size="sm">
      <Link to="/portal/agent/students/new"><UserPlus className="size-4" /> {t("agentPortal.students.addStudent")}</Link>
    </Button>
  )

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <PageTitle title={t("agentPortal.students.title")} subtitle={t("agentPortal.students.subtitle")} />
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link to="/portal/agent/apply"><FilePlus2 className="size-4" /> {t("agentPortal.students.newApplication")}</Link>
          </Button>
          {addStudent}
        </div>
      </div>

      <div className="relative mb-3">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(e) => { setTerm(e.target.value); setPage(1) }}
          placeholder={t("agentPortal.picker.searchPlaceholder")}
          aria-label={t("agentPortal.picker.searchPlaceholder")}
          className="bg-card ps-9"
        />
      </div>

      {isPending && <ListSkeleton rows={4} />}
      {isError && <LoadError onRetry={refetch} />}

      {data && data.data.length === 0 && (
        <EmptyState
          icon={<GraduationCap className="mx-auto size-8" />}
          title={term ? t("agentPortal.picker.emptyMatchTitle") : t("agentPortal.students.emptyTitle")}
          hint={term ? t("agentPortal.picker.emptyMatchHint") : t("agentPortal.students.emptyHint")}
          action={term ? undefined : addStudent}
        />
      )}

      <div className="space-y-2">
        {data?.data.map((s) => (
          <PortalCard key={s.id} className="flex items-center gap-3">
            <Initials name={s.full_name} />

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{s.full_name}</p>
              <p className="truncate font-mono text-xs text-muted-foreground">
                {s.student_code}{s.country ? ` · ${s.country}` : ""} · {t("agentPortal.students.appCount", { count: s.applications_count })}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <StatusBadge status={s.status} map={STUDENT_BADGE} />
              <Button asChild variant="secondary" size="sm" className="gap-1">
                <Link to={`/portal/agent/apply?student=${s.id}&name=${encodeURIComponent(s.full_name)}`}>
                  <FilePlus2 className="size-4" />
                  <span className="max-sm:sr-only">{t("agentPortal.students.apply")}</span>
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

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { ClipboardList, FilePlus2, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useSearchParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { getAgentApplications, type AgentApplicationRow } from "@/features/portal/api"
import ApplicationTrack from "@/features/portal/ApplicationTrack"
import {
  EmptyState,
  ListSkeleton,
  LoadError,
  PageTitle,
  PortalCard,
  StatusBadge,
} from "@/features/portal/components"
import { APPLICATION_BADGE } from "@/features/portal/status"

const FILTERS = ["all", "draft", "under_review", "documents_pending", "submitted", "offer_received", "accepted", "rejected"] as const

/**
 * Every application the partner has made, grouped by student: one clear record per student, and inside it one card per
 * application (program, university, intake) with the full trail of where it has been. Unfinished drafts can be continued.
 */
export default function AgentApplications() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const studentId = Number(params.get("student")) || undefined
  const status = params.get("status") ?? "all"
  const page = Number(params.get("page")) || 1

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["agent", "applications", { studentId, status, page }],
    queryFn: () => getAgentApplications({ status: status === "all" ? undefined : status, studentId, page }),
    placeholderData: keepPreviousData,
  })

  const set = (next: Record<string, string | undefined>) => {
    const merged = new URLSearchParams(params)
    Object.entries(next).forEach(([k, v]) => (v ? merged.set(k, v) : merged.delete(k)))
    setParams(merged, { replace: true })
  }

  // Group by student so each student's record reads as one block.
  const groups = new Map<number, { name: string; code: string; items: AgentApplicationRow[] }>()
  data?.data.forEach((a) => {
    const id = a.student?.id ?? 0
    const group = groups.get(id) ?? { name: a.student?.full_name ?? "", code: a.student?.student_code ?? "", items: [] }
    group.items.push(a)
    groups.set(id, group)
  })

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageTitle title={t("agentPortal.applications.title", { defaultValue: "Applications" })} subtitle={t("agentPortal.applications.subtitle", { defaultValue: "Every application you have made, with where each one stands." })} />
        <Button asChild variant="secondary" size="sm" className="sm:shrink-0">
          <Link to="/portal/agent/apply"><FilePlus2 className="size-4" /> {t("agentPortal.students.newApplication")}</Link>
        </Button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label={t("agentPortal.applications.filterLabel", { defaultValue: "Filter by status" })}>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={status === f}
            onClick={() => set({ status: f === "all" ? undefined : f, page: undefined })}
            className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${status === f ? "border-cas-navy bg-cas-navy text-white" : "bg-card text-muted-foreground hover:bg-muted"}`}
          >
            {f === "all" ? t("agentPortal.applications.all", { defaultValue: "All" }) : f.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {studentId && (
        <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-cas-navy-50 px-3 py-1 text-xs text-cas-navy">
          {t("agentPortal.applications.forStudent", { defaultValue: "Showing one student" })}
          <button type="button" onClick={() => set({ student: undefined, page: undefined })} aria-label={t("agentPortal.applications.showAll", { defaultValue: "Show all students" })}>
            <X className="size-3.5" />
          </button>
        </p>
      )}

      {isPending && <ListSkeleton rows={3} />}
      {isError && <LoadError onRetry={refetch} />}

      {data && data.data.length === 0 && (
        <EmptyState
          icon={<ClipboardList className="mx-auto size-8" />}
          title={t("agentPortal.applications.emptyTitle", { defaultValue: "No applications yet" })}
          hint={t("agentPortal.applications.emptyHint", { defaultValue: "Start an application for one of your students and it will be tracked here." })}
        />
      )}

      <div className="space-y-6">
        {[...groups.entries()].map(([id, group]) => (
          <section key={id} aria-label={group.name}>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold">{group.name} <span className="font-mono text-xs font-normal text-muted-foreground">{group.code}</span></h2>
              <span className="text-xs text-muted-foreground">{t("agentPortal.students.appCount", { count: group.items.length })}</span>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {group.items.map((a) => (
                <PortalCard key={a.id} className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{a.program?.name ?? a.application_code}</p>
                      <p className="text-sm text-muted-foreground">{a.university}{a.intake ? ` · ${a.intake}` : ""}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{a.application_code}</p>
                    </div>
                    <StatusBadge status={a.status} map={APPLICATION_BADGE} />
                  </div>

                  {a.status === "draft" && a.program && (
                    <Button asChild size="sm" className="self-start">
                      <Link to={`/portal/agent/apply?draft=${a.id}`}>{t("agentPortal.applications.continue", { defaultValue: "Continue this application" })}</Link>
                    </Button>
                  )}

                  <ApplicationTrack steps={a.progress ?? []} />
                </PortalCard>
              ))}
            </div>
          </section>
        ))}
      </div>

      {data && data.meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>{t("agentPortal.students.paginationRange", { from: data.meta.from, to: data.meta.to, total: data.meta.total })}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={data.meta.current_page <= 1} onClick={() => set({ page: String(page - 1) })}>{t("agentPortal.students.prev")}</Button>
            <Button variant="secondary" size="sm" disabled={data.meta.current_page >= data.meta.last_page} onClick={() => set({ page: String(page + 1) })}>{t("agentPortal.students.next")}</Button>
          </div>
        </div>
      )}
    </div>
  )
}

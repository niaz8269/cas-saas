import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Check, GraduationCap, Search } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getAgentStudents, type AgentStudentRow } from "@/features/portal/api"
import { EmptyState, ListSkeleton, LoadError } from "@/features/portal/components"
import { cn } from "@/lib/utils"

export interface PickedStudent {
  id: number
  name: string
}

/**
 * Shared first step of the agent apply-on-behalf wizards: search + paginate the
 * agent's OWN students and pick one. The backend scopes /agent/students to the
 * acting agent, so this only ever surfaces students they may apply for.
 */
export function AgentStudentPicker({ selectedId, onSelect }: {
  selectedId: number | null
  onSelect: (s: PickedStudent) => void
}) {
  const { t } = useTranslation()
  const [term, setTerm] = useState("")
  const [page, setPage] = useState(1)

  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["agent", "students", "picker", { term, page }],
    queryFn: () => getAgentStudents({ q: term || undefined, page }),
    placeholderData: keepPreviousData,
  })

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t("agentPortal.picker.prompt")}</p>

      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={term}
          onChange={(e) => { setTerm(e.target.value); setPage(1) }}
          placeholder={t("agentPortal.picker.searchPlaceholder")}
          className="pl-9"
        />
      </div>

      {isPending && <ListSkeleton rows={4} />}
      {isError && <LoadError onRetry={refetch} />}

      {data && data.data.length === 0 && (
        <EmptyState
          icon={<GraduationCap className="mx-auto size-8" />}
          title={term ? t("agentPortal.picker.emptyMatchTitle") : t("agentPortal.picker.emptyTitle")}
          hint={term ? t("agentPortal.picker.emptyMatchHint") : t("agentPortal.picker.emptyHint")}
        />
      )}

      <div className="space-y-2">
        {data?.data.map((s: AgentStudentRow) => {
          const active = selectedId === s.id

          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect({ id: s.id, name: s.full_name })}
              className={cn(
                "w-full rounded-xl border bg-card p-4 text-left shadow-sm transition-colors",
                active ? "border-cas-navy ring-1 ring-cas-navy" : "hover:border-cas-navy/40",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{s.full_name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {s.student_code}{s.country ? ` · ${s.country}` : ""} · {t("agentPortal.picker.appCount", { count: s.applications_count })}
                  </p>
                </div>
                {active && <Check className="size-5 shrink-0 text-cas-navy" />}
              </div>
            </button>
          )
        })}
      </div>

      {data && data.meta.last_page > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{t("agentPortal.picker.paginationRange", { from: data.meta.from, to: data.meta.to, total: data.meta.total })}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={data.meta.current_page <= 1} onClick={() => setPage((p) => p - 1)}>{t("agentPortal.picker.prev")}</Button>
            <Button variant="secondary" size="sm" disabled={data.meta.current_page >= data.meta.last_page} onClick={() => setPage((p) => p + 1)}>{t("agentPortal.picker.next")}</Button>
          </div>
        </div>
      )}
    </div>
  )
}

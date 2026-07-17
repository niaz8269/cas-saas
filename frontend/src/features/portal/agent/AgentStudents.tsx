import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { GraduationCap } from "lucide-react"

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

export default function AgentStudents() {
  const [page, setPage] = useState(1)
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["agent", "students", { page }],
    queryFn: () => getAgentStudents({ page }),
    placeholderData: keepPreviousData,
  })

  return (
    <div>
      <PageTitle title="My students" subtitle="Students you have referred to CAS" />

      {isPending && <ListSkeleton rows={4} />}
      {isError && <LoadError onRetry={refetch} />}

      {data && data.data.length === 0 && (
        <EmptyState icon={<GraduationCap className="mx-auto size-8" />} title="No students yet"
          hint="Students you submit will appear here." />
      )}

      <div className="space-y-2">
        {data?.data.map((s) => (
          <PortalCard key={s.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{s.full_name}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {s.student_code}{s.country ? ` · ${s.country}` : ""} · {s.applications_count} app(s)
              </p>
            </div>
            <StatusBadge status={s.status} map={STUDENT_BADGE} />
          </PortalCard>
        ))}
      </div>

      {data && data.meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>{data.meta.from}–{data.meta.to} of {data.meta.total}</span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={data.meta.current_page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <Button variant="secondary" size="sm" disabled={data.meta.current_page >= data.meta.last_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}

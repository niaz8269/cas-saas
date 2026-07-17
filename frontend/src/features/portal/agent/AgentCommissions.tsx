import { useQuery } from "@tanstack/react-query"
import { Wallet } from "lucide-react"

import { getAgentCommissions } from "@/features/portal/api"
import {
  EmptyState,
  ListSkeleton,
  LoadError,
  PageTitle,
  PortalCard,
  StatusBadge,
} from "@/features/portal/components"
import { PAYABLE_BADGE, money } from "@/features/portal/status"

export default function AgentCommissions() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["agent", "commissions", { page: 1 }],
    queryFn: () => getAgentCommissions(),
  })

  const payable = data?.totals?.payable ?? 0
  const paid = data?.totals?.paid ?? 0

  return (
    <div>
      <PageTitle title="My earnings" subtitle="Your commission share on CAS placements" />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <PortalCard>
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Awaiting payout</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-cas-navy">{money(payable)}</p>
        </PortalCard>
        <PortalCard>
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Paid to date</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-green-700">{money(paid)}</p>
        </PortalCard>
      </div>

      {isPending && <ListSkeleton rows={4} />}
      {isError && <LoadError onRetry={refetch} />}

      {data && data.data.length === 0 && (
        <EmptyState icon={<Wallet className="mx-auto size-8" />} title="No earnings yet"
          hint="Your share appears once a placement's commission is received." />
      )}

      <div className="space-y-2">
        {data?.data.map((p) => (
          <PortalCard key={p.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{p.student?.full_name ?? "—"}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {p.student?.student_code}{p.university ? ` · ${p.university}` : ""}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm font-semibold tabular-nums">{money(p.amount, p.currency)}</span>
              <StatusBadge status={p.status} map={PAYABLE_BADGE} />
            </div>
          </PortalCard>
        ))}
      </div>
    </div>
  )
}

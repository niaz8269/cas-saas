import { useMutation, useQuery } from "@tanstack/react-query"
import { Download, Wallet } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { getAgentCommissions, getAgentStatementPdf } from "@/features/portal/api"
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
  const { t } = useTranslation()
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["agent", "commissions", { page: 1 }],
    queryFn: () => getAgentCommissions(),
  })

  const statement = useMutation({
    mutationFn: getAgentStatementPdf,
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob)
      window.open(url, "_blank", "noopener")
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    },
  })

  const payable = data?.totals?.payable ?? 0
  const paid = data?.totals?.paid ?? 0

  return (
    <div>
      <PageTitle title={t("agentPortal.commissions.title")} subtitle={t("agentPortal.commissions.subtitle")} />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <PortalCard>
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{t("agentPortal.commissions.awaitingPayout")}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-cas-navy">{money(payable)}</p>
        </PortalCard>
        <PortalCard>
          <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{t("agentPortal.commissions.paidToDate")}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-green-700">{money(paid)}</p>
        </PortalCard>
      </div>

      {data && data.data.length > 0 && (
        <Button
          type="button"
          variant="secondary"
          className="mb-4 h-11 w-full"
          disabled={statement.isPending}
          onClick={() => statement.mutate()}
        >
          <Download className="size-4" />
          {statement.isPending ? t("agentPortal.commissions.preparing") : t("agentPortal.commissions.downloadStatement")}
        </Button>
      )}

      {isPending && <ListSkeleton rows={4} />}
      {isError && <LoadError onRetry={refetch} />}

      {data && data.data.length === 0 && (
        <EmptyState icon={<Wallet className="mx-auto size-8" />} title={t("agentPortal.commissions.emptyTitle")}
          hint={t("agentPortal.commissions.emptyHint")} />
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

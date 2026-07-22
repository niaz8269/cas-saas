import { useQuery } from "@tanstack/react-query"
import { Award, GraduationCap, Plus, Wallet } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { getAgentCommissions, getAgentStudents } from "@/features/portal/api"
import { ListSkeleton, PageTitle, PortalCard } from "@/features/portal/components"
import { money } from "@/features/portal/status"
import { usePortalAuthStore } from "@/stores/portalAuth"

export default function AgentHome() {
  const { t } = useTranslation()
  const profile = usePortalAuthStore((s) => s.profile)

  const students = useQuery({ queryKey: ["agent", "students", { page: 1 }], queryFn: () => getAgentStudents() })
  const commissions = useQuery({ queryKey: ["agent", "commissions", { page: 1 }], queryFn: () => getAgentCommissions() })

  const payable = commissions.data?.totals?.payable ?? 0
  const paid = commissions.data?.totals?.paid ?? 0

  return (
    <div className="space-y-4">
      <PageTitle title={t("agentPortal.home.greeting", { name: profile?.name?.split(" ")[0] ?? t("agentPortal.home.greetingFallback") })} subtitle={t("agentPortal.home.subtitle")} />

      <Button asChild className="h-12 w-full text-base">
        <Link to="/portal/agent/apply"><Plus className="size-5" /> {t("agentPortal.home.applyForStudent")}</Link>
      </Button>
      <Button asChild variant="secondary" className="h-11 w-full">
        <Link to="/portal/agent/apply-scholarship"><Award className="size-4" /> {t("agentPortal.home.governmentScholarship")}</Link>
      </Button>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/portal/agent/students">
          <PortalCard>
            <GraduationCap className="size-5 text-cas-navy" />
            <p className="mt-2 text-2xl font-semibold tabular-nums">{students.data?.meta.total ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{t("agentPortal.home.students")}</p>
          </PortalCard>
        </Link>
        <Link to="/portal/agent/commissions">
          <PortalCard>
            <Wallet className="size-5 text-cas-navy" />
            <p className="mt-2 text-2xl font-semibold tabular-nums">{money(payable)}</p>
            <p className="text-xs text-muted-foreground">{t("agentPortal.home.awaitingPayout")}</p>
          </PortalCard>
        </Link>
      </div>

      <PortalCard>
        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{t("agentPortal.home.earningsToDate")}</p>
        <p className="mt-1 text-lg font-semibold tabular-nums text-cas-navy">{t("agentPortal.home.paidAmount", { amount: money(paid) })}</p>
        <p className="text-sm text-muted-foreground tabular-nums">{t("agentPortal.home.stillToCome", { amount: money(payable) })}</p>
      </PortalCard>

      <div>
        <h2 className="mb-2 text-sm font-semibold">{t("agentPortal.home.recentStudents")}</h2>
        {students.isPending ? (
          <ListSkeleton rows={3} />
        ) : (
          <div className="space-y-2">
            {students.data?.data.slice(0, 4).map((s) => (
              <PortalCard key={s.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{s.full_name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{s.student_code}</p>
                </div>
                <span className="text-xs text-muted-foreground">{t("agentPortal.home.appCount", { count: s.applications_count })}</span>
              </PortalCard>
            ))}
            {students.data?.data.length === 0 && (
              <p className="text-sm text-muted-foreground">{t("agentPortal.home.noStudentsYet")}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

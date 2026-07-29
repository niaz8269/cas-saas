import { useQuery } from "@tanstack/react-query"
import { Award, FilePlus2, UserPlus } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { getAgentCommissions, getAgentStudents } from "@/features/portal/api"
import {
  ActionCard,
  Initials,
  ListSkeleton,
  PageTitle,
  PortalCard,
  StatTile,
  StatusBadge,
} from "@/features/portal/components"
import { money, STUDENT_BADGE } from "@/features/portal/status"
import { usePortalAuthStore } from "@/stores/portalAuth"

export default function AgentHome() {
  const { t } = useTranslation()
  const profile = usePortalAuthStore((s) => s.profile)

  const students = useQuery({ queryKey: ["agent", "students", { page: 1 }], queryFn: () => getAgentStudents() })
  const commissions = useQuery({ queryKey: ["agent", "commissions", { page: 1 }], queryFn: () => getAgentCommissions() })

  const payable = commissions.data?.totals?.payable ?? 0
  const paid = commissions.data?.totals?.paid ?? 0

  return (
    <div className="space-y-6">
      <PageTitle
        title={t("agentPortal.home.greeting", { name: profile?.name?.split(" ")[0] ?? t("agentPortal.home.greetingFallback") })}
        subtitle={t("agentPortal.home.subtitle")}
      />

      {/* What a partner comes here to do, in the order they do it. */}
      <div className="grid gap-3 lg:grid-cols-3">
        <ActionCard
          to="/portal/agent/apply"
          icon={FilePlus2}
          title={t("agentPortal.home.applyForStudent")}
          hint={t("agentPortal.home.applyHint")}
          primary
          className="lg:col-span-3"
        />
        <ActionCard
          to="/portal/agent/students/new"
          icon={UserPlus}
          title={t("agentPortal.students.addStudent")}
          hint={t("agentPortal.home.addStudentHint")}
        />
        <ActionCard
          to="/portal/agent/apply-scholarship"
          icon={Award}
          title={t("agentPortal.home.governmentScholarship")}
          hint={t("agentPortal.home.scholarshipHint")}
          className="lg:col-span-2"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatTile label={t("agentPortal.home.students")} value={students.data?.meta.total ?? "—"} />
        <StatTile label={t("agentPortal.home.awaitingPayout")} value={money(payable)} tone="money" />
        <StatTile label={t("agentPortal.commissions.paidToDate")} value={money(paid)} tone="positive" />
      </div>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold">{t("agentPortal.home.recentStudents")}</h2>
          <Link to="/portal/agent/students" className="text-xs font-medium text-cas-navy hover:underline">
            {t("agentPortal.home.viewAll")}
          </Link>
        </div>

        {students.isPending ? (
          <ListSkeleton rows={3} />
        ) : students.data?.data.length === 0 ? (
          <PortalCard>
            <p className="text-sm text-muted-foreground">{t("agentPortal.home.noStudentsYet")}</p>
          </PortalCard>
        ) : (
          <div className="space-y-2">
            {students.data?.data.slice(0, 4).map((s) => (
              <PortalCard key={s.id} className="flex items-center gap-3">
                <Initials name={s.full_name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.full_name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{s.student_code}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {t("agentPortal.home.appCount", { count: s.applications_count })}
                </span>
                <StatusBadge status={s.status} map={STUDENT_BADGE} />
              </PortalCard>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}


import { useQuery } from "@tanstack/react-query"
import { Award, GraduationCap, Plus, Wallet } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { getAgentCommissions, getAgentStudents } from "@/features/portal/api"
import { ListSkeleton, PageTitle, PortalCard } from "@/features/portal/components"
import { money } from "@/features/portal/status"
import { usePortalAuthStore } from "@/stores/portalAuth"

export default function AgentHome() {
  const profile = usePortalAuthStore((s) => s.profile)

  const students = useQuery({ queryKey: ["agent", "students", { page: 1 }], queryFn: () => getAgentStudents() })
  const commissions = useQuery({ queryKey: ["agent", "commissions", { page: 1 }], queryFn: () => getAgentCommissions() })

  const payable = commissions.data?.totals?.payable ?? 0
  const paid = commissions.data?.totals?.paid ?? 0

  return (
    <div className="space-y-4">
      <PageTitle title={`Hello, ${profile?.name?.split(" ")[0] ?? "there"}`} subtitle="Your CAS partner portal" />

      <Button asChild className="h-12 w-full text-base">
        <Link to="/portal/agent/apply"><Plus className="size-5" /> Apply for a student</Link>
      </Button>
      <Button asChild variant="secondary" className="h-11 w-full">
        <Link to="/portal/agent/apply-scholarship"><Award className="size-4" /> Government scholarship application</Link>
      </Button>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/portal/agent/students">
          <PortalCard>
            <GraduationCap className="size-5 text-cas-navy" />
            <p className="mt-2 text-2xl font-semibold tabular-nums">{students.data?.meta.total ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Students</p>
          </PortalCard>
        </Link>
        <Link to="/portal/agent/commissions">
          <PortalCard>
            <Wallet className="size-5 text-cas-navy" />
            <p className="mt-2 text-2xl font-semibold tabular-nums">{money(payable)}</p>
            <p className="text-xs text-muted-foreground">Awaiting payout</p>
          </PortalCard>
        </Link>
      </div>

      <PortalCard>
        <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Earnings to date</p>
        <p className="mt-1 text-lg font-semibold tabular-nums text-cas-navy">{money(paid)} paid</p>
        <p className="text-sm text-muted-foreground tabular-nums">{money(payable)} still to come</p>
      </PortalCard>

      <div>
        <h2 className="mb-2 text-sm font-semibold">Recent students</h2>
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
                <span className="text-xs text-muted-foreground">{s.applications_count} app(s)</span>
              </PortalCard>
            ))}
            {students.data?.data.length === 0 && (
              <p className="text-sm text-muted-foreground">No students yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

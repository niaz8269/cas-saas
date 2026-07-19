import { useQuery } from "@tanstack/react-query"
import { Award, FileText, Plane, Plus, Receipt, Upload } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { getStudentApplications, getStudentInvoices } from "@/features/portal/api"
import { PageTitle, PortalCard, StatusBadge } from "@/features/portal/components"
import { APPLICATION_BADGE, money } from "@/features/portal/status"
import { usePortalAuthStore } from "@/stores/portalAuth"

export default function StudentHome() {
  const profile = usePortalAuthStore((s) => s.profile)

  const apps = useQuery({ queryKey: ["student", "applications"], queryFn: getStudentApplications })
  const invoices = useQuery({ queryKey: ["student", "invoices"], queryFn: getStudentInvoices })

  const latest = apps.data?.data[0]
  const outstanding = (invoices.data?.data ?? []).reduce(
    (sum, i) => sum + (Number(i.total) - Number(i.amount_paid)), 0,
  )
  const currency = invoices.data?.data[0]?.currency

  return (
    <div className="space-y-4">
      <PageTitle title={`Hi, ${profile?.name?.split(" ")[0] ?? "there"}`} subtitle={`Student ${profile?.code ?? ""}`} />

      <Button asChild className="h-12 w-full text-base">
        <Link to="/portal/student/apply"><Plus className="size-5" /> Start a new application</Link>
      </Button>
      <Button asChild variant="secondary" className="h-11 w-full">
        <Link to="/portal/student/apply-scholarship"><Award className="size-4" /> Apply for a Government Scholarship</Link>
      </Button>

      {latest && (
        <PortalCard>
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">Latest application</p>
            <StatusBadge status={latest.status} map={APPLICATION_BADGE} />
          </div>
          <p className="mt-1 text-sm font-medium">{latest.program?.name ?? latest.application_code}</p>
          <p className="text-sm text-muted-foreground">{latest.university}</p>
        </PortalCard>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link to="/portal/student/applications">
          <PortalCard>
            <FileText className="size-5 text-cas-navy" />
            <p className="mt-2 text-2xl font-semibold tabular-nums">{apps.data?.data.length ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Applications</p>
          </PortalCard>
        </Link>
        <Link to="/portal/student/invoices">
          <PortalCard>
            <Receipt className="size-5 text-cas-navy" />
            <p className="mt-2 text-2xl font-semibold tabular-nums">{money(outstanding, currency)}</p>
            <p className="text-xs text-muted-foreground">Outstanding fees</p>
          </PortalCard>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/portal/student/visa">
          <PortalCard className="flex items-center gap-3">
            <Plane className="size-5 text-cas-navy" />
            <span className="text-sm font-medium">Visa status</span>
          </PortalCard>
        </Link>
        <Link to="/portal/student/documents">
          <PortalCard className="flex items-center gap-3">
            <Upload className="size-5 text-cas-navy" />
            <span className="text-sm font-medium">Upload docs</span>
          </PortalCard>
        </Link>
      </div>
    </div>
  )
}

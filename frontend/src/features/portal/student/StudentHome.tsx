import { useQuery } from "@tanstack/react-query"
import { Award, Plane, Plus, Upload } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { getStudentApplications, getStudentInvoices } from "@/features/portal/api"
import { ActionCard, PageTitle, PortalCard, StatTile, StatusBadge } from "@/features/portal/components"
import { APPLICATION_BADGE, money } from "@/features/portal/status"
import { usePortalAuthStore } from "@/stores/portalAuth"

export default function StudentHome() {
  const { t } = useTranslation()
  const profile = usePortalAuthStore((s) => s.profile)

  const apps = useQuery({ queryKey: ["student", "applications"], queryFn: getStudentApplications })
  const invoices = useQuery({ queryKey: ["student", "invoices"], queryFn: getStudentInvoices })

  const latest = apps.data?.data[0]
  const outstanding = (invoices.data?.data ?? []).reduce(
    (sum, i) => sum + (Number(i.total) - Number(i.amount_paid)), 0,
  )
  const currency = invoices.data?.data[0]?.currency
  const firstName = profile?.name?.split(" ")[0] ?? t("studentPortal.home.greetingFallbackName")

  return (
    <div className="space-y-6">
      <PageTitle
        title={t("studentPortal.home.greeting", { name: firstName })}
        subtitle={t("studentPortal.home.studentCode", { code: profile?.code ?? "" })}
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <ActionCard
          to="/portal/student/apply"
          icon={Plus}
          title={t("studentPortal.home.startNewApplication")}
          hint={t("studentPortal.home.applyHint")}
          primary
          className="lg:col-span-2"
        />
        <ActionCard
          to="/portal/student/apply-scholarship"
          icon={Award}
          title={t("studentPortal.home.applyScholarship")}
          hint={t("studentPortal.home.scholarshipHint")}
        />
        <ActionCard
          to="/portal/student/documents"
          icon={Upload}
          title={t("studentPortal.home.uploadDocs")}
          hint={t("studentPortal.home.documentsHint")}
        />
      </div>

      {latest && (
        <PortalCard>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
              {t("studentPortal.home.latestApplication")}
            </p>
            <StatusBadge status={latest.status} map={APPLICATION_BADGE} />
          </div>
          <p className="mt-1 text-sm font-medium">{latest.program?.name ?? latest.application_code}</p>
          <p className="text-sm text-muted-foreground">{latest.university}</p>
          <Link to="/portal/student/applications" className="mt-2 inline-block text-xs font-medium text-cas-navy hover:underline">
            {t("studentPortal.home.viewAll")}
          </Link>
        </PortalCard>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Link to="/portal/student/applications" className="rounded-xl transition-opacity hover:opacity-90">
          <StatTile label={t("studentPortal.home.applications")} value={apps.data?.data.length ?? "—"} />
        </Link>
        <Link to="/portal/student/invoices" className="rounded-xl transition-opacity hover:opacity-90">
          <StatTile label={t("studentPortal.home.outstandingFees")} value={money(outstanding, currency)} tone="money" />
        </Link>
        <Link to="/portal/student/visa" className="max-lg:col-span-2 rounded-xl transition-opacity hover:opacity-90">
          <PortalCard className="flex h-full items-center gap-3 p-3">
            <Plane className="size-5 shrink-0 text-cas-navy" aria-hidden="true" />
            <span className="text-sm font-medium">{t("studentPortal.home.visaStatus")}</span>
          </PortalCard>
        </Link>
      </div>
    </div>
  )
}

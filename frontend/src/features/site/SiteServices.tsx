import {
  ArrowRight,
  Award,
  BookOpen,
  Clock,
  Globe,
  GraduationCap,
  Headphones,
  HeartHandshake,
  PlaneLanding,
  ShieldCheck,
  Stamp,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { SitePageHeader, SiteSection } from "@/features/site/components"
import { useSeo } from "@/lib/seo"

// Display text lives in i18n keys resolved via t() at render (report — 5-language support).
const WHY: { icon: LucideIcon; titleKey: string; bodyKey: string }[] = [
  { icon: ShieldCheck, titleKey: "services.why.authorizedAgent.title", bodyKey: "services.why.authorizedAgent.body" },
  { icon: Wallet, titleKey: "services.why.freeToStart.title", bodyKey: "services.why.freeToStart.body" },
  { icon: HeartHandshake, titleKey: "services.why.dedicatedAdvisor.title", bodyKey: "services.why.dedicatedAdvisor.body" },
  { icon: Clock, titleKey: "services.why.fastApplications.title", bodyKey: "services.why.fastApplications.body" },
  { icon: Award, titleKey: "services.why.admissionRecord.title", bodyKey: "services.why.admissionRecord.body" },
  { icon: Globe, titleKey: "services.why.supportAfterArrival.title", bodyKey: "services.why.supportAfterArrival.body" },
]

const SERVICES: { icon: LucideIcon; titleKey: string; bodyKey: string }[] = [
  { icon: GraduationCap, titleKey: "services.items.admission.title", bodyKey: "services.items.admission.body" },
  { icon: Stamp, titleKey: "services.items.visa.title", bodyKey: "services.items.visa.body" },
  { icon: PlaneLanding, titleKey: "services.items.airportPickup.title", bodyKey: "services.items.airportPickup.body" },
  { icon: Headphones, titleKey: "services.items.onCampus.title", bodyKey: "services.items.onCampus.body" },
  { icon: Wallet, titleKey: "services.items.scholarship.title", bodyKey: "services.items.scholarship.body" },
  { icon: BookOpen, titleKey: "services.items.language.title", bodyKey: "services.items.language.body" },
]

export default function SiteServices() {
  const { t } = useTranslation()

  useSeo({
    title: t("services.seoTitle"),
    description: t("services.seoDescription"),
    canonicalPath: "/site/services",
  })

  return (
    <div className="space-y-12">
      <SitePageHeader
        eyebrow={t("services.eyebrow")}
        title={t("services.title")}
        subtitle={t("services.subtitle")}
      />

      <SiteSection title={t("services.whatWeDoTitle")} subtitle={t("services.whatWeDoSubtitle")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map(({ icon: Icon, titleKey, bodyKey }) => (
            <div key={titleKey} className="rounded-sm border bg-card p-6 shadow-sm">
              <span className="inline-flex size-11 items-center justify-center rounded-sm bg-cas-red-50 text-cas-red-600"><Icon className="size-5" /></span>
              <h3 className="mt-4 font-semibold text-cas-navy">{t(titleKey)}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{t(bodyKey)}</p>
            </div>
          ))}
        </div>
      </SiteSection>

      {/* Trust stats */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[["13+", t("services.stats.yearsExperience")], ["13K+", t("services.stats.studentsPlaced")], ["200+", t("services.stats.universityPartners")], ["98%", t("services.stats.visaSuccessRate")]].map(([v, l]) => (
          <div key={l} className="rounded-sm border bg-card p-5 text-center shadow-sm">
            <p className="text-3xl font-bold text-cas-navy tabular-nums">{v}</p>
            <p className="mt-1 text-xs text-muted-foreground">{l}</p>
          </div>
        ))}
      </section>

      <SiteSection title={t("services.whyChooseTitle")} subtitle={t("services.whyChooseSubtitle")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WHY.map(({ icon: Icon, titleKey, bodyKey }) => (
            <div key={titleKey} className="rounded-sm border bg-card p-6 shadow-sm">
              <span className="inline-flex size-11 items-center justify-center rounded-sm bg-cas-navy-50 text-cas-navy"><Icon className="size-5" /></span>
              <h3 className="mt-4 font-semibold text-cas-navy">{t(titleKey)}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{t(bodyKey)}</p>
            </div>
          ))}
        </div>
      </SiteSection>

      <section className="flex flex-col items-start justify-between gap-4 rounded-sm bg-cas-navy p-8 text-white sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold">{t("services.ctaTitle")}</h2>
          <p className="mt-1 text-sm text-white/80">{t("services.ctaSubtitle")}</p>
        </div>
        <Link to="/site/contact" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-sm bg-cas-red px-6 text-sm font-semibold text-white hover:bg-cas-red-600">
          {t("services.ctaButton")} <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
  )
}

import { ArrowRight, Award, Banknote, Building2, Handshake, LineChart, Megaphone, type LucideIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { SitePageHeader, SiteSection } from "@/features/site/components"
import { useSeo } from "@/lib/seo"

// Display text carried as i18n KEY strings, resolved via t() at render.
const BENEFITS: { icon: LucideIcon; titleKey: string; bodyKey: string }[] = [
  { icon: Building2, titleKey: "partner.benefitUniversitiesTitle", bodyKey: "partner.benefitUniversitiesBody" },
  { icon: Banknote, titleKey: "partner.benefitCommissionsTitle", bodyKey: "partner.benefitCommissionsBody" },
  { icon: LineChart, titleKey: "partner.benefitPortalTitle", bodyKey: "partner.benefitPortalBody" },
  { icon: Megaphone, titleKey: "partner.benefitMarketingTitle", bodyKey: "partner.benefitMarketingBody" },
  { icon: Award, titleKey: "partner.benefitAuthorizedTitle", bodyKey: "partner.benefitAuthorizedBody" },
  { icon: Handshake, titleKey: "partner.benefitTeamTitle", bodyKey: "partner.benefitTeamBody" },
]

const STEPS = [
  { n: 1, titleKey: "partner.step1Title", bodyKey: "partner.step1Body" },
  { n: 2, titleKey: "partner.step2Title", bodyKey: "partner.step2Body" },
  { n: 3, titleKey: "partner.step3Title", bodyKey: "partner.step3Body" },
]

export default function SitePartner() {
  const { t } = useTranslation()
  useSeo({
    title: t("partner.seoTitle"),
    description: t("partner.seoDescription"),
    canonicalPath: "/site/partner",
  })

  return (
    <div className="space-y-12">
      <SitePageHeader
        eyebrow={t("partner.headerEyebrow")}
        title={t("partner.headerTitle")}
        subtitle={t("partner.headerSubtitle")}
        action={
          <Link to="/site/contact" className="inline-flex h-11 items-center gap-2 rounded-sm bg-cas-red px-6 text-sm font-semibold text-white hover:bg-cas-red-600">
            {t("partner.becomePartner")} <ArrowRight className="size-4" />
          </Link>
        }
      />

      <SiteSection title={t("partner.whyTitle")} subtitle={t("partner.whySubtitle")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, titleKey, bodyKey }) => (
            <div key={titleKey} className="rounded-sm border bg-card p-6 shadow-sm">
              <span className="inline-flex size-11 items-center justify-center rounded-sm bg-cas-red-50 text-cas-red-600"><Icon className="size-5" /></span>
              <h3 className="mt-4 font-semibold text-cas-navy">{t(titleKey)}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{t(bodyKey)}</p>
            </div>
          ))}
        </div>
      </SiteSection>

      <SiteSection title={t("partner.howTitle")}>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-sm border bg-card p-6 shadow-sm">
              <span className="flex size-9 items-center justify-center rounded-full bg-cas-navy font-sans text-lg font-bold text-white">{s.n}</span>
              <h3 className="mt-3 font-semibold text-cas-navy">{t(s.titleKey)}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{t(s.bodyKey)}</p>
            </li>
          ))}
        </ol>
      </SiteSection>

      <section className="flex flex-col items-start justify-between gap-4 rounded-sm bg-cas-navy p-8 text-white sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold">{t("partner.ctaTitle")}</h2>
          <p className="mt-1 text-sm text-white/80">{t("partner.ctaSubtitle")}</p>
        </div>
        <Link to="/site/contact" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-sm bg-cas-red px-6 text-sm font-semibold text-white hover:bg-cas-red-600">
          {t("partner.becomePartner")} <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
  )
}

import { ArrowRight, BadgeCheck, ReceiptText, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { SitePageHeader, SiteSection } from "@/features/site/components"
import { useSeo } from "@/lib/seo"

// Display text carried as i18n KEY strings, resolved via t() at render.
const PRINCIPLES: { icon: LucideIcon; titleKey: string; bodyKey: string }[] = [
  { icon: Sparkles, titleKey: "pricing.principleFreeTitle", bodyKey: "pricing.principleFreeBody" },
  { icon: ReceiptText, titleKey: "pricing.principleTransparentTitle", bodyKey: "pricing.principleTransparentBody" },
  { icon: ShieldCheck, titleKey: "pricing.principleOnlyPayTitle", bodyKey: "pricing.principleOnlyPayBody" },
]

const FREE = [
  "pricing.free1",
  "pricing.free2",
  "pricing.free3",
  "pricing.free4",
]

const QUOTED = [
  "pricing.quoted1",
  "pricing.quoted2",
  "pricing.quoted3",
  "pricing.quoted4",
  "pricing.quoted5",
]

export default function SitePricing() {
  const { t } = useTranslation()
  useSeo({
    title: t("pricing.seoTitle"),
    description: t("pricing.seoDescription"),
    canonicalPath: "/site/pricing",
  })

  return (
    <div className="space-y-12">
      <SitePageHeader
        eyebrow={t("pricing.headerEyebrow")}
        title={t("pricing.headerTitle")}
        subtitle={t("pricing.headerSubtitle")}
      />

      <SiteSection title={t("pricing.howTitle")}>
        <div className="grid gap-4 sm:grid-cols-3">
          {PRINCIPLES.map(({ icon: Icon, titleKey, bodyKey }) => (
            <div key={titleKey} className="rounded-sm border bg-card p-6 shadow-sm">
              <span className="inline-flex size-11 items-center justify-center rounded-sm bg-cas-red-50 text-cas-red-600"><Icon className="size-5" /></span>
              <h3 className="mt-4 font-semibold text-cas-navy">{t(titleKey)}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{t(bodyKey)}</p>
            </div>
          ))}
        </div>
      </SiteSection>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-sm border-2 border-cas-red bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-cas-red px-2.5 py-0.5 text-[11px] font-bold text-white uppercase">{t("pricing.freeBadge")}</span>
            <h3 className="font-semibold text-cas-navy">{t("pricing.freeCardTitle")}</h3>
          </div>
          <ul className="mt-4 space-y-2.5">
            {FREE.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <BadgeCheck className="mt-0.5 size-4 shrink-0 text-cas-red-600" /> {t(f)}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-sm border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-cas-navy-50 px-2.5 py-0.5 text-[11px] font-bold text-cas-navy uppercase">{t("pricing.quotedBadge")}</span>
            <h3 className="font-semibold text-cas-navy">{t("pricing.quotedCardTitle")}</h3>
          </div>
          <ul className="mt-4 space-y-2.5">
            {QUOTED.map((q) => (
              <li key={q} className="flex items-start gap-2 text-sm text-muted-foreground">
                <ReceiptText className="mt-0.5 size-4 shrink-0 text-cas-navy" /> {t(q)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="flex flex-col items-start justify-between gap-4 rounded-sm bg-cas-navy p-8 text-white sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold">{t("pricing.ctaTitle")}</h2>
          <p className="mt-1 text-sm text-white/80">{t("pricing.ctaSubtitle")}</p>
        </div>
        <Link to="/site/study-plan" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-sm bg-cas-red px-6 text-sm font-semibold text-white hover:bg-cas-red-600">
          {t("pricing.ctaButton")} <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
  )
}

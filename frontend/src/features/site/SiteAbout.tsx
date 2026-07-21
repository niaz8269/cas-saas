import { ArrowRight, BadgeCheck, Compass, FileCheck2, GraduationCap, Plane, Sparkles, Users } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { SitePageHeader, SiteSection } from "@/features/site/components"
import { useSeo } from "@/lib/seo"

// Display text carried as i18n KEY strings, resolved via t() at render.
const STEPS = [
  { icon: Compass, titleKey: "about.stepChooseTitle", bodyKey: "about.stepChooseBody" },
  { icon: FileCheck2, titleKey: "about.stepApplyTitle", bodyKey: "about.stepApplyBody" },
  { icon: BadgeCheck, titleKey: "about.stepOfferTitle", bodyKey: "about.stepOfferBody" },
  { icon: Plane, titleKey: "about.stepArriveTitle", bodyKey: "about.stepArriveBody" },
]

const WHY_CHINA = [
  "about.whyPoint1",
  "about.whyPoint2",
  "about.whyPoint3",
  "about.whyPoint4",
]

const STATS: [string, string][] = [
  ["13+", "about.statYears"],
  ["13K+", "about.statStudents"],
  ["200+", "about.statPartners"],
  ["100%", "about.statSupport"],
]

export default function SiteAbout() {
  const { t } = useTranslation()
  useSeo({
    title: t("about.seoTitle"),
    description: t("about.seoDescription"),
    canonicalPath: "/site/about",
  })

  return (
    <div className="space-y-12">
      <SitePageHeader
        eyebrow={t("about.headerEyebrow")}
        title={t("about.headerTitle")}
        subtitle={t("about.headerSubtitle")}
      />

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STATS.map(([v, l]) => (
          <div key={l} className="rounded-sm border bg-card p-5 text-center shadow-sm">
            <p className="text-3xl font-bold text-cas-navy tabular-nums">{v}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t(l)}</p>
          </div>
        ))}
      </section>

      {/* Why China */}
      <SiteSection title={t("about.whyTitle")} subtitle={t("about.whySubtitle")}>
        <ul className="grid gap-3 sm:grid-cols-2">
          {WHY_CHINA.map((point) => (
            <li key={point} className="flex items-start gap-3 rounded-sm border bg-card p-4 text-sm shadow-sm">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-cas-navy" />
              <span>{t(point)}</span>
            </li>
          ))}
        </ul>
      </SiteSection>

      {/* How we help */}
      <SiteSection title={t("about.helpTitle")} subtitle={t("about.helpSubtitle")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, titleKey, bodyKey }, i) => (
            <div key={titleKey} className="rounded-sm border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-9 items-center justify-center rounded-sm bg-cas-navy-50 text-cas-navy"><Icon className="size-5" /></span>
                <span className="text-xs font-semibold text-muted-foreground">{t("about.stepLabel", { number: i + 1 })}</span>
              </div>
              <h3 className="mt-3 font-semibold">{t(titleKey)}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t(bodyKey)}</p>
            </div>
          ))}
        </div>
      </SiteSection>

      {/* Mission band */}
      <section className="flex flex-col items-start gap-4 rounded-sm border bg-cas-navy-50 p-6 sm:flex-row sm:items-center sm:p-8">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-sm bg-cas-navy text-white"><Users className="size-5" /></span>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-cas-navy">{t("about.missionLabel")}</span> {t("about.missionText")}
        </p>
      </section>

      {/* CTA */}
      <section className="rounded-sm border bg-card p-8 text-center shadow-sm sm:p-10">
        <GraduationCap className="mx-auto size-8 text-cas-navy" />
        <h2 className="mt-3 text-2xl font-semibold text-cas-navy">{t("about.ctaTitle")}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{t("about.ctaSubtitle")}</p>
        <Link to="/site/contact" className="mt-5 inline-flex h-11 items-center gap-2 rounded-sm bg-cas-navy px-6 text-sm font-semibold text-white hover:bg-cas-navy-700">
          {t("about.ctaButton")} <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
  )
}

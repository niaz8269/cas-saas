import { ArrowRight, Award, Building2, Coins, GraduationCap, Globe2, Landmark, Sparkles, type LucideIcon } from "lucide-react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { getSiteStats } from "@/features/site/api"
import { SitePageHeader, SiteSection } from "@/features/site/components"
import { useSeo } from "@/lib/seo"
import PageFaqs from "@/features/site/SiteFaqs"

// Display text lives in i18n keys resolved via t() at render (report — 5-language support).
const REASONS: { icon: LucideIcon; titleKey: string; bodyKey: string }[] = [
  { icon: Award, titleKey: "whyChina.reasons.worldRanked.title", bodyKey: "whyChina.reasons.worldRanked.body" },
  { icon: Globe2, titleKey: "whyChina.reasons.englishTaught.title", bodyKey: "whyChina.reasons.englishTaught.body" },
  { icon: Coins, titleKey: "whyChina.reasons.affordable.title", bodyKey: "whyChina.reasons.affordable.body" },
  { icon: Building2, titleKey: "whyChina.reasons.opportunity.title", bodyKey: "whyChina.reasons.opportunity.body" },
  { icon: Landmark, titleKey: "whyChina.reasons.culture.title", bodyKey: "whyChina.reasons.culture.body" },
  { icon: GraduationCap, titleKey: "whyChina.reasons.recognised.title", bodyKey: "whyChina.reasons.recognised.body" },
]

export default function SiteWhyChina() {
  const { t } = useTranslation()
  // Counted from the live catalog, so the numbers never go out of date; a dash shows while they load.
  const { data: stats } = useQuery({ queryKey: ["site-stats"], queryFn: getSiteStats, staleTime: 30 * 60 * 1000 })
  const n = (value: number | undefined) => (typeof value === "number" ? value.toLocaleString("en-US") : "\u2014")
  const s = stats?.data

  useSeo({
    title: t("whyChina.seoTitle"),
    description: t("whyChina.seoDescription"),
    canonicalPath: "/site/why-china",
  })

  return (
    <div className="space-y-12">
      <SitePageHeader
        eyebrow={<><Sparkles className="size-3.5" /> {t("whyChina.eyebrow")}</>}
        title={t("whyChina.title")}
        subtitle={t("whyChina.subtitle")}
      />

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[[n(s?.universities), t("whyChina.stats.students.label")], [n(s?.english_programs), t("whyChina.stats.english.label")], [n(s?.csc_programs), t("whyChina.stats.scholarships.label")], [n(s?.mbbs_universities), t("whyChina.stats.recognition.label")]].map(([v, l]) => (
          <div key={l} className="rounded-sm border bg-card p-5 text-center shadow-sm">
            <p className="text-2xl font-bold text-cas-navy">{v}</p>
            <p className="mt-1 text-xs text-muted-foreground">{l}</p>
          </div>
        ))}
      </section>

      <SiteSection title={t("whyChina.reasonsTitle")} subtitle={t("whyChina.reasonsSubtitle")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REASONS.map(({ icon: Icon, titleKey, bodyKey }) => (
            <div key={titleKey} className="rounded-sm border bg-card p-6 shadow-sm">
              <span className="inline-flex size-11 items-center justify-center rounded-sm bg-cas-navy-50 text-cas-navy"><Icon className="size-5" /></span>
              <h3 className="mt-4 font-semibold text-cas-navy">{t(titleKey)}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{t(bodyKey)}</p>
            </div>
          ))}
        </div>
      </SiteSection>

      <section className="flex flex-col items-start justify-between gap-4 rounded-sm border bg-cas-red-50 p-6 sm:flex-row sm:items-center sm:p-8">
        <div>
          <h2 className="text-lg font-semibold text-cas-navy">{t("whyChina.ctaTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("whyChina.ctaSubtitle")}</p>
        </div>
        <Link to="/site/programs" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-sm bg-cas-navy px-6 text-sm font-semibold text-white hover:bg-cas-navy-700">
          {t("whyChina.ctaButton")} <ArrowRight className="size-4" />
        </Link>
      </section>
      <PageFaqs path="site/why-china" />
    </div>
  )
}

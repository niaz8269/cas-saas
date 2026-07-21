import { ArrowRight, Award, CalendarDays, FileText, School, Stamp, Stethoscope, Wallet, type LucideIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { SitePageHeader, SiteSection } from "@/features/site/components"
import { useSeo } from "@/lib/seo"

// Display text carried as i18n key strings, resolved via t() at render.
const GUIDES: { icon: LucideIcon; titleKey: string; bodyKey: string; to: string }[] = [
  { icon: FileText, titleKey: "news.guides.apply.title", bodyKey: "news.guides.apply.body", to: "/site/study-plan" },
  { icon: Stamp, titleKey: "news.guides.visa.title", bodyKey: "news.guides.visa.body", to: "/site/faq" },
  { icon: Award, titleKey: "news.guides.scholarships.title", bodyKey: "news.guides.scholarships.body", to: "/site/scholarships" },
  { icon: Wallet, titleKey: "news.guides.costs.title", bodyKey: "news.guides.costs.body", to: "/site/pricing" },
  { icon: Stethoscope, titleKey: "news.guides.mbbs.title", bodyKey: "news.guides.mbbs.body", to: "/site/programs?q=MBBS" },
  { icon: School, titleKey: "news.guides.university.title", bodyKey: "news.guides.university.body", to: "/site/universities" },
]

const UPDATES: { dateKey: string; tagKey: string; titleKey: string; bodyKey: string; to: string }[] = [
  {
    dateKey: "news.updates.intake.date", tagKey: "news.updates.intake.tag",
    titleKey: "news.updates.intake.title",
    bodyKey: "news.updates.intake.body",
    to: "/site/programs",
  },
  {
    dateKey: "news.updates.scholarships.date", tagKey: "news.updates.scholarships.tag",
    titleKey: "news.updates.scholarships.title",
    bodyKey: "news.updates.scholarships.body",
    to: "/site/scholarships",
  },
  {
    dateKey: "news.updates.universities.date", tagKey: "news.updates.universities.tag",
    titleKey: "news.updates.universities.title",
    bodyKey: "news.updates.universities.body",
    to: "/site/universities",
  },
]

export default function SiteNews() {
  const { t } = useTranslation()
  useSeo({
    title: t("news.seoTitle"),
    description: t("news.seoDescription"),
    canonicalPath: "/site/news",
  })

  return (
    <div className="space-y-8">
      <SitePageHeader
        eyebrow={t("news.headerEyebrow")}
        title={t("news.headerTitle")}
        subtitle={t("news.headerSubtitle")}
      />

      <SiteSection title={t("news.latestUpdatesTitle")}>
        <div className="grid gap-4 lg:grid-cols-3">
          {UPDATES.map((u) => (
            <article key={u.titleKey} className="flex flex-col rounded-sm border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-transparent bg-cas-red-50 text-cas-red-600">{t(u.tagKey)}</Badge>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="size-3.5" /> {t(u.dateKey)}</span>
              </div>
              <h2 className="mt-3 font-semibold text-cas-navy">{t(u.titleKey)}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{t(u.bodyKey)}</p>
              <Link to={u.to} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-cas-navy hover:underline">
                {t("news.learnMore")} <ArrowRight className="size-4" />
              </Link>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection title={t("news.guidesTitle")} subtitle={t("news.guidesSubtitle")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDES.map(({ icon: Icon, titleKey, bodyKey, to }) => (
            <Link key={titleKey} to={to} className="group flex flex-col rounded-sm border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow">
              <span className="inline-flex size-11 items-center justify-center rounded-sm bg-cas-navy-50 text-cas-navy"><Icon className="size-5" /></span>
              <h3 className="mt-4 font-semibold text-cas-navy group-hover:text-cas-red-600">{t(titleKey)}</h3>
              <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{t(bodyKey)}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-cas-navy">{t("news.readGuide")} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
            </Link>
          ))}
        </div>
      </SiteSection>
    </div>
  )
}

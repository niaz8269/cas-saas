import { useQuery } from "@tanstack/react-query"
import { ArrowRight, BadgeCheck, BedDouble, FileText, GraduationCap, HeartPulse, Plane, ReceiptText, ShieldCheck, Sparkles, Stethoscope, type LucideIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Skeleton } from "@/components/ui/skeleton"
import { getSiteCostGuide, type SiteCostBand } from "@/features/site/api"
import { SitePageHeader, SiteSection } from "@/features/site/components"
import { HEADER_IMAGES } from "@/features/site/headerImages"
import { useSeo } from "@/lib/seo"

const LEVELS: { key: "bachelor" | "master" | "phd" | "mbbs"; icon: LucideIcon }[] = [
  { key: "bachelor", icon: GraduationCap },
  { key: "master", icon: GraduationCap },
  { key: "phd", icon: GraduationCap },
  { key: "mbbs", icon: Stethoscope },
]

const SERVICES: { icon: LucideIcon; key: string }[] = [
  { icon: FileText, key: "application" },
  { icon: ShieldCheck, key: "visa" },
  { icon: BedDouble, key: "accommodation" },
  { icon: Plane, key: "arrival" },
  { icon: HeartPulse, key: "documents" },
]

const cny = (n: number) => `¥${n.toLocaleString("en-US")}`

function CostCard({ band, level, icon: Icon }: { band: SiteCostBand | null; level: string; icon: LucideIcon }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col rounded-sm border bg-card p-6 shadow-sm">
      <span className="inline-flex size-10 items-center justify-center rounded-sm bg-cas-navy-50 text-cas-navy"><Icon className="size-5" /></span>
      <h3 className="mt-4 font-semibold text-cas-navy">{t(`pricing.level.${level}`)}</h3>
      {band ? (
        <>
          <p className="mt-3 text-2xl font-bold text-foreground">{cny(band.median)}<span className="ml-1 text-xs font-medium text-muted-foreground">{t("pricing.perYear")}</span></p>
          <p className="text-xs text-muted-foreground">{t("pricing.typical")}</p>
          <p className="mt-3 border-t pt-3 text-sm text-muted-foreground">{t("pricing.range", { low: cny(band.low), high: cny(band.high) })}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("pricing.programsCount", { count: band.programs })}</p>
        </>
      ) : <p className="mt-3 text-sm text-muted-foreground">{t("pricing.noData")}</p>}
    </div>
  )
}

export default function SitePricing() {
  const { t } = useTranslation()
  const { data, isPending } = useQuery({ queryKey: ["site-cost-guide"], queryFn: getSiteCostGuide, staleTime: 3_600_000 })
  const faq = t("pricing.faq", { returnObjects: true }) as { q: string; a: string }[]
  const steps = t("pricing.steps", { returnObjects: true }) as { title: string; body: string }[]
  const budget = t("pricing.budget", { returnObjects: true }) as string[]

  useSeo({
    title: t("pricing.seoTitle"),
    description: t("pricing.seoDescription"),
    canonicalPath: "/site/pricing",
    jsonLd: { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  })

  return (
    <div className="space-y-14">
      <SitePageHeader eyebrow={t("pricing.headerEyebrow")} title={t("pricing.headerTitle")} subtitle={t("pricing.headerSubtitle")} image={HEADER_IMAGES.programs} />

      <SiteSection title={t("pricing.costTitle")} subtitle={t("pricing.costSubtitle")}>
        {isPending ? <Skeleton className="h-56 w-full" /> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LEVELS.map((l) => <CostCard key={l.key} level={l.key} icon={l.icon} band={data?.levels?.[l.key] ?? null} />)}
          </div>
        )}
        <p className="mx-auto mt-4 max-w-3xl text-center text-xs text-muted-foreground">{t("pricing.costNote")}</p>
      </SiteSection>

      <section className="rounded-sm border bg-card p-6 shadow-sm sm:p-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold text-cas-navy">{t("pricing.budgetTitle")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("pricing.budgetSubtitle")}</p>
            <ul className="mt-4 space-y-2.5">
              {budget.map((b) => <li key={b} className="flex items-start gap-2 text-sm"><BadgeCheck className="mt-0.5 size-4 shrink-0 text-cas-navy" />{b}</li>)}
            </ul>
          </div>
          <div className="rounded-sm bg-subtle p-6">
            <h3 className="font-semibold text-cas-navy">{t("pricing.scholarshipTitle")}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{t("pricing.scholarshipBody")}</p>
            {data?.scholarships && (
              <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                {([["government", data.scholarships.government], ["full", data.scholarships.full], ["partial", data.scholarships.partial]] as const).map(([k, n]) => (
                  <div key={k} className="rounded-sm border bg-card p-3"><dd className="text-xl font-bold text-cas-navy">{n}</dd><dt className="text-[11px] text-muted-foreground">{t(`pricing.scholarshipKind.${k}`)}</dt></div>
                ))}
              </dl>
            )}
            <Link to="/site/scholarships" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-cas-navy hover:underline">{t("pricing.scholarshipLink")} <ArrowRight className="size-4" /></Link>
          </div>
        </div>
      </section>

      <SiteSection title={t("pricing.casTitle")} subtitle={t("pricing.casSubtitle")}>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-sm border-2 border-cas-red bg-card p-6 shadow-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cas-red px-2.5 py-0.5 text-[11px] font-bold text-white uppercase"><Sparkles className="size-3" />{t("pricing.freeBadge")}</span>
            <h3 className="mt-3 font-semibold text-cas-navy">{t("pricing.freeCardTitle")}</h3>
            <ul className="mt-4 space-y-2.5">
              {[1, 2, 3, 4].map((i) => <li key={i} className="flex items-start gap-2 text-sm"><BadgeCheck className="mt-0.5 size-4 shrink-0 text-cas-red-600" />{t(`pricing.free${i}`)}</li>)}
            </ul>
            <Link to="/site/study-plan" className="mt-6 inline-flex h-10 w-full items-center justify-center gap-2 rounded-sm bg-cas-red text-sm font-semibold text-white hover:bg-cas-red-600">{t("pricing.ctaButton")} <ArrowRight className="size-4" /></Link>
          </div>
          <div className="rounded-sm border bg-card p-6 shadow-sm lg:col-span-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-cas-navy-50 px-2.5 py-0.5 text-[11px] font-bold text-cas-navy uppercase"><ReceiptText className="size-3" />{t("pricing.quotedBadge")}</span>
            <h3 className="mt-3 font-semibold text-cas-navy">{t("pricing.quotedCardTitle")}</h3>
            <ul className="mt-4 divide-y">
              {SERVICES.map(({ icon: Icon, key }) => (
                <li key={key} className="flex items-start gap-3 py-3">
                  <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-sm bg-cas-navy-50 text-cas-navy"><Icon className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{t(`pricing.service.${key}.title`)}</p>
                    <p className="text-sm text-muted-foreground">{t(`pricing.service.${key}.body`)}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-2 rounded-sm bg-subtle px-4 py-3 text-xs text-muted-foreground">{t("pricing.quoteNote")}</p>
          </div>
        </div>
      </SiteSection>

      <SiteSection title={t("pricing.stepsTitle")}>
        <ol className="grid gap-4 sm:grid-cols-3">
          {steps.map((s, i) => (
            <li key={s.title} className="rounded-sm border bg-card p-6 shadow-sm">
              <span className="flex size-9 items-center justify-center rounded-full bg-cas-navy text-lg font-bold text-white">{i + 1}</span>
              <h3 className="mt-3 font-semibold text-cas-navy">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </SiteSection>

      <section className="mx-auto w-full max-w-3xl">
        <h2 className="text-center text-2xl font-bold text-cas-navy">{t("pricing.faqTitle")}</h2>
        <div className="mt-6 divide-y rounded-sm border bg-card shadow-sm">
          {faq.map((f) => (
            <details key={f.q} className="group px-5 py-4">
              <summary className="cursor-pointer list-none text-sm font-semibold text-cas-navy marker:hidden">{f.q}</summary>
              <p className="mt-2 text-sm text-muted-foreground">{f.a}</p>
            </details>
          ))}
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

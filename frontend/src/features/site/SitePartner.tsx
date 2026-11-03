import { useQuery } from "@tanstack/react-query"
import { ArrowRight, BadgeCheck, Banknote, Building2, ChevronRight, ClipboardList, FileCheck2, LineChart, Megaphone, UserPlus, type LucideIcon } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { getSitePrograms, getSiteUniversities } from "@/features/site/api"
import { SitePageHeader, SiteSection } from "@/features/site/components"
import { HEADER_IMAGES } from "@/features/site/headerImages"
import { useSeo } from "@/lib/seo"

const BENEFITS: { icon: LucideIcon; key: string }[] = [
  { icon: Building2, key: "universities" },
  { icon: LineChart, key: "portal" },
  { icon: Banknote, key: "commissions" },
  { icon: Megaphone, key: "materials" },
]

const PORTAL: { icon: LucideIcon; key: string }[] = [
  { icon: UserPlus, key: "students" },
  { icon: ClipboardList, key: "apply" },
  { icon: FileCheck2, key: "track" },
  { icon: Banknote, key: "earnings" },
]

const REGISTER = "/portal/register?as=agent"

export default function SitePartner() {
  const { t } = useTranslation()
  const unis = useQuery({ queryKey: ["partner-unis"], queryFn: () => getSiteUniversities({ perPage: 1 }), staleTime: 3_600_000 })
  const progs = useQuery({ queryKey: ["partner-programs"], queryFn: () => getSitePrograms({}), staleTime: 3_600_000 })
  const mbbs = useQuery({ queryKey: ["partner-mbbs"], queryFn: () => getSiteUniversities({ moe: true, perPage: 1 }), staleTime: 3_600_000 })
  const steps = t("partner.steps", { returnObjects: true }) as { title: string; body: string }[]
  const stages = t("partner.stages", { returnObjects: true }) as { title: string; body: string }[]
  const fit = t("partner.fit", { returnObjects: true }) as string[]
  const faq = t("partner.faq", { returnObjects: true }) as { q: string; a: string }[]

  useSeo({
    title: t("partner.seoTitle"),
    description: t("partner.seoDescription"),
    canonicalPath: "/site/partner",
    jsonLd: { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  })

  const stats = [
    { value: unis.data?.meta ? unis.data.meta.total.toLocaleString("en-US") : "—", label: t("partner.statUniversities") },
    { value: progs.data?.meta ? progs.data.meta.total.toLocaleString("en-US") : "—", label: t("partner.statPrograms") },
    { value: mbbs.data?.meta ? mbbs.data.meta.total.toLocaleString("en-US") : "—", label: t("partner.statMbbs") },
    { value: "2012", label: t("partner.statSince") },
  ]

  return (
    <div className="space-y-14">
      <SitePageHeader
        eyebrow={t("partner.headerEyebrow")}
        title={t("partner.headerTitle")}
        subtitle={t("partner.headerSubtitle")}
        image={HEADER_IMAGES.default}
        action={
          <div className="flex flex-wrap gap-3">
            <Link to={REGISTER} className="inline-flex h-11 items-center gap-2 rounded-sm bg-cas-red px-6 text-sm font-semibold text-white hover:bg-cas-red-600">
              {t("partner.becomePartner")} <ArrowRight className="size-4" />
            </Link>
            <Link to="/portal/login" className="inline-flex h-11 items-center rounded-sm border border-white/40 px-6 text-sm font-semibold text-white hover:bg-white/10">{t("partner.signIn")}</Link>
          </div>
        }
      />

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border bg-border shadow-sm lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card px-6 py-6 text-center">
            <dd className="text-3xl font-bold text-cas-navy">{s.value}</dd>
            <dt className="mt-1 text-xs text-muted-foreground">{s.label}</dt>
          </div>
        ))}
      </dl>

      <SiteSection title={t("partner.whyTitle")} subtitle={t("partner.whySubtitle")}>
        <div className="grid gap-4 sm:grid-cols-2">
          {BENEFITS.map(({ icon: Icon, key }) => (
            <div key={key} className="flex gap-4 rounded-sm border bg-card p-6 shadow-sm">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-sm bg-cas-navy-50 text-cas-navy"><Icon className="size-5" /></span>
              <div>
                <h3 className="font-semibold text-cas-navy">{t(`partner.benefit.${key}.title`)}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{t(`partner.benefit.${key}.body`)}</p>
              </div>
            </div>
          ))}
        </div>
      </SiteSection>

      <section className="rounded-sm border bg-card p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-semibold text-cas-navy">{t("partner.portalTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("partner.portalSubtitle")}</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PORTAL.map(({ icon: Icon, key }) => (
            <div key={key} className="rounded-sm bg-subtle p-5">
              <Icon className="size-5 text-cas-navy" />
              <h3 className="mt-3 text-sm font-semibold text-cas-navy">{t(`partner.portal.${key}.title`)}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t(`partner.portal.${key}.body`)}</p>
            </div>
          ))}
        </div>
      </section>

      <SiteSection title={t("partner.stagesTitle")} subtitle={t("partner.stagesSubtitle")}>
        <ol className="grid gap-3 lg:grid-cols-5">
          {stages.map((s, i) => (
            <li key={s.title} className="relative rounded-sm border bg-card p-5 shadow-sm">
              <span className="text-xs font-semibold text-cas-red-600">{t("partner.stage", { n: i + 1 })}</span>
              <h3 className="mt-1 text-sm font-semibold text-cas-navy">{s.title}</h3>
              <p className="mt-1.5 text-xs text-muted-foreground">{s.body}</p>
              {i < stages.length - 1 && <ChevronRight className="absolute top-1/2 -right-3 z-10 hidden size-5 -translate-y-1/2 rounded-full bg-card text-muted-foreground lg:block" />}
            </li>
          ))}
        </ol>
        <p className="mx-auto mt-4 max-w-3xl text-center text-xs text-muted-foreground">{t("partner.stagesNote")}</p>
      </SiteSection>

      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-xl font-semibold text-cas-navy">{t("partner.howTitle")}</h2>
          <ol className="mt-5 space-y-4">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-cas-navy text-sm font-bold text-white">{i + 1}</span>
                <div>
                  <h3 className="text-sm font-semibold text-cas-navy">{s.title}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-sm bg-subtle p-6">
          <h2 className="text-xl font-semibold text-cas-navy">{t("partner.fitTitle")}</h2>
          <ul className="mt-4 space-y-2.5">
            {fit.map((f) => <li key={f} className="flex items-start gap-2 text-sm"><BadgeCheck className="mt-0.5 size-4 shrink-0 text-cas-navy" />{f}</li>)}
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl">
        <h2 className="text-center text-2xl font-bold text-cas-navy">{t("partner.faqTitle")}</h2>
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
          <h2 className="text-xl font-semibold">{t("partner.ctaTitle")}</h2>
          <p className="mt-1 text-sm text-white/80">{t("partner.ctaSubtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to={REGISTER} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-sm bg-cas-red px-6 text-sm font-semibold text-white hover:bg-cas-red-600">
            {t("partner.becomePartner")} <ArrowRight className="size-4" />
          </Link>
          <Link to="/site/contact" className="inline-flex h-11 shrink-0 items-center rounded-sm border border-white/40 px-6 text-sm font-semibold hover:bg-white/10">{t("partner.talkToUs")}</Link>
        </div>
      </section>
    </div>
  )
}

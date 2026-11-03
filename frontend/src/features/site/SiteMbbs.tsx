import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Skeleton } from "@/components/ui/skeleton"
import { getSiteUniversities } from "@/features/site/api"
import { SitePageHeader, SiteSection, UniCard } from "@/features/site/components"
import { HEADER_IMAGES } from "@/features/site/headerImages"
import { useSeo } from "@/lib/seo"

/** MBBS in China: the Ministry of Education's approved universities, requirements and how to apply. */
export default function SiteMbbs() {
  const { t } = useTranslation()
  const { data, isPending } = useQuery({ queryKey: ["site-mbbs"], queryFn: () => getSiteUniversities({ moe: true, perPage: 50 }) })
  const unis = data?.data ?? []
  const requirements = t("mbbs.requirements", { returnObjects: true }) as string[]
  const faq = t("mbbs.faq", { returnObjects: true }) as { q: string; a: string }[]

  useSeo({
    title: t("mbbs.seoTitle"),
    description: t("mbbs.seoDescription"),
    canonicalPath: "/site/mbbs-in-china",
    jsonLd: { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
  })

  return (
    <div className="space-y-10">
      <SitePageHeader eyebrow={t("mbbs.eyebrow")} title={t("mbbs.title")} subtitle={t("mbbs.subtitle")} image={HEADER_IMAGES.programs} />

      <article className="max-w-3xl space-y-4 text-sm leading-relaxed text-foreground/90">
        <h2 className="text-lg font-semibold text-cas-navy">{t("mbbs.howTitle")}</h2>
        <p>{t("mbbs.how1")}</p>
        <p>{t("mbbs.how2")}</p>
      </article>

      <SiteSection title={t("mbbs.listTitle", { count: unis.length })} subtitle={t("mbbs.listSubtitle")}>
        {isPending ? <Skeleton className="h-64 w-full" /> : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{unis.map((u) => <UniCard key={u.id} u={u} />)}</div>
        )}
      </SiteSection>

      <article className="max-w-3xl space-y-3 text-sm leading-relaxed text-foreground/90">
        <h2 className="text-lg font-semibold text-cas-navy">{t("mbbs.reqTitle")}</h2>
        <ul className="list-disc space-y-1.5 pl-5">{requirements.map((r) => <li key={r}>{r}</li>)}</ul>
        <h2 className="pt-4 text-lg font-semibold text-cas-navy">{t("mbbs.faqTitle")}</h2>
        {faq.map((f) => (
          <div key={f.q}>
            <h3 className="font-semibold text-foreground">{f.q}</h3>
            <p className="mt-1">{f.a}</p>
          </div>
        ))}
      </article>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-sm bg-cas-navy p-6 text-white">
        <p className="text-sm font-medium">{t("mbbs.cta")}</p>
        <Link to="/site/study-plan" className="inline-flex h-10 items-center rounded-sm bg-cas-red px-5 text-sm font-semibold hover:bg-cas-red-600">{t("mbbs.ctaButton")}</Link>
      </div>
    </div>
  )
}

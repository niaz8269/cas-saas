import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { getSiteScholarships } from "@/features/site/api"
import { SitePageHeader } from "@/features/site/components"
import { HEADER_IMAGES } from "@/features/site/headerImages"
import { useSeo } from "@/lib/seo"

/** CSC (Chinese Government Scholarship) guide: what it covers, who can apply, how and when. */
export default function SiteCsc() {
  const { t } = useTranslation()
  const { data } = useQuery({ queryKey: ["site-csc-gov"], queryFn: () => getSiteScholarships({ type: "government" }) })
  const steps = t("csc.steps", { returnObjects: true }) as string[]
  const covers = t("csc.covers", { returnObjects: true }) as string[]

  useSeo({ title: t("csc.seoTitle"), description: t("csc.seoDescription"), canonicalPath: "/site/csc-scholarship" })

  return (
    <div className="space-y-10">
      <SitePageHeader eyebrow={t("csc.eyebrow")} title={t("csc.title")} subtitle={t("csc.subtitle")} image={HEADER_IMAGES.scholarships} />
      <article className="max-w-3xl space-y-4 text-sm leading-relaxed text-foreground/90">
        <h2 className="text-lg font-semibold text-cas-navy">{t("csc.whatTitle")}</h2>
        <p>{t("csc.what1")}</p>
        <h2 className="pt-2 text-lg font-semibold text-cas-navy">{t("csc.coversTitle")}</h2>
        <ul className="list-disc space-y-1.5 pl-5">{covers.map((c) => <li key={c}>{c}</li>)}</ul>
        <h2 className="pt-2 text-lg font-semibold text-cas-navy">{t("csc.whoTitle")}</h2>
        <p>{t("csc.who1")}</p>
        <h2 className="pt-2 text-lg font-semibold text-cas-navy">{t("csc.howTitle")}</h2>
        <ol className="list-decimal space-y-1.5 pl-5">{steps.map((s) => <li key={s}>{s}</li>)}</ol>
        <h2 className="pt-2 text-lg font-semibold text-cas-navy">{t("csc.timeTitle")}</h2>
        <p>{t("csc.time1")}</p>
      </article>
      {data && data.data.length > 0 && (
        <section className="max-w-3xl">
          <h2 className="text-lg font-semibold text-cas-navy">{t("csc.listTitle")}</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">{data.data.map((s) => <li key={s.id}>{s.name}</li>)}</ul>
        </section>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-sm bg-cas-navy p-6 text-white">
        <p className="text-sm font-medium">{t("csc.cta")}</p>
        <div className="flex gap-3">
          <Link to="/site/scholarships" className="inline-flex h-10 items-center rounded-sm border border-white/30 px-5 text-sm font-semibold hover:bg-white/10">{t("csc.allScholarships")}</Link>
          <Link to="/site/study-plan" className="inline-flex h-10 items-center rounded-sm bg-cas-red px-5 text-sm font-semibold hover:bg-cas-red-600">{t("csc.ctaButton")}</Link>
        </div>
      </div>
    </div>
  )
}

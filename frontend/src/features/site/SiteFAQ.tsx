import { ArrowRight, ChevronDown } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { SitePageHeader } from "@/features/site/components"
import { useSeo } from "@/lib/seo"
import { cn } from "@/lib/utils"

type QA = { qKey: string; aKey: string }
type Category = { titleKey: string; items: QA[] }

// Display text lives in i18n keys resolved via t() at render (report — 5-language support).
const CATEGORIES: Category[] = [
  {
    titleKey: "faq.studyingInChina.title",
    items: [
      { qKey: "faq.studyingInChina.q1", aKey: "faq.studyingInChina.a1" },
      { qKey: "faq.studyingInChina.q2", aKey: "faq.studyingInChina.a2" },
      { qKey: "faq.studyingInChina.q3", aKey: "faq.studyingInChina.a3" },
      { qKey: "faq.studyingInChina.q4", aKey: "faq.studyingInChina.a4" },
    ],
  },
  {
    titleKey: "faq.choosing.title",
    items: [
      { qKey: "faq.choosing.q1", aKey: "faq.choosing.a1" },
      { qKey: "faq.choosing.q2", aKey: "faq.choosing.a2" },
      { qKey: "faq.choosing.q3", aKey: "faq.choosing.a3" },
    ],
  },
  {
    titleKey: "faq.scholarships.title",
    items: [
      { qKey: "faq.scholarships.q1", aKey: "faq.scholarships.a1" },
      { qKey: "faq.scholarships.q2", aKey: "faq.scholarships.a2" },
      { qKey: "faq.scholarships.q3", aKey: "faq.scholarships.a3" },
    ],
  },
  {
    titleKey: "faq.applying.title",
    items: [
      { qKey: "faq.applying.q1", aKey: "faq.applying.a1" },
      { qKey: "faq.applying.q2", aKey: "faq.applying.a2" },
      { qKey: "faq.applying.q3", aKey: "faq.applying.a3" },
      { qKey: "faq.applying.q4", aKey: "faq.applying.a4" },
    ],
  },
  {
    titleKey: "faq.visa.title",
    items: [
      { qKey: "faq.visa.q1", aKey: "faq.visa.a1" },
      { qKey: "faq.visa.q2", aKey: "faq.visa.a2" },
    ],
  },
  {
    titleKey: "faq.fees.title",
    items: [
      { qKey: "faq.fees.q1", aKey: "faq.fees.a1" },
      { qKey: "faq.fees.q2", aKey: "faq.fees.a2" },
    ],
  },
]

function faqJsonLd(cats: Category[], t: (key: string) => string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: cats.flatMap((c) => c.items).map(({ qKey, aKey }) => ({
      "@type": "Question",
      name: t(qKey),
      acceptedAnswer: { "@type": "Answer", text: t(aKey) },
    })),
  }
}

export default function SiteFAQ() {
  const { t } = useTranslation()

  useSeo({
    title: t("faq.seoTitle"),
    description: t("faq.seoDescription"),
    canonicalPath: "/site/faq",
    jsonLd: faqJsonLd(CATEGORIES, t),
  })

  const [open, setOpen] = useState<string | null>(null)

  return (
    <div className="space-y-8">
      <SitePageHeader
        eyebrow={t("faq.eyebrow")}
        title={t("faq.title")}
        subtitle={t("faq.subtitle")}
      />

      {CATEGORIES.map((cat) => (
        <section key={cat.titleKey}>
          <h2 className="mb-3 text-lg font-semibold text-cas-navy">{t(cat.titleKey)}</h2>
          <div className="divide-y overflow-hidden rounded-sm border bg-card shadow-sm">
            {cat.items.map((item, i) => {
              const id = `${cat.titleKey}-${i}`
              const isOpen = open === id

              return (
                <div key={id}>
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/50"
                  >
                    <span className="text-sm font-medium text-ink sm:text-base">{t(item.qKey)}</span>
                    <ChevronDown className={cn("size-5 shrink-0 text-cas-navy transition-transform duration-200", isOpen && "rotate-180")} />
                  </button>
                  {isOpen && <p className="px-5 pb-4 text-sm text-muted-foreground">{t(item.aKey)}</p>}
                </div>
              )
            })}
          </div>
        </section>
      ))}

      <section className="flex flex-col items-start justify-between gap-4 rounded-sm bg-cas-navy p-8 text-white sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold">{t("faq.ctaTitle")}</h2>
          <p className="mt-1 text-sm text-white/80">{t("faq.ctaSubtitle")}</p>
        </div>
        <Link to="/site/study-plan" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-sm bg-cas-red px-6 text-sm font-semibold text-white hover:bg-cas-red-600">
          {t("faq.ctaButton")} <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
  )
}

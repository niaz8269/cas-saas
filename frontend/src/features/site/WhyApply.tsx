import { CheckCircle2, GraduationCap, Handshake } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { formatTotal, useCatalogTotals } from "@/features/site/useCatalogTotals"

/** "Why apply with CAS" block before the footer. Every claim is backed by the platform. */
export default function WhyApply() {
  const { t } = useTranslation()
  const totals = useCatalogTotals()

  const points = [
    { title: t("home.why.freeTitle"), body: t("home.why.freeBody"), link: { to: "/site/pricing", label: t("home.why.freeLink") } },
    { title: t("home.why.easyTitle"), body: t("home.why.easyBody", { total: formatTotal(totals.universities) }) },
    { title: t("home.why.supportTitle"), body: t("home.why.supportBody"), link: { to: "/site/contact", label: t("home.why.supportLink") } },
    { title: t("home.why.officialTitle"), body: t("home.why.officialBody", { programs: formatTotal(totals.programs), scholarships: formatTotal(totals.scholarships) }) },
  ]

  return (
    <section className="rounded-sm bg-subtle px-4 py-12 sm:px-10 sm:py-16">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1fr_2.2fr] lg:items-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-cas-navy sm:text-3xl">{t("home.why.title")}</h2>
          <div className="mx-auto mt-8 flex w-48 items-end justify-center gap-3" aria-hidden="true">
            <span className="flex size-20 items-center justify-center rounded-full bg-cas-navy text-white"><GraduationCap className="size-10" /></span>
            <span className="flex size-20 items-center justify-center rounded-full bg-cas-red text-white"><Handshake className="size-10" /></span>
          </div>
        </div>
        <ul className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
          {points.map((p) => (
            <li key={p.title} className="flex gap-3">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-600" />
              <div>
                <h3 className="font-semibold text-cas-navy">{p.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {p.body}
                  {p.link && <> <Link to={p.link.to} className="font-medium text-cas-red-600 hover:underline">{p.link.label}</Link></>}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

import { useQuery } from "@tanstack/react-query"
import { BadgeCheck, Quote } from "lucide-react"
import { useTranslation } from "react-i18next"

import { getSiteTestimonials, type SiteTestimonial } from "@/features/site/api"
import { DEGREE_LABELS, SERVICE_LABELS } from "@/features/site/testimonialLabels"

function initials(name: string) {
  const parts = name.replace(/\./g, "").split(/\s+/).filter(Boolean)

  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase()
}

/** "Bachelor's · MBBS" then "Jilin University", then where they come from. */
function lines(it: SiteTestimonial): string[] {
  if (it.audience === "student") {
    const study = [it.degree ? DEGREE_LABELS[it.degree] ?? it.degree : null, it.program].filter(Boolean).join(" · ")

    return [study, it.university ?? "", [it.country, it.intake_year ? `Intake ${it.intake_year}` : null].filter(Boolean).join(" · ")].filter(Boolean)
  }

  return [it.headline ?? "", [it.country, it.partner_since ? `Partner since ${it.partner_since}` : null].filter(Boolean).join(" · ")].filter(Boolean)
}

function Avatar({ it }: { it: SiteTestimonial }) {
  if (it.photo_url) {
    return <img src={it.photo_url} alt={it.name} loading="lazy" className="size-14 shrink-0 rounded-full border-2 border-white object-cover shadow ring-1 ring-slate-200" />
  }

  return (
    <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full bg-cas-navy text-base font-semibold text-white ring-1 ring-slate-200">
      {initials(it.name)}
    </span>
  )
}

function Card({ it }: { it: SiteTestimonial }) {
  const info = lines(it)

  return (
    <figure className="flex h-full flex-col rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex min-h-[6.25rem] items-center gap-4">
        <Avatar it={it} />
        <figcaption className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-1.5 text-base font-semibold text-slate-900">
            <span>{it.name}</span>
            {it.verified && (
              <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-success" title="Written from their own CAS account">
                <BadgeCheck className="size-3.5" aria-hidden="true" />
                Verified {it.audience === "student" ? "student" : "partner"}
              </span>
            )}
          </p>
          {info.map((l, i) => (
            <p key={l} className={i === 0 ? "text-sm font-medium text-cas-navy" : "text-xs text-slate-500"}>{l}</p>
          ))}
        </figcaption>
      </div>

      <div className="mt-5 flex-1 border-t pt-5">
        <Quote className="size-5 text-cas-red" aria-hidden="true" />
        {it.title && <p className="mt-2 text-base font-semibold text-cas-navy">{it.title}</p>}
        <blockquote className="mt-2 text-sm leading-relaxed text-slate-600">{it.quote}</blockquote>
      </div>

      {it.services && it.services.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Services">
          {it.services.map((s) => (
            <li key={s} className="rounded-full bg-cas-navy-50 px-2.5 py-0.5 text-[11px] font-medium text-cas-navy">{SERVICE_LABELS[s] ?? s}</li>
          ))}
        </ul>
      )}
    </figure>
  )
}

/**
 * What real students or partners said, shown only when there are approved ones
 * (staff approve each; the author agreed to be shown). Renders nothing otherwise,
 * so an empty site never shows a blank or made-up section.
 */
export default function Testimonials({ audience }: { audience: "student" | "agent" }) {
  const { t } = useTranslation()
  const { data } = useQuery({ queryKey: ["site-testimonials", audience], queryFn: () => getSiteTestimonials(audience), staleTime: 5 * 60_000 })
  const items = data?.data ?? []
  const summary = data?.summary

  if (items.length === 0) return null

  const title =
    audience === "student"
      ? t("testimonials.studentsTitle", { defaultValue: "What our students say" })
      : t("testimonials.partnersTitle", { defaultValue: "What our partners say" })

  return (
    <section aria-labelledby={`testimonials-${audience}`} className="rounded-xl border bg-subtle px-5 py-10 sm:px-10 sm:py-14">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold tracking-[0.18em] text-cas-red uppercase">{t("testimonials.eyebrow", { defaultValue: "Testimonials" })}</p>
        <h2 id={`testimonials-${audience}`} className="mt-2 text-2xl font-bold text-cas-navy sm:text-3xl">{title}</h2>

        {summary && summary.recommend_percent !== null && (
          <p className="mt-4 inline-flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-full border bg-card px-5 py-2 text-sm shadow-sm">
            <span className="font-medium text-success">{t("testimonials.recommend", { defaultValue: "{{percent}}% would recommend CAS", percent: summary.recommend_percent })}</span>
            <span className="text-slate-500">{t("testimonials.fromReviews", { defaultValue: "from {{count}} testimonials", count: summary.count })}</span>
          </p>
        )}
      </div>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => <Card key={it.id} it={it} />)}
      </div>
    </section>
  )
}

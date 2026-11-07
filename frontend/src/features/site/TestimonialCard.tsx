import { BadgeCheck, Quote } from "lucide-react"

import type { SiteTestimonial } from "@/features/site/api"
import { SERVICE_LABELS } from "@/features/site/testimonialLabels"
import { infoLines, initials } from "@/features/site/testimonialUtils"
import { cn } from "@/lib/utils"

export function Avatar({ it, className }: { it: SiteTestimonial; className?: string }) {
  if (it.photo_url) {
    return <img src={it.photo_url} alt={it.name} loading="lazy" className={cn("size-14 shrink-0 rounded-full border-2 border-white object-cover shadow ring-1 ring-slate-200", className)} />
  }

  return (
    <span aria-hidden="true" className={cn("flex size-14 shrink-0 items-center justify-center rounded-full bg-cas-navy text-base font-semibold text-white ring-1 ring-slate-200", className)}>
      {initials(it.name)}
    </span>
  )
}

/** One person's words with their photo, study details and a verified badge. */
export default function TestimonialCard({ it, compact = false }: { it: SiteTestimonial; compact?: boolean }) {
  const info = infoLines(it)

  return (
    <figure className={cn("flex h-full flex-col rounded-lg border bg-card shadow-sm", compact ? "p-4" : "p-6 transition-shadow hover:shadow-md")}>
      <div className={cn("flex items-center gap-4", !compact && "min-h-[6.25rem]")}>
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

      <div className={cn("flex-1 border-t", compact ? "mt-3 pt-3" : "mt-5 pt-5")}>
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

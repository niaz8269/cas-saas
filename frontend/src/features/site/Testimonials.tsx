import { useQuery } from "@tanstack/react-query"
import { Quote } from "lucide-react"
import { useTranslation } from "react-i18next"

import { getSiteTestimonials } from "@/features/site/api"

/**
 * What real students or partners said, shown only when there are approved ones
 * (staff approve each; the author agreed to be shown). Renders nothing otherwise,
 * so an empty site never shows a blank or made-up section.
 */
export default function Testimonials({ audience }: { audience: "student" | "agent" }) {
  const { t } = useTranslation()
  const { data } = useQuery({ queryKey: ["site-testimonials", audience], queryFn: () => getSiteTestimonials(audience), staleTime: 5 * 60_000 })
  const items = data?.data ?? []

  if (items.length === 0) return null

  return (
    <section aria-labelledby={`testimonials-${audience}`}>
      <h2 id={`testimonials-${audience}`} className="text-center text-2xl font-bold text-cas-navy">
        {audience === "student"
          ? t("testimonials.studentsTitle", { defaultValue: "What our students say" })
          : t("testimonials.partnersTitle", { defaultValue: "What our partners say" })}
      </h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <figure key={it.id} className="flex flex-col rounded-sm border bg-card p-5 shadow-sm">
            <Quote className="size-5 text-cas-red" aria-hidden="true" />
            <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{it.quote}</blockquote>
            <figcaption className="mt-4 border-t pt-3">
              <p className="text-sm font-semibold text-cas-navy">{it.name}</p>
              {(it.headline || it.country) && (
                <p className="text-xs text-muted-foreground">{[it.headline, it.country].filter(Boolean).join(" · ")}</p>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

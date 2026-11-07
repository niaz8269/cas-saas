import { useQuery } from "@tanstack/react-query"
import { lazy, Suspense, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Skeleton } from "@/components/ui/skeleton"
import { getSiteTestimonials } from "@/features/site/api"
import TestimonialCard from "@/features/site/TestimonialCard"

// The globe (and its world map) only loads when this section is rendered.
const TestimonialGlobe = lazy(() => import("@/features/site/TestimonialGlobe"))

/**
 * What real students or partners said, shown only when there are approved ones
 * (staff approve each; the author agreed to be shown). Renders nothing otherwise,
 * so an empty site never shows a blank or made-up section.
 *
 * Students are only photos on a globe, each on their nationality's country: a card opens when you hover,
 * click or tap a photo. Partners are a simple grid.
 */
export default function Testimonials({ audience }: { audience: "student" | "agent" }) {
  const { t } = useTranslation()
  const { data } = useQuery({ queryKey: ["site-testimonials", audience], queryFn: () => getSiteTestimonials(audience), staleTime: 5 * 60_000 })
  const items = useMemo(() => data?.data ?? [], [data])

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
        {audience === "student" && (
          <p className="mt-2 text-sm text-slate-600">{t("testimonials.globeHint", { defaultValue: "Students from around the world. Turn the globe, zoom, and tap a photo to read their story." })}</p>
        )}

        <Link
          to={`/site/share-your-experience${audience === "agent" ? "?as=agent" : ""}`}
          className="mt-5 inline-flex h-10 items-center rounded-full bg-cas-navy px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cas-navy-700 focus-visible:ring-2 focus-visible:ring-cas-navy/40 focus-visible:outline-none"
        >
          {t("testimonials.shareButton", { defaultValue: "Share your experience" })}
        </Link>
      </div>

      {audience === "student" ? (
        <div className="mt-8">
          <Suspense fallback={<Skeleton className="mx-auto aspect-square w-full max-w-[560px] rounded-full" />}>
            <TestimonialGlobe items={items} />
          </Suspense>
        </div>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => <TestimonialCard key={it.id} it={it} />)}
        </div>
      )}
    </section>
  )
}

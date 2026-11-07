import { useQuery } from "@tanstack/react-query"
import { Search, X } from "lucide-react"
import { lazy, Suspense, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Skeleton } from "@/components/ui/skeleton"
import { getSiteTestimonials } from "@/features/site/api"
import { COUNTRY_BY_ISO2 } from "@/features/site/countryList"
import TestimonialCard from "@/features/site/TestimonialCard"

// The globe (and its world map) only loads when this section is rendered.
const TestimonialGlobe = lazy(() => import("@/features/site/TestimonialGlobe"))

const PAGE = 6

/**
 * What real students or partners said, shown only when there are approved ones
 * (staff approve each; the author agreed to be shown). Renders nothing otherwise,
 * so an empty site never shows a blank or made-up section.
 *
 * Students sit on a globe at their nationality; partners are a simple grid.
 */
export default function Testimonials({ audience }: { audience: "student" | "agent" }) {
  const { t } = useTranslation()
  const { data } = useQuery({ queryKey: ["site-testimonials", audience], queryFn: () => getSiteTestimonials(audience), staleTime: 5 * 60_000 })
  const items = useMemo(() => data?.data ?? [], [data])
  const summary = data?.summary

  const [query, setQuery] = useState("")
  const [picked, setPicked] = useState<string | null>(null)
  const [focus, setFocus] = useState<{ code: string; nonce: number } | null>(null)
  const [showAll, setShowAll] = useState(false)

  // Countries that have at least one testimonial, for search suggestions.
  const countries = useMemo(() => {
    const seen = new Map<string, string>()
    for (const it of items) if (it.country_code) seen.set(it.country_code, COUNTRY_BY_ISO2[it.country_code]?.name ?? it.country ?? it.country_code)

    return [...seen.entries()].map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name))
  }, [items])

  const q = query.trim().toLowerCase()
  const suggestions = q && !picked ? countries.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 6) : []

  const visible = useMemo(() => {
    if (picked) return items.filter((it) => it.country_code === picked)
    if (q) return items.filter((it) => (it.country ?? "").toLowerCase().includes(q) || (it.university ?? "").toLowerCase().includes(q) || it.name.toLowerCase().includes(q))

    return items
  }, [items, picked, q])

  if (items.length === 0) return null

  const title =
    audience === "student"
      ? t("testimonials.studentsTitle", { defaultValue: "What our students say" })
      : t("testimonials.partnersTitle", { defaultValue: "What our partners say" })

  const choose = (code: string, name: string) => {
    setPicked(code)
    setQuery(name)
    setShowAll(false)
    setFocus({ code, nonce: Date.now() })
  }
  const clear = () => { setPicked(null); setQuery(""); setFocus(null); setShowAll(false) }
  const shown = showAll ? visible : visible.slice(0, PAGE)

  return (
    <section aria-labelledby={`testimonials-${audience}`} className="rounded-xl border bg-subtle px-5 py-10 sm:px-10 sm:py-14">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold tracking-[0.18em] text-cas-red uppercase">{t("testimonials.eyebrow", { defaultValue: "Testimonials" })}</p>
        <h2 id={`testimonials-${audience}`} className="mt-2 text-2xl font-bold text-cas-navy sm:text-3xl">{title}</h2>
        {audience === "student" && (
          <p className="mt-2 text-sm text-slate-600">{t("testimonials.globeHint", { defaultValue: "Students from around the world. Turn the globe, zoom, and open a photo to read their story." })}</p>
        )}

        {summary && summary.recommend_percent !== null && (
          <p className="mt-4 inline-flex flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-full border bg-card px-5 py-2 text-sm shadow-sm">
            <span className="font-medium text-success">{t("testimonials.recommend", { defaultValue: "{{percent}}% would recommend CAS", percent: summary.recommend_percent })}</span>
            <span className="text-slate-500">{t("testimonials.fromReviews", { defaultValue: "from {{count}} testimonials", count: summary.count })}</span>
          </p>
        )}
      </div>

      {audience === "student" && (
        <div className="mx-auto mt-8 max-w-md">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              role="combobox"
              aria-expanded={suggestions.length > 0}
              aria-controls="testimonial-country-list"
              aria-label={t("testimonials.searchLabel", { defaultValue: "Search testimonials by country" })}
              placeholder={t("testimonials.searchPlaceholder", { defaultValue: "Search by country, e.g. Pakistan" })}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPicked(null); setShowAll(false) }}
              onKeyDown={(e) => { if (e.key === "Enter" && suggestions[0]) choose(suggestions[0].code, suggestions[0].name) }}
              className="h-11 w-full rounded-full border bg-card pr-10 pl-10 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-cas-navy/40 focus-visible:outline-none"
            />
            {query && (
              <button type="button" aria-label={t("testimonials.clearSearch", { defaultValue: "Clear search" })} onClick={clear} className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700">
                <X className="size-4" />
              </button>
            )}
            {suggestions.length > 0 && (
              <ul id="testimonial-country-list" role="listbox" className="absolute z-40 mt-2 w-full overflow-hidden rounded-xl border bg-card text-left shadow-lg">
                {suggestions.map((c) => (
                  <li key={c.code} role="option" aria-selected={false}>
                    <button type="button" onClick={() => choose(c.code, c.name)} className="flex w-full items-center justify-between px-4 py-2.5 text-sm hover:bg-muted">
                      <span>{c.name}</span>
                      <span className="text-xs text-slate-400">{items.filter((it) => it.country_code === c.code).length}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {audience === "student" && (
        <div className="mt-6">
          <Suspense fallback={<Skeleton className="mx-auto aspect-square w-full max-w-[560px] rounded-full" />}>
            <TestimonialGlobe items={items} focus={focus} />
          </Suspense>
        </div>
      )}

      {audience === "student" && (
        <p className="mt-6 text-center text-sm text-slate-500" aria-live="polite">
          {picked
            ? t("testimonials.fromCountry", { defaultValue: "{{count}} from {{country}}", count: visible.length, country: COUNTRY_BY_ISO2[picked]?.name ?? picked })
            : q
              ? t("testimonials.matches", { defaultValue: "{{count}} matching", count: visible.length })
              : t("testimonials.allCount", { defaultValue: "All {{count}} testimonials", count: items.length })}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="mt-6 text-center text-sm text-slate-500">{t("testimonials.none", { defaultValue: "No testimonials from there yet." })}</p>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((it) => <TestimonialCard key={it.id} it={it} />)}
        </div>
      )}

      {visible.length > PAGE && !showAll && (
        <div className="mt-6 text-center">
          <button type="button" onClick={() => setShowAll(true)} className="rounded-full border bg-card px-5 py-2 text-sm font-medium text-cas-navy shadow-sm hover:bg-muted">
            {t("testimonials.showAll", { defaultValue: "Show all {{count}}", count: visible.length })}
          </button>
        </div>
      )}
    </section>
  )
}

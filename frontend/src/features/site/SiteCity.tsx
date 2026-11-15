import { useQuery } from "@tanstack/react-query"
import { Search, ShieldCheck } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router-dom"

import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { getSiteCity, type SiteCityGroup, type SiteCityProfile } from "@/features/site/api"
import { SitePageHeader, SiteSection, UniCard } from "@/features/site/components"
import SiteNotFound from "@/features/site/SiteNotFound"
import { OverviewArticle } from "@/features/site/SiteUniversity"
import { useSeo } from "@/lib/seo"
import { cn } from "@/lib/utils"

const GROUP_ORDER: SiteCityGroup[] = ["history", "places", "geography", "economy", "culture", "education", "transport", "people"]
const PAGE = 12

/** The city's own text, grouped (history, places to visit, climate, ...), with its source credited. */
function CityProfileArticle({ profile, city }: { profile: SiteCityProfile; city: string }) {
  const { t } = useTranslation()
  const groups = GROUP_ORDER.map((g) => ({ g, sections: profile.sections.filter((s) => s.group === g) })).filter((x) => x.sections.length > 0)

  return (
    <article className="rounded-sm border bg-card p-6 shadow-sm sm:p-8">
      <h2 className="text-xl font-semibold text-cas-navy">{t("city.aboutCity", { city })}</h2>
      {profile.summary && (
        <div className="mt-3 max-w-3xl space-y-3 text-sm leading-relaxed text-foreground/90">
          {profile.summary.split("\n\n").map((p, i) => <p key={i}>{p}</p>)}
        </div>
      )}
      {groups.length > 1 && (
        <nav aria-label={t("city.aboutCity", { city })} className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 border-y py-3 text-sm">
          {groups.map(({ g }) => <a key={g} href={`#city-${g}`} className="text-cas-navy hover:underline">{t(`city.groups.${g}`)}</a>)}
        </nav>
      )}
      <div className="mt-6 max-w-3xl space-y-10">
        {groups.map(({ g, sections }) => (
          <section key={g} id={`city-${g}`} className="scroll-mt-24">
            <h2 className="text-lg font-semibold text-cas-navy">{t(`city.groups.${g}`)}</h2>
            <div className="mt-3 space-y-5">
              {sections.map((s, i) => {
                const blocks: ({ t: "p"; x: string } | { t: "ul"; items: string[] })[] = []
                for (const b of s.blocks) {
                  const last = blocks[blocks.length - 1]
                  if (b.t === "li") {
                    if (last && last.t === "ul") last.items.push(b.x)
                    else blocks.push({ t: "ul", items: [b.x] })
                  } else blocks.push({ t: "p", x: b.x })
                }
                const sameAsGroup = s.level === 2 && sections.filter((x) => x.level === 2).length === 1

                return (
                  <div key={i}>
                    {!sameAsGroup && <h3 className="text-base font-semibold text-foreground">{s.h}</h3>}
                    <div className="mt-1.5 space-y-3 text-sm leading-relaxed text-foreground/90">
                      {blocks.map((b, j) => b.t === "p" ? (
                        <p key={j}>{b.x}</p>
                      ) : (
                        <ul key={j} className="grid list-disc gap-x-8 gap-y-1 pl-5 sm:grid-cols-2">{b.items.map((x, k) => <li key={k}>{x}</li>)}</ul>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>
      {profile.source_url && (
        <p className="mt-8 border-t pt-4 text-xs text-muted-foreground">
          {t("city.sourceLabel")}{" "}
          <a href={profile.source_url} target="_blank" rel="noreferrer" className="text-cas-navy hover:underline">Wikipedia</a>
          {" (CC BY-SA 4.0)"}
        </p>
      )}
    </article>
  )
}

/** A city landing page: what it is like to study there, and every university in it, with a filter for long lists. */
export default function SiteCity() {
  const { t } = useTranslation()
  const { slug = "" } = useParams()
  const { data, isPending, isError } = useQuery({ queryKey: ["site-city", slug], queryFn: () => getSiteCity(slug), retry: false })

  const [q, setQ] = useState("")
  const [moeOnly, setMoeOnly] = useState(false)
  const [sort, setSort] = useState<"name" | "programs">("name")
  const [shown, setShown] = useState(PAGE)

  useSeo({
    title: data ? t("city.seoTitle", { city: data.city }) : t("city.seoTitleFallback"),
    description: data ? t("city.seoDescription", { city: data.city, count: data.universities.length }) : undefined,
    canonicalPath: `/site/cities/${slug}`,
  })

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    const rows = (data?.universities ?? []).filter((u) =>
      (!moeOnly || u.moe_listed) &&
      (!term || [u.name, u.name_zh, u.institution_type, ...(u.programs_preview ?? [])].some((x) => x?.toLowerCase().includes(term))))

    return sort === "programs" ? [...rows].sort((a, b) => (b.programs_count ?? 0) - (a.programs_count ?? 0) || a.name.localeCompare(b.name)) : rows
  }, [data, q, moeOnly, sort])

  if (isPending) return <Skeleton className="h-96 w-full rounded-sm" />
  if (isError || !data) return <SiteNotFound />

  const cover = data.universities.find((u) => u.cover_url)
  const total = data.universities.length
  const stats: [string, number | string][] = [
    [t("city.universitiesCount"), total],
    [t("city.moeCount"), data.universities.filter((u) => u.moe_listed).length],
    [t("city.programsCount"), data.universities.reduce((n, u) => n + (u.programs_count ?? 0), 0)],
  ]
  if (data.province) stats.unshift([t("city.province"), data.province])
  const filtering = q.trim() !== "" || moeOnly

  return (
    <div className="space-y-8">
      <SitePageHeader
        eyebrow={data.province ?? undefined}
        title={t("city.title", { city: data.city })}
        subtitle={t("city.subtitle", { city: data.city, count: total })}
        image={cover?.cover_url ? { src: cover.cover_url } : undefined}
      />

      <dl aria-label={t("city.atAGlance")} className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border bg-border shadow-sm sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="bg-card p-4">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-1 text-lg font-semibold text-cas-navy">{value}</dd>
          </div>
        ))}
      </dl>

      {data.profile && data.profile.sections.length > 0
        ? <CityProfileArticle profile={data.profile} city={data.city} />
        : data.sections.length > 0 && <OverviewArticle sections={data.sections} />}

      <SiteSection title={t("city.universities", { city: data.city })}>
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-sm border bg-card p-3 shadow-sm">
          <div className="relative min-w-52 flex-1 sm:max-w-md">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => { setQ(e.target.value); setShown(PAGE) }}
              placeholder={t("city.searchPlaceholder", { city: data.city })}
              aria-label={t("city.searchAria")}
              className="h-10 bg-background pl-9"
            />
          </div>
          <button
            type="button"
            onClick={() => { setMoeOnly((v) => !v); setShown(PAGE) }}
            aria-pressed={moeOnly}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-sm border px-3 text-sm font-medium transition-colors",
              moeOnly ? "border-cas-red bg-cas-red-50 text-cas-red-600" : "bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            <ShieldCheck className="size-4" /> {t("city.moeOnly")}
          </button>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as "name" | "programs")}
            aria-label={t("universities.sortLabel", { defaultValue: "Sort" })}
            className="h-10 rounded-sm border bg-background px-3 text-sm text-foreground"
          >
            <option value="name">{t("city.sortName")}</option>
            <option value="programs">{t("city.sortPrograms")}</option>
          </select>
          {filtering && (
            <button type="button" onClick={() => { setQ(""); setMoeOnly(false) }} className="text-sm text-cas-navy hover:underline">{t("city.clear")}</button>
          )}
        </div>

        {total > PAGE && <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">{t("city.showing", { shown: Math.min(shown, filtered.length), total: filtered.length })}</p>}

        {filtered.length === 0 ? (
          <p className="rounded-sm border bg-card p-8 text-center text-sm text-muted-foreground">{t("city.noMatch", { city: data.city })}</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.slice(0, shown).map((u) => <UniCard key={u.id} u={u} />)}
          </div>
        )}

        {filtered.length > shown && (
          <div className="mt-6 text-center">
            <button type="button" onClick={() => setShown((n) => n + PAGE)} className="rounded-sm border bg-card px-5 py-2 text-sm font-medium text-cas-navy shadow-sm hover:bg-subtle">
              {t("city.showMore")}
            </button>
          </div>
        )}
      </SiteSection>
      <p className="text-center text-sm"><Link to="/site/cities" className="text-cas-navy hover:underline">{t("city.allCities")}</Link></p>
    </div>
  )
}

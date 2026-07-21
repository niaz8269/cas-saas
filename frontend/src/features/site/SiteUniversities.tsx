import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { School, Search, ShieldCheck } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { getSiteUniversities } from "@/features/site/api"
import { SitePageHeader, UniCard } from "@/features/site/components"
import { useSeo } from "@/lib/seo"
import { cn } from "@/lib/utils"

// Contextual "topic" views so distinct index links land on distinct,
// framed university lists (backend has no topic flags yet, so these set the
// heading + the closest real filter — MoE and/or a keyword).
// eyebrow/title/subtitle are i18n keys resolved at render; q stays a query value.
const TOPICS: Record<string, { eyebrow: string; title: string; subtitle: string; moe?: boolean; q?: string }> = {
  moe: { eyebrow: "universities.topicMoeEyebrow", title: "universities.topicMoeTitle", subtitle: "universities.topicMoeSubtitle", moe: true },
  "no-csca": { eyebrow: "universities.topicNoCscaEyebrow", title: "universities.topicNoCscaTitle", subtitle: "universities.topicNoCscaSubtitle", moe: true },
  deadlines: { eyebrow: "universities.topicDeadlinesEyebrow", title: "universities.topicDeadlinesTitle", subtitle: "universities.topicDeadlinesSubtitle" },
  "free-apply": { eyebrow: "universities.topicFreeApplyEyebrow", title: "universities.topicFreeApplyTitle", subtitle: "universities.topicFreeApplySubtitle", moe: true },
  medical: { eyebrow: "universities.topicMedicalEyebrow", title: "universities.topicMedicalTitle", subtitle: "universities.topicMedicalSubtitle", q: "Medical" },
}

// labelKey is an i18n key resolved at render; cmp stays; the record keys are sort URL values.
const SORTS: Record<string, { labelKey: string; cmp: (a: { name: string; id: number; programs_count?: number }, b: { name: string; id: number; programs_count?: number }) => number }> = {
  name: { labelKey: "universities.sortNameLabel", cmp: (a, b) => a.name.localeCompare(b.name) },
  programs: { labelKey: "universities.sortProgramsLabel", cmp: (a, b) => (b.programs_count ?? 0) - (a.programs_count ?? 0) },
  newest: { labelKey: "universities.sortNewestLabel", cmp: (a, b) => b.id - a.id },
}

export default function SiteUniversities() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const topic = TOPICS[params.get("topic") ?? ""]
  const sortKey = params.get("sort") ?? ""
  const sort = SORTS[sortKey]

  useSeo({
    title: topic ? t(topic.title) : t("universities.pageTitle"),
    description: t("universities.seoDescription"),
    canonicalPath: "/site/universities",
  })

  const [searchInput, setSearchInput] = useState(params.get("q") ?? topic?.q ?? "")
  const [q, setQ] = useState(params.get("q") ?? topic?.q ?? "")
  const [moe, setMoe] = useState(params.get("moe") === "1" || !!topic?.moe)
  const [city, setCity] = useState(params.get("city") ?? "")
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = setTimeout(() => { setQ(searchInput); setPage(1) }, 300)

    return () => clearTimeout(t)
  }, [searchInput])

  const { data, isPending, isError } = useQuery({
    queryKey: ["site-universities", { q, moe, city, page }],
    queryFn: () => getSiteUniversities({ q: q || undefined, moe, city: city || undefined, page }),
    placeholderData: keepPreviousData,
  })

  const universities = sort ? [...(data?.data ?? [])].sort(sort.cmp) : data?.data ?? []
  const cities = data?.cities ?? []
  const meta = data?.meta

  return (
    <div className="space-y-6">
      <SitePageHeader
        eyebrow={topic ? t(topic.eyebrow) : (sort ? t("universities.sortedBy", { label: t(sort.labelKey) }) : t("universities.eyebrowPartnerNetwork"))}
        title={topic ? t(topic.title) : t("universities.pageTitle")}
        subtitle={topic ? t(topic.subtitle) : t("universities.pageSubtitle")}
      />

      <div className="flex flex-wrap items-center gap-3 rounded-sm border bg-card p-4 shadow-sm">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("universities.searchPlaceholder")}
            className="h-11 bg-background pl-9"
            aria-label={t("universities.searchAriaLabel")}
          />
        </div>
        <select
          value={city}
          onChange={(e) => { setCity(e.target.value); setPage(1) }}
          aria-label={t("universities.filterByCityAriaLabel")}
          className="h-11 rounded-sm border bg-background px-3 text-sm text-foreground"
        >
          <option value="">{t("universities.allCities")}</option>
          {cities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          type="button"
          onClick={() => { setMoe((v) => !v); setPage(1) }}
          aria-pressed={moe}
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-sm border px-4 text-sm font-medium transition-colors",
            moe ? "border-cas-red bg-cas-red-50 text-cas-red-600" : "bg-background text-muted-foreground hover:text-foreground",
          )}
        >
          <ShieldCheck className="size-4" /> {t("universities.moeListedOnly")}
        </button>
      </div>

      {isError && (
        <div className="rounded-sm border bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-destructive">{t("universities.loadError")}</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isPending && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-sm" />)}

        {!isPending && universities.length === 0 && !isError && (
          <div className="col-span-full rounded-sm border bg-card p-12 text-center shadow-sm">
            <School className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">{t("universities.emptyTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("universities.emptyHint")}</p>
          </div>
        )}

        {universities.map((u) => <UniCard key={u.id} u={u} />)}
      </div>

      {meta && meta.total > 0 && meta.last_page > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={meta.current_page <= 1} onClick={() => setPage((p) => p - 1)}>{t("universities.previous")}</Button>
          <span className="text-sm text-muted-foreground">{t("universities.pageOf", { current: meta.current_page, total: meta.last_page })}</span>
          <Button variant="secondary" size="sm" disabled={meta.current_page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>{t("universities.next")}</Button>
        </div>
      )}
    </div>
  )
}

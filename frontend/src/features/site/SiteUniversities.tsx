import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { School, Search, ShieldCheck } from "lucide-react"
import { useEffect, useState } from "react"
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
const TOPICS: Record<string, { eyebrow: string; title: string; subtitle: string; moe?: boolean; q?: string }> = {
  moe: { eyebrow: "Recognised worldwide", title: "Ministry of Education–listed universities", subtitle: "Officially recognised universities whose degrees are valid worldwide.", moe: true },
  "no-csca": { eyebrow: "Admissions", title: "No-CSCA universities", subtitle: "Universities that admit international students without sitting the CSCA test.", moe: true },
  deadlines: { eyebrow: "Apply soon", title: "Universities with late deadlines", subtitle: "Still open for the coming intake — apply before the seats fill up." },
  "free-apply": { eyebrow: "Free to apply", title: "Free-application universities", subtitle: "Apply to selected universities with no application fee through CAS.", moe: true },
  medical: { eyebrow: "Medicine", title: "Medical universities", subtitle: "Leading universities for MBBS, dentistry, nursing and pharmacy in China.", q: "Medical" },
}

const SORTS: Record<string, { label: string; cmp: (a: { name: string; id: number; programs_count?: number }, b: { name: string; id: number; programs_count?: number }) => number }> = {
  name: { label: "A–Z", cmp: (a, b) => a.name.localeCompare(b.name) },
  programs: { label: "Most programs", cmp: (a, b) => (b.programs_count ?? 0) - (a.programs_count ?? 0) },
  newest: { label: "Newest", cmp: (a, b) => b.id - a.id },
}

export default function SiteUniversities() {
  const [params] = useSearchParams()
  const topic = TOPICS[params.get("topic") ?? ""]
  const sortKey = params.get("sort") ?? ""
  const sort = SORTS[sortKey]

  useSeo({
    title: topic?.title ?? "Universities in China",
    description: "Browse Ministry of Education–listed universities in China. Compare their programs, intakes and scholarships and apply with CAS.",
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
        eyebrow={topic?.eyebrow ?? (sort ? `Sorted by ${sort.label}` : "Partner network")}
        title={topic?.title ?? "Universities in China"}
        subtitle={topic?.subtitle ?? "Browse Ministry of Education–listed universities and explore their programs, intakes and scholarships."}
      />

      <div className="flex flex-wrap items-center gap-3 rounded-sm border bg-card p-4 shadow-sm">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search universities or cities…"
            className="h-11 bg-background pl-9"
            aria-label="Search universities"
          />
        </div>
        <select
          value={city}
          onChange={(e) => { setCity(e.target.value); setPage(1) }}
          aria-label="Filter by city"
          className="h-11 rounded-sm border bg-background px-3 text-sm text-foreground"
        >
          <option value="">All cities</option>
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
          <ShieldCheck className="size-4" /> MoE-listed only
        </button>
      </div>

      {isError && (
        <div className="rounded-sm border bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-destructive">Couldn't load universities right now.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isPending && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-sm" />)}

        {!isPending && universities.length === 0 && !isError && (
          <div className="col-span-full rounded-sm border bg-card p-12 text-center shadow-sm">
            <School className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No universities found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different search or clear the filter.</p>
          </div>
        )}

        {universities.map((u) => <UniCard key={u.id} u={u} />)}
      </div>

      {meta && meta.total > 0 && meta.last_page > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={meta.current_page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {meta.current_page} of {meta.last_page}</span>
          <Button variant="secondary" size="sm" disabled={meta.current_page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  )
}

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { Award, CalendarClock, School, Search } from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { getSiteScholarships, type SiteScholarship } from "@/features/site/api"
import { SitePageHeader } from "@/features/site/components"
import { useSeo } from "@/lib/seo"

function amountLabel(s: SiteScholarship): string | null {
  if (s.coverage) return s.coverage
  if (s.amount != null) return `${Number(s.amount).toLocaleString()} ${s.currency ?? "CNY"}`

  return null
}

export default function SiteScholarships() {
  useSeo({
    title: "Scholarships to Study in China",
    description: "Scholarships to study in China — government, provincial and university awards, full and partial. Check coverage and deadlines and apply with CAS.",
    canonicalPath: "/site/scholarships",
  })

  const [params] = useSearchParams()
  const [searchInput, setSearchInput] = useState(params.get("q") ?? "")
  const [q, setQ] = useState(params.get("q") ?? "")
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = setTimeout(() => { setQ(searchInput); setPage(1) }, 300)

    return () => clearTimeout(t)
  }, [searchInput])

  const { data, isPending, isError } = useQuery({
    queryKey: ["site-scholarships", { q, page }],
    queryFn: () => getSiteScholarships({ q: q || undefined, page }),
    placeholderData: keepPreviousData,
  })

  const scholarships = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-6">
      <SitePageHeader
        eyebrow="Funding"
        title="Scholarships & funding"
        subtitle="Full and partial awards offered by our partner universities. We help you find and apply for the ones you qualify for."
      />

      <div className="relative sm:max-w-md">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search scholarships…"
          className="h-11 bg-background pl-9"
          aria-label="Search scholarships"
        />
      </div>

      {isError && (
        <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-destructive">Couldn't load scholarships right now.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isPending && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 rounded-xl" />)}

        {!isPending && scholarships.length === 0 && !isError && (
          <div className="col-span-full rounded-xl border bg-card p-12 text-center shadow-sm">
            <Award className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No scholarships found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different search.</p>
          </div>
        )}

        {scholarships.map((s) => (
          <div key={s.id} className="flex flex-col rounded-2xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-cas-gold/40 hover:shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <span className="inline-flex size-10 items-center justify-center rounded-lg bg-cas-navy-50 text-cas-navy"><Award className="size-5" /></span>
              {s.type && <Badge variant="outline" className="border-transparent bg-cas-navy-50 text-cas-navy capitalize">{s.type}</Badge>}
            </div>
            <h2 className="mt-3 font-semibold text-cas-navy">{s.name}</h2>
            {amountLabel(s) && <p className="mt-1 text-sm font-medium">{amountLabel(s)}</p>}
            {s.description && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{s.description}</p>}

            <div className="mt-auto space-y-1.5 pt-4 text-xs text-muted-foreground">
              {s.university?.slug && (
                <Link to={`/site/universities/${s.university.slug}`} className="inline-flex items-center gap-1 font-medium text-cas-navy hover:underline">
                  <School className="size-3.5" /> {s.university.name}
                </Link>
              )}
              {s.deadline && (
                <p className="flex items-center gap-1"><CalendarClock className="size-3.5" /> Apply by {new Date(s.deadline).toLocaleDateString()}</p>
              )}
            </div>
          </div>
        ))}
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

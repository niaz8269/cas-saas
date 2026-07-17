import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { GraduationCap, School, Search, ShieldCheck } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { getSiteUniversities } from "@/features/site/api"
import { cn } from "@/lib/utils"

export default function SiteHome() {
  const [searchInput, setSearchInput] = useState("")
  const [q, setQ] = useState("")
  const [moe, setMoe] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => {
    const t = setTimeout(() => { setQ(searchInput); setPage(1) }, 300)

    return () => clearTimeout(t)
  }, [searchInput])

  const { data, isPending, isError } = useQuery({
    queryKey: ["site-universities", { q, moe, page }],
    queryFn: () => getSiteUniversities({ q: q || undefined, moe, page }),
    placeholderData: keepPreviousData,
  })

  const universities = data?.data ?? []
  const meta = data?.meta

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="rounded-2xl border bg-card p-6 shadow-sm sm:p-10">
        <h1 className="text-2xl font-semibold text-cas-navy sm:text-3xl">Study in China with CAS</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Explore partner universities and their programs, intakes and scholarships. Find your program and enquire in minutes.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
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
          <button
            type="button"
            onClick={() => { setMoe((v) => !v); setPage(1) }}
            aria-pressed={moe}
            className={cn(
              "inline-flex h-11 items-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors",
              moe ? "border-cas-navy bg-cas-navy-50 text-cas-navy" : "bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            <ShieldCheck className="size-4" /> MoE-listed only
          </button>
        </div>
      </section>

      {isError && (
        <div className="rounded-xl border bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-destructive">Couldn't load universities right now.</p>
        </div>
      )}

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isPending &&
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}

        {!isPending && universities.length === 0 && !isError && (
          <div className="col-span-full rounded-xl border bg-card p-12 text-center shadow-sm">
            <School className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">No universities found</p>
            <p className="mt-1 text-sm text-muted-foreground">Try a different search or clear the filter.</p>
          </div>
        )}

        {universities.map((u) => (
          <Link
            key={u.id}
            to={u.slug ? `/site/universities/${u.slug}` : "#"}
            className="group flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="relative h-32 bg-subtle">
              {u.cover_url ? (
                <img src={u.cover_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center"><School className="size-8 text-muted-foreground/40" /></div>
              )}
              {u.moe_listed && (
                <Badge variant="outline" className="absolute top-2 right-2 border-transparent bg-white/90 text-cas-navy">
                  <ShieldCheck className="size-3.5" /> MoE
                </Badge>
              )}
            </div>
            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-start gap-3">
                {u.logo_url && (
                  <img src={u.logo_url} alt="" className="size-10 shrink-0 rounded-lg border bg-white object-contain p-0.5" />
                )}
                <div className="min-w-0">
                  <h2 className="font-semibold text-cas-navy group-hover:underline">{u.name}</h2>
                  <p className="text-xs text-muted-foreground">{[u.city, u.country].filter(Boolean).join(", ")}</p>
                </div>
              </div>
              {u.about && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{u.about}</p>}
              <div className="mt-auto flex items-center gap-1.5 pt-3 text-xs text-muted-foreground">
                <GraduationCap className="size-3.5" /> {u.programs_count ?? 0} program{u.programs_count === 1 ? "" : "s"}
              </div>
            </div>
          </Link>
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

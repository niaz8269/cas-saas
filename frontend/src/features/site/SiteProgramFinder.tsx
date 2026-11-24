import { HEADER_IMAGES } from "@/features/site/headerImages"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import type { TFunction } from "i18next"
import { Clock, GraduationCap, Languages, MapPin, School, Search } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useSearchParams } from "react-router-dom"
import PortalLink from "@/features/site/PortalLink"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import SearchSuggestion from "@/features/site/SearchSuggestion"
import { getSitePrograms, getSiteUniversities, type SiteProgram } from "@/features/site/api"
import { SitePageHeader } from "@/features/site/components"
import { formatDuration } from "@/lib/duration"
import { useSeo } from "@/lib/seo"
import { cn } from "@/lib/utils"
import PageFaqs from "@/features/site/SiteFaqs"
import { mediumFor } from "@/lib/programLanguage"

// Display labels are i18n keys resolved at render; option `value`s are the
// query-param values sent to the API and must stay unchanged.
const LEVELS = [
  { value: "all", labelKey: "programs.levelAll" },
  { value: "bachelor", labelKey: "programs.levelBachelor" },
  { value: "master", labelKey: "programs.levelMaster" },
  { value: "phd", labelKey: "programs.levelPhd" },
]

const SORTS = [
  { value: "", label: "Degrees first, then cheapest" },
  { value: "fee", label: "Lowest tuition" },
  { value: "fee_desc", label: "Highest tuition" },
  { value: "duration", label: "Shortest duration" },
  { value: "name", label: "Name A–Z" },
]

const selectCls = "h-11 w-full rounded-sm border bg-background px-3 text-sm text-foreground"

function money(value: SiteProgram["tuition_fee"], currency: string | null, t: TFunction): string {
  if (value == null) return t("programs.feeOnRequest")

  return t("programs.perYear", { amount: Number(value).toLocaleString(), currency: currency ?? "CNY" })
}

/** Page numbers to show around the current page: 1 … 4 5 [6] 7 8 … 97. */
function pageWindow(current: number, last: number): (number | "gap")[] {
  const pages = new Set([1, last, current - 2, current - 1, current, current + 1, current + 2].filter((n) => n >= 1 && n <= last))
  const sorted = [...pages].sort((a, b) => a - b)
  const out: (number | "gap")[] = []
  sorted.forEach((n, i) => {
    if (i > 0 && n - sorted[i - 1] > 1) out.push("gap")
    out.push(n)
  })

  return out
}

function Field({ id, label, children, className }: { id: string; label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  )
}

export default function SiteProgramFinder() {
  const { t } = useTranslation()
  useSeo({
    title: t("programs.seoTitle"),
    description: t("programs.seoDescription"),
    canonicalPath: "/site/programs",
  })

  // Filters live in the address bar so a search can be shared, bookmarked and reached with the back button.
  const [params, setParams] = useSearchParams()
  const [searchInput, setSearchInput] = useState(params.get("q") ?? "")
  const q = params.get("q") ?? ""
  const level = params.get("level") ?? "all"
  const maxFee = params.get("maxFee") ?? ""
  const city = params.get("city") ?? ""
  const csc = params.get("csc") === "1"
  const sortKey = params.get("sort") ?? ""
  const serverSort = ["fee", "fee_desc", "duration", "name"].includes(sortKey) ? sortKey : ""
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1)

  const update = (changes: Record<string, string | null>, keepPage = false) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(changes)) {
      if (v == null || v === "" || v === "all") next.delete(k)
      else next.set(k, v)
    }
    if (!keepPage) next.delete("page")
    setParams(next, { replace: true })
  }

  useEffect(() => {
    if (searchInput === q) return
    const timer = setTimeout(() => update({ q: searchInput }), 300)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput])

  const { data: lists } = useQuery({
    queryKey: ["site-universities-lists"],
    queryFn: () => getSiteUniversities({ perPage: 1, include: ["lists"] }),
    staleTime: 3_600_000,
  })

  const { data, isPending, isError, isFetching } = useQuery({
    queryKey: ["site-programs", { q, level, maxFee, city, csc, sort: serverSort, page }],
    queryFn: () => getSitePrograms({
      q: q || undefined,
      level: level === "all" ? undefined : level,
      maxFee: maxFee || undefined,
      city: city || undefined,
      csc: csc || undefined,
      sort: serverSort || undefined,
      page,
    }),
    placeholderData: keepPreviousData,
  })

  // Older footer links use ?sort=newest; keep that one client-side.
  const programs = (() => {
    const list = [...(data?.data ?? [])]
    if (sortKey === "newest") return list.sort((a, b) => b.id - a.id)

    return list
  })()
  const meta = data?.meta

  const activeFilters = [q, level !== "all" ? level : "", maxFee, city, csc ? "1" : ""].filter(Boolean).length
  const clearAll = () => { setSearchInput(""); setParams(new URLSearchParams(), { replace: true }) }

  const resultsRef = useRef<HTMLHeadingElement>(null)
  const goToPage = (n: number) => {
    update({ page: String(n) }, true)
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    resultsRef.current?.focus({ preventScroll: true })
  }

  return (
    <div className="space-y-6">
      <SitePageHeader image={HEADER_IMAGES.programs}
        eyebrow={t("programs.eyebrow")}
        title={t("programs.title")}
        subtitle={t("programs.subtitle")}
      />

      {/* Filters */}
      <form role="search" aria-label={t("programs.filtersAria", { defaultValue: "Program filters" })} onSubmit={(e) => { e.preventDefault(); update({ q: searchInput }) }}
        className="space-y-3 rounded-sm border bg-card p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field id="pf-q" label={t("programs.searchAria")} className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute bottom-3.5 left-3 size-4 text-muted-foreground" aria-hidden />
            <Input id="pf-q" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder={t("programs.searchPlaceholder")} className="h-11 bg-background pl-9" type="search" />
          </Field>
          <Field id="pf-level" label={t("programs.levelAria")}>
            <select id="pf-level" className={selectCls} value={level} onChange={(e) => update({ level: e.target.value })}>
              {LEVELS.map((l) => <option key={l.value} value={l.value}>{t(l.labelKey)}</option>)}
            </select>
          </Field>
          <Field id="pf-city" label={t("programs.cityLabel", { defaultValue: "City" })}>
            <select id="pf-city" className={selectCls} value={city} onChange={(e) => update({ city: e.target.value })}>
              <option value="">{t("programs.allCities", { defaultValue: "All cities" })}</option>
              {(lists?.cities ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field id="pf-fee" label={t("programs.maxFeeAria")}>
            <Input id="pf-fee" value={maxFee} onChange={(e) => update({ maxFee: e.target.value.replace(/[^0-9]/g, "") })} inputMode="numeric" placeholder={t("programs.maxFeePlaceholder")} className="h-11 bg-background" />
          </Field>
          <Field id="pf-sort" label={t("programs.sortLabel", { defaultValue: "Sort by" })}>
            <select id="pf-sort" className={selectCls} value={serverSort} onChange={(e) => update({ sort: e.target.value })}>
              {SORTS.map((s) => <option key={s.value} value={s.value}>{t(`programs.sort.${s.value || "default"}`, { defaultValue: s.label })}</option>)}
            </select>
          </Field>
          <div className="flex items-end gap-2 sm:col-span-2">
            <button type="button" aria-pressed={csc} onClick={() => update({ csc: csc ? null : "1" })}
              className={cn("h-11 rounded-sm border px-4 text-sm font-medium transition-colors", csc ? "border-cas-navy bg-cas-navy-50 text-cas-navy" : "bg-background text-muted-foreground hover:text-foreground")}>
              {t("programs.cscOnly", { defaultValue: "CSC scholarship listed" })}
            </button>
            {activeFilters > 0 && (
              <button type="button" onClick={clearAll} className="h-11 px-2 text-sm font-medium text-cas-navy hover:underline">
                {t("programs.clearFilters", { defaultValue: "Clear filters" })} ({activeFilters})
              </button>
            )}
          </div>
        </div>
      </form>

      <SearchSuggestion suggestion={data?.suggestion} />

      {isError && (
        <div role="alert" className="rounded-sm border bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-destructive">{t("programs.loadError")}</p>
        </div>
      )}

      {/* Results */}
      <h2 ref={resultsRef} tabIndex={-1} className="text-sm font-medium text-muted-foreground outline-none" aria-live="polite">
        {meta
          ? t("programs.resultCount", { defaultValue: "{{formattedCount}} programs", formattedCount: meta.total.toLocaleString() })
            + (meta.last_page > 1 ? ` · ${t("programs.pageOf", { current: meta.current_page, last: meta.last_page })}` : "")
          : t("programs.loading", { defaultValue: "Loading programs…" })}
      </h2>

      <div className="space-y-3" aria-busy={isFetching}>
        {isPending && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-sm" />)}

        {!isPending && programs.length === 0 && !isError && (
          <div className="rounded-sm border bg-card p-12 text-center shadow-sm">
            <GraduationCap className="mx-auto size-8 text-muted-foreground" aria-hidden />
            <p className="mt-3 text-sm font-medium">{t("programs.emptyTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("programs.emptyBody")}</p>
            {activeFilters > 0 && <Button type="button" variant="outline" size="sm" className="mt-4" onClick={clearAll}>{t("programs.clearFilters", { defaultValue: "Clear filters" })}</Button>}
          </div>
        )}

        {programs.map((p) => (
          <div key={p.id} className="flex flex-col gap-3 rounded-sm border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-cas-red/40 hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-cas-navy-50 px-2.5 py-0.5 text-[11px] font-semibold text-cas-navy capitalize">{p.level.replace("_", "-")}</span>
                <h3 className="font-semibold text-cas-navy">{p.name}</h3>
                {p.csc_listed && <span className="inline-flex items-center rounded-full border border-cas-navy/20 px-2 py-0.5 text-[11px] text-cas-navy">CSC</span>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {mediumFor(p) && <span className="inline-flex items-center gap-1"><Languages className="size-3.5" aria-hidden /> {mediumFor(p)}</span>}
                {p.duration_months && <span className="inline-flex items-center gap-1"><Clock className="size-3.5" aria-hidden /> {formatDuration(p.duration_months, t)}</span>}
                {p.university?.slug && (
                  <Link to={`/site/universities/${p.university.slug}`} className="inline-flex items-center gap-1 font-medium text-cas-navy hover:text-cas-red-600">
                    <School className="size-3.5" aria-hidden /> {p.university.name}
                  </Link>
                )}
                {p.university?.city && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden /> {p.university.city}</span>}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
              {p.fee_locked ? (
                <PortalLink to="/portal/login" className="text-sm font-semibold text-cas-red hover:underline">{t("programs.signInForFees")}</PortalLink>
              ) : (
                <span className="text-right">
                  <span className="block font-bold tabular-nums text-cas-navy">{money(p.tuition_fee, p.currency, t)}</span>
                  {p.service_charge && (
                    <span className="block text-xs font-normal text-muted-foreground">
                      {t("programs.serviceFee", { amount: Number(p.service_charge.amount).toLocaleString(), currency: p.service_charge.currency })}
                    </span>
                  )}
                </span>
              )}
              {p.university?.slug && (
                <Link to={`/site/universities/${p.university.slug}`} aria-label={`${t("programs.viewDetails")}: ${p.name}, ${p.university.name}`}
                  className="inline-flex h-9 items-center gap-1 rounded-sm bg-cas-navy px-3.5 text-xs font-semibold text-white hover:bg-cas-navy-700">
                  {t("programs.viewDetails")}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {meta && meta.total > 0 && meta.last_page > 1 && (
        <nav aria-label={t("programs.pagination", { defaultValue: "Pagination" })} className="flex flex-wrap items-center justify-center gap-1.5">
          <Button variant="secondary" size="sm" disabled={meta.current_page <= 1} onClick={() => goToPage(meta.current_page - 1)}>{t("programs.previous")}</Button>
          {pageWindow(meta.current_page, meta.last_page).map((n, i) => n === "gap"
            ? <span key={`gap${i}`} className="px-1 text-muted-foreground" aria-hidden>…</span>
            : (
              <Button key={n} size="sm" variant={n === meta.current_page ? "default" : "outline"} aria-current={n === meta.current_page ? "page" : undefined}
                aria-label={t("programs.goToPage", { defaultValue: "Page {{n}}", n })} onClick={() => goToPage(n)}>{n}</Button>
            ))}
          <Button variant="secondary" size="sm" disabled={meta.current_page >= meta.last_page} onClick={() => goToPage(meta.current_page + 1)}>{t("programs.next")}</Button>
        </nav>
      )}
      <PageFaqs path="site/programs" />
    </div>
  )
}

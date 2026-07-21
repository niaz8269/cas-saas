import { keepPreviousData, useQuery } from "@tanstack/react-query"
import type { TFunction } from "i18next"
import { Clock, GraduationCap, Languages, School, Search } from "lucide-react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useSearchParams } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { getSitePrograms, type SiteProgram } from "@/features/site/api"
import { SitePageHeader } from "@/features/site/components"
import { useSeo } from "@/lib/seo"

// Display labels are i18n keys resolved at render; option `value`s are the
// query-param values sent to the API and must stay unchanged.
const LEVELS = [
  { value: "all", labelKey: "programs.levelAll" },
  { value: "bachelor", labelKey: "programs.levelBachelor" },
  { value: "master", labelKey: "programs.levelMaster" },
  { value: "phd", labelKey: "programs.levelPhd" },
]

const LANGUAGES = [
  { value: "all", labelKey: "programs.langAny" },
  { value: "English", labelKey: "programs.langEnglish" },
  { value: "Chinese", labelKey: "programs.langChinese" },
]

function money(value: SiteProgram["tuition_fee"], currency: string | null, t: TFunction): string {
  if (value == null) return t("programs.feeOnRequest")

  return t("programs.perYear", { amount: Number(value).toLocaleString(), currency: currency ?? "CNY" })
}

export default function SiteProgramFinder() {
  const { t } = useTranslation()
  useSeo({
    title: t("programs.seoTitle"),
    description: t("programs.seoDescription"),
    canonicalPath: "/site/programs",
  })

  const [params] = useSearchParams()
  const [searchInput, setSearchInput] = useState(params.get("q") ?? "")
  const [q, setQ] = useState(params.get("q") ?? "")
  const [level, setLevel] = useState(params.get("level") ?? "all")
  const [language, setLanguage] = useState(params.get("language") ?? "all")
  const [maxFee, setMaxFee] = useState(params.get("maxFee") ?? "")
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => { setQ(searchInput); setPage(1) }, 300)

    return () => clearTimeout(timer)
  }, [searchInput])

  const { data, isPending, isError } = useQuery({
    queryKey: ["site-programs", { q, level, language, maxFee, page }],
    queryFn: () => getSitePrograms({
      q: q || undefined,
      level: level === "all" ? undefined : level,
      language: language === "all" ? undefined : language,
      maxFee: maxFee || undefined,
      page,
    }),
    placeholderData: keepPreviousData,
  })

  // Optional client-side sort so distinct index links (?sort=popular|fee|newest)
  // land on distinct, framed program views.
  const sortKey = params.get("sort") ?? ""
  const feeOf = (f: string | number | null | undefined) => (f == null ? Infinity : Number(f))
  const programs = (() => {
    const list = [...(data?.data ?? [])]
    if (sortKey === "fee") return list.sort((a, b) => feeOf(a.tuition_fee) - feeOf(b.tuition_fee))
    if (sortKey === "newest") return list.sort((a, b) => b.id - a.id)
    return list // "popular" / default keeps API order
  })()
  const meta = data?.meta

  const reset = (setter: (v: string) => void) => (v: string) => { setter(v); setPage(1) }

  return (
    <div className="space-y-6">
      <SitePageHeader
        eyebrow={t("programs.eyebrow")}
        title={t("programs.title")}
        subtitle={t("programs.subtitle")}
      />

      {/* Filters */}
      <div className="grid gap-3 rounded-sm border bg-card p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("programs.searchPlaceholder")}
            className="h-11 bg-background pl-9"
            aria-label={t("programs.searchAria")}
          />
        </div>
        <Select value={level} onValueChange={reset(setLevel)}>
          <SelectTrigger className="h-11 bg-background" aria-label={t("programs.levelAria")}><SelectValue /></SelectTrigger>
          <SelectContent>{LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{t(l.labelKey)}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={language} onValueChange={reset(setLanguage)}>
          <SelectTrigger className="h-11 bg-background" aria-label={t("programs.languageAria")}><SelectValue /></SelectTrigger>
          <SelectContent>{LANGUAGES.map((l) => <SelectItem key={l.value} value={l.value}>{t(l.labelKey)}</SelectItem>)}</SelectContent>
        </Select>
        <Input
          value={maxFee}
          onChange={(e) => { setMaxFee(e.target.value.replace(/[^0-9]/g, "")); setPage(1) }}
          inputMode="numeric"
          placeholder={t("programs.maxFeePlaceholder")}
          className="h-11 bg-background"
          aria-label={t("programs.maxFeeAria")}
        />
      </div>

      {isError && (
        <div className="rounded-sm border bg-card p-8 text-center shadow-sm">
          <p className="text-sm text-destructive">{t("programs.loadError")}</p>
        </div>
      )}

      {/* Results */}
      <div className="space-y-3">
        {isPending && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-sm" />)}

        {!isPending && programs.length === 0 && !isError && (
          <div className="rounded-sm border bg-card p-12 text-center shadow-sm">
            <GraduationCap className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">{t("programs.emptyTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("programs.emptyBody")}</p>
          </div>
        )}

        {programs.map((p) => (
          <div key={p.id} className="flex flex-col gap-3 rounded-sm border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-cas-red/40 hover:shadow-md sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-cas-navy-50 px-2.5 py-0.5 text-[11px] font-semibold text-cas-navy capitalize">{p.level}</span>
                <h2 className="font-semibold text-cas-navy">{p.name}</h2>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {p.teaching_language && <span className="inline-flex items-center gap-1"><Languages className="size-3.5" /> {p.teaching_language}</span>}
                {p.duration_months && <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {t("programs.months", { count: p.duration_months })}</span>}
                {p.university?.slug && (
                  <Link to={`/site/universities/${p.university.slug}`} className="inline-flex items-center gap-1 font-medium text-cas-navy hover:text-cas-red-600">
                    <School className="size-3.5" /> {p.university.name}
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
              <span className="font-bold tabular-nums text-cas-navy">{money(p.tuition_fee, p.currency, t)}</span>
              {p.university?.slug && (
                <Link to={`/site/universities/${p.university.slug}`} className="inline-flex h-9 items-center gap-1 rounded-sm bg-cas-navy px-3.5 text-xs font-semibold text-white hover:bg-cas-navy-700">
                  {t("programs.viewDetails")}
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {meta && meta.total > 0 && meta.last_page > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="secondary" size="sm" disabled={meta.current_page <= 1} onClick={() => setPage((p) => p - 1)}>{t("programs.previous")}</Button>
          <span className="text-sm text-muted-foreground">{t("programs.pageOf", { current: meta.current_page, last: meta.last_page })}</span>
          <Button variant="secondary" size="sm" disabled={meta.current_page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>{t("programs.next")}</Button>
        </div>
      )}
    </div>
  )
}

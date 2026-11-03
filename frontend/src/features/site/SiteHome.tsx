import { useQuery } from "@tanstack/react-query"
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BookOpen,
  Building2,
  CalendarClock,
  CheckCircle2,
  Globe2,
  MessageCircle,
  Search,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import type { TFunction } from "i18next"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"

import { Skeleton } from "@/components/ui/skeleton"
import { getSitePrograms, getSiteUniversities, getSiteUniversity } from "@/features/site/api"
import heroBg from "@/assets/b1.webp"
import { AdmissionWindow, PhotoBanner, SiteSection, UniCard } from "@/features/site/components"
import HeroUpdates from "@/features/site/HeroUpdates"
import { organizationJsonLd, useSeo } from "@/lib/seo"


const DOT_GRID = {
  backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)",
  backgroundSize: "22px 22px",
}

// Popular-search shortcuts under the hero search (reference's quick tags).
// Labels are i18n keys resolved at render (report — 5-language support).
const POPULAR_SEARCHES: [string, string][] = [
  ["home.popularSearches.chineseLanguage", "/site/programs?q=Chinese"],
  ["home.popularSearches.mbbs", "/site/programs?q=MBBS"],
  ["home.popularSearches.internationalTrade", "/site/programs?q=Trade"],
  ["home.popularSearches.engineering", "/site/programs?q=Engineering"],
]

const HIGHLIGHTS: { titleKey: string; bodyKey: string; to: string; tagKey: string; icon: LucideIcon }[] = [
  { titleKey: "home.highlights.medicalTitle", bodyKey: "home.highlights.medicalBody", to: "/site/universities?moe=1", tagKey: "home.highlights.medicalTag", icon: BadgeCheck },
  { titleKey: "home.highlights.deadlinesTitle", bodyKey: "home.highlights.deadlinesBody", to: "/site/universities?topic=deadlines", tagKey: "home.highlights.deadlinesTag", icon: CalendarClock },
  { titleKey: "home.highlights.languageTitle", bodyKey: "home.highlights.languageBody", to: "/site/programs?language=Chinese", tagKey: "home.highlights.languageTag", icon: BookOpen },
  { titleKey: "home.highlights.valueTitle", bodyKey: "home.highlights.valueBody", to: "/site/programs?maxFee=20000", tagKey: "home.highlights.valueTag", icon: Wallet },
  { titleKey: "home.highlights.fullScholarshipTitle", bodyKey: "home.highlights.fullScholarshipBody", to: "/site/scholarships?type=full", tagKey: "home.highlights.fullScholarshipTag", icon: Award },
  { titleKey: "home.highlights.partialScholarshipTitle", bodyKey: "home.highlights.partialScholarshipBody", to: "/site/scholarships?type=partial", tagKey: "home.highlights.partialScholarshipTag", icon: Globe2 },
]

// Tabs carry a stable id plus an i18n labelKey; item titles are i18n keys too.
const FEATURED: { id: string; labelKey: string; items: { titleKey: string; to: string }[] }[] = [
  {
    id: "questions",
    labelKey: "home.featured.tabs.questions",
    items: [
      { titleKey: "home.featured.questions.recognition", to: "/site/faq?q=recognition" },
      { titleKey: "home.featured.questions.costs", to: "/site/pricing#costs" },
      { titleKey: "home.featured.questions.csca", to: "/site/faq?q=csca" },
      { titleKey: "home.featured.questions.scholarship", to: "/site/faq?q=scholarships" },
    ],
  },
  {
    id: "trending",
    labelKey: "home.featured.tabs.trending",
    items: [
      { titleKey: "home.featured.trending.mbbsEnglish", to: "/site/programs?language=English" },
      { titleKey: "home.featured.trending.engineering", to: "/site/programs?q=Engineering&level=master" },
      { titleKey: "home.featured.trending.business", to: "/site/programs?q=Business" },
      { titleKey: "home.featured.trending.fullTuition", to: "/site/scholarships?q=full-tuition" },
    ],
  },
]

const money = (t: TFunction, v: string | number | null | undefined, c?: string | null) =>
  v == null ? t("home.money.onRequest") : t("home.money.perYear", { amount: Number(v).toLocaleString(), currency: c ?? "CNY" })

export default function SiteHome() {
  const { t } = useTranslation()
  useSeo({
    title: t("home.seo.title"),
    description: t("home.seo.description"),
    canonicalPath: "/site",
    jsonLd: organizationJsonLd(),
  })

  const navigate = useNavigate()
  const [term, setTerm] = useState("")
  const [contentTab, setContentTab] = useState("questions")

  // Real data only: featured universities and programs are the ones with a published admission window that is open.
  const universities = useQuery({ queryKey: ["site-universities", "home"], queryFn: () => getSiteUniversities({ page: 1 }) })
  const openUniversities = useQuery({ queryKey: ["site-universities", "home-open"], queryFn: () => getSiteUniversities({ page: 1, openIntake: true }) })
  const programs = useQuery({ queryKey: ["site-programs", "home-open"], queryFn: () => getSitePrograms({ openIntake: true, language: "English" }) })

  const featuredUnis = (openUniversities.data?.data.length ? openUniversities.data.data : universities.data?.data)?.slice(0, 6) ?? []
  const moreUnis = universities.data?.data.slice(0, 10) ?? []
  const outstanding = programs.data?.data.slice(0, 5) ?? []

  // "Weekly program": a different open-window English-taught program each calendar week.
  const openPrograms = programs.data?.data ?? []
  const weekNumber = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 86_400_000))
  const weekly = openPrograms.length ? openPrograms[weekNumber % openPrograms.length] : undefined
  const weeklyUniversity = useQuery({
    queryKey: ["site-university", weekly?.university?.slug],
    queryFn: () => getSiteUniversity(weekly!.university!.slug as string),
    enabled: !!weekly?.university?.slug,
  })
  const today = new Date().setHours(0, 0, 0, 0)
  const weeklyWindow = weeklyUniversity.data?.data.intakes.find((i) => i.status !== "closed" && (!i.application_deadline || new Date(i.application_deadline).getTime() >= today))

  const runSearch = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(`/site/universities${term.trim() ? `?q=${encodeURIComponent(term.trim())}` : ""}`)
  }

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* ── Hero — full-screen photo, transparent header overlays it ──── */}
      <section className="site-bleed relative flex min-h-[92vh] flex-col text-white">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${heroBg})` }} />
          {/* Light at the very top (so the navy header/logo read on the misty
              sky), darkening downward so the heading and search stay legible. */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/25 to-black/60" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={DOT_GRID} />
        </div>

        {/* Content — centred in the space above the search */}
        <div className="relative flex flex-1 flex-col items-center justify-center px-4 pt-28 pb-6 text-center">
          <div className="w-full max-w-5xl">
            <h1 className="text-3xl font-normal tracking-tight [text-shadow:0_2px_12px_rgba(0,0,0,0.55)] sm:text-5xl md:text-[4rem] md:leading-[1.05]">{t("home.hero.title")}</h1>
            {featuredUnis[0] ? (
              <Link
                to={featuredUnis[0].slug ? `/site/universities/${featuredUnis[0].slug}` : "/site/programs?ref=featured"}
                className="mx-auto mt-5 block max-w-full text-sm break-words text-white/90 underline-offset-4 [text-shadow:0_1px_8px_rgba(0,0,0,0.55)] hover:text-white hover:underline sm:max-w-2xl sm:text-base"
              >
                {t("home.hero.featuredUniPrograms", { name: featuredUnis[0].name })}
              </Link>
            ) : (
              <p className="mx-auto mt-5 max-w-2xl text-sm text-white/85 [text-shadow:0_1px_8px_rgba(0,0,0,0.55)] sm:text-base">
                {t("home.hero.moePrograms")}
              </p>
            )}

            {/* Ranked featured universities + expander (reference's numbered cards) */}
            {featuredUnis.length > 0 && (
              <div className="mt-7">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {featuredUnis.slice(0, 3).map((u) => (
                    <Link
                      key={u.id}
                      to={u.slug ? `/site/universities/${u.slug}` : "#"}
                      className="group relative flex h-16 w-full items-center gap-2.5 overflow-hidden rounded-sm border border-cas-red/70 bg-white/5 px-3 pl-4 text-left backdrop-blur transition-colors hover:bg-white/10 sm:w-52"
                    >
                      {u.logo_url
                        ? <img src={u.logo_url} alt="" className="size-9 shrink-0 rounded-sm bg-white object-contain p-0.5" />
                        : <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-white/15 text-xs font-bold text-white">{u.name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("")}</span>}
                      <span className="line-clamp-2 text-xs font-medium text-white">{u.name}</span>
                    </Link>
                  ))}
                </div>
                <HeroUpdates universities={universities.data?.data ?? []} programs={programs.data?.data ?? []} />
              </div>
            )}
          </div>
        </div>

        {/* Search bar — sits over the bottom of the full-screen image, fully visible */}
        <div className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-8">
          <div className="rounded-sm bg-white p-5 shadow-xl ring-1 ring-black/5 sm:p-6">
            <form onSubmit={runSearch} className="flex">
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder={t("home.search.placeholder")}
                aria-label={t("home.search.ariaSearchField")}
                className="flex-1 rounded-l-sm border-2 border-r-0 border-cas-red bg-white px-4 py-3 text-sm text-ink placeholder:text-gray-400 outline-none focus:border-cas-red-600"
              />
              <button type="submit" aria-label={t("home.search.ariaSearchButton")} className="inline-flex items-center rounded-r-sm bg-cas-red px-6 text-white transition-colors hover:bg-cas-red-600">
                <Search className="size-5" />
              </button>
            </form>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {POPULAR_SEARCHES.map(([labelKey, to]) => (
                <Link key={labelKey} to={to} className="rounded-sm bg-gray-100 px-3 py-1 text-xs text-gray-500 transition-colors hover:bg-cas-red-50 hover:text-cas-red-600">
                  {t(labelKey)}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Weekly Programs spotlight ────────────────────────── */}
      <section>
        <h2 className="flex items-center justify-center gap-2 text-2xl font-bold text-cas-navy sm:text-[2rem]">
          <span className="size-2.5 animate-pulse rounded-full bg-cas-red" /> {t("home.weekly.title")}
        </h2>
        <div className="mt-10 grid gap-0 overflow-hidden rounded-sm border bg-card shadow-sm md:grid-cols-[1fr_1.4fr]">
          <PhotoBanner src="/images/art-3.svg" className="min-h-48" />
          <div className="p-6">
            {weekly ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-cas-navy">{weekly.university?.name ?? t("home.weekly.featuredUniversity")}</h3>
                    <p className="text-sm text-muted-foreground">{weekly.name}{weekly.teaching_language ? ` · ${weekly.teaching_language}` : ""}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">{t("home.weekly.language")}</p><p className="font-semibold">{weekly.teaching_language ?? t("home.weekly.englishDefault")}</p></div>
                  <div><p className="text-xs text-muted-foreground">{t("home.weekly.level")}</p><p className="font-semibold capitalize">{weekly.level.replace("_", "-")}</p></div>
                  <div><p className="text-xs text-muted-foreground">{t("home.weekly.tuition")}</p><p className="font-semibold">{money(t, weekly.tuition_fee, weekly.currency)}</p></div>
                </div>
                {weeklyWindow && (
                  <div className="mt-4 rounded-sm bg-subtle px-3 py-2">
                    <p className="mb-1 text-sm font-medium">{weeklyWindow.name}</p>
                    <AdmissionWindow opens={weeklyWindow.application_open_date} closes={weeklyWindow.application_deadline} sourceUrl={weeklyWindow.source_url} verifiedOn={weeklyWindow.verified_on} />
                  </div>
                )}
                <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-cas-red-600" /> {t("home.weekly.fullSupport")}</li>
                </ul>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                  <Link to="/site/study-plan" className="inline-flex h-11 items-center gap-2 rounded-sm bg-cas-red px-5 text-sm font-bold text-white hover:bg-cas-red-600">{t("home.weekly.applyForSeat")} <ArrowRight className="size-4" /></Link>
                </div>
              </>
            ) : (
              <Skeleton className="h-48 w-full" />
            )}
          </div>
        </div>
      </section>

      {/* ── Highlights 3×3 ───────────────────────────────────── */}
      <SiteSection title={t("home.highlights.title")} subtitle={t("home.highlights.subtitle")}>
        <div className="grid gap-6 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3">
          {HIGHLIGHTS.map(({ titleKey, bodyKey, to, tagKey }, i) => (
            <Link key={titleKey} to={to} className="group flex flex-col overflow-hidden rounded-sm border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
              <PhotoBanner src={`/images/art-${(i % 6) + 1}.svg`} className="h-44">
                <span className="absolute top-3 left-3 rounded-full bg-cas-red px-2.5 py-0.5 text-[11px] font-semibold text-white">{t(tagKey)}</span>
              </PhotoBanner>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-semibold text-cas-navy group-hover:text-cas-red-600">{t(titleKey)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(bodyKey)}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-cas-navy">{t("home.highlights.learnMore")} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></span>
              </div>
            </Link>
          ))}
        </div>
      </SiteSection>

      {/* ── Outstanding Programs (dark band) ─────────────────── */}
      <section className="site-bleed bg-cas-navy-900 px-4 py-16 text-white sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold sm:text-[2rem]">{t("home.outstanding.title")}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-white/70 sm:text-base">{t("home.outstanding.subtitle")}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {programs.isPending && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-sm bg-white/10" />)}
            {outstanding.map((p, i) => (
              <Link key={p.id} to={p.university?.slug ? `/site/universities/${p.university.slug}` : "/site/programs?ref=outstanding"} className="group overflow-hidden rounded-sm border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
                <PhotoBanner src={`/images/art-${((i + 3) % 6) + 1}.svg`} className="flex h-32 items-center justify-center">
                  <span className="rounded-full bg-cas-red px-2.5 py-0.5 text-[11px] font-semibold text-white capitalize">{p.level.replace("_", "-")}</span>
                </PhotoBanner>
                <div className="p-5">
                  <h3 className="line-clamp-1 font-semibold text-cas-navy group-hover:text-cas-red-600">{p.name}</h3>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{p.university?.name}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-9 flex justify-center">
            <Link to="/site/programs?sort=popular" className="inline-flex items-center gap-1 rounded-sm border border-white/25 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10">
              {t("home.outstanding.viewAll")} <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Featured Content (tabbed) ────────────────────────── */}
      <SiteSection title={t("home.featured.title")}>
        <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <Link to="/site/why-china?read=full" className="group relative flex min-h-64 flex-col justify-end overflow-hidden rounded-sm bg-gradient-to-br from-cas-navy-900 to-cas-navy p-8 text-white">
            <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={DOT_GRID} />
            <BookOpen className="absolute top-6 right-6 size-16 text-cas-red/30" />
            <div className="relative">
              <span className="rounded-full bg-cas-red px-3 py-1 text-[11px] font-semibold text-white">{t("home.featured.guideBadge")}</span>
              <h3 className="mt-3 font-sans text-2xl font-bold">{t("home.featured.guideTitle")}</h3>
              <p className="mt-2 max-w-md text-sm text-white/80">{t("home.featured.guideBody")}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-cas-red">{t("home.featured.readGuide")} <ArrowRight className="size-4" /></span>
            </div>
          </Link>

          <div className="rounded-sm border bg-card p-5 shadow-sm">
            <div className="flex gap-1 border-b">
              {FEATURED.map((tab) => (
                <button key={tab.id} type="button" onClick={() => setContentTab(tab.id)} className={cnContentTab(contentTab === tab.id)}>{t(tab.labelKey)}</button>
              ))}
            </div>
            <ul className="mt-3 divide-y">
              {(FEATURED.find((tab) => tab.id === contentTab)?.items ?? []).map((item) => (
                <li key={item.titleKey}>
                  <Link to={item.to} className="flex items-start gap-2 py-3 text-sm text-foreground/90 hover:text-cas-navy">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-cas-red" /> {t(item.titleKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SiteSection>

      {/* ── More in China ────────────────────────────────────── */}
      <SiteSection title={t("home.more.title")} action={<Link to="/site/universities?sort=name" className="inline-flex items-center gap-1 text-sm font-semibold text-cas-navy hover:text-cas-red-600">{t("home.more.viewAll")} <ArrowRight className="size-4" /></Link>}>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {universities.isPending && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-sm" />)}
          {featuredUnis.map((u) => <UniCard key={u.id} u={u} />)}
          {!universities.isPending && featuredUnis.length === 0 && (
            <div className="col-span-full rounded-sm border border-dashed bg-card p-10 text-center">
              <p className="text-sm text-muted-foreground">{t("home.more.emptyText")}</p>
              <Link to="/site/universities?sort=newest" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-cas-navy hover:underline">{t("home.more.browseAll")} <ArrowRight className="size-4" /></Link>
            </div>
          )}
        </div>
        {moreUnis.length > 6 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {moreUnis.slice(6).map((u) => (
              <Link key={u.id} to={u.slug ? `/site/universities/${u.slug}` : "#"} className="rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-cas-navy shadow-sm hover:border-cas-red/50">{u.name}</Link>
            ))}
          </div>
        )}
      </SiteSection>

      {/* ── Final search / CTA ───────────────────────────────── */}
      <section className="rounded-sm border bg-gradient-to-r from-cas-red-50 to-card p-8 text-center sm:p-12">
        <Building2 className="mx-auto size-9 text-cas-navy" />
        <h2 className="mt-3 font-sans text-2xl font-bold text-cas-navy sm:text-3xl">{t("home.cta.title")}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{t("home.cta.subtitle")}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/site/programs?sort=fee" className="inline-flex h-12 items-center gap-2 rounded-sm bg-cas-navy px-6 text-sm font-bold text-white hover:bg-cas-navy-700"><Search className="size-4" /> {t("home.cta.findProgram")}</Link>
          <Link to="/site/contact?topic=consultation" className="inline-flex h-12 items-center gap-2 rounded-sm bg-cas-red px-6 text-sm font-bold text-white hover:bg-cas-red-600"><MessageCircle className="size-4" /> {t("home.cta.freeConsultation")}</Link>
        </div>
      </section>
    </div>
  )
}

function cnContentTab(active: boolean): string {
  return [
    "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
    active ? "border-cas-red text-cas-navy" : "border-transparent text-muted-foreground hover:text-cas-navy",
  ].join(" ")
}

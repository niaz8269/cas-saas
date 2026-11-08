import { useQuery } from "@tanstack/react-query"
import {
  ArrowRight,
  BookOpen,
  Building2,
  CheckCircle2,
  MessageCircle,
  Search,
} from "lucide-react"
import type { TFunction } from "i18next"
import { useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"

import Testimonials from "@/features/site/Testimonials"

import { Skeleton } from "@/components/ui/skeleton"
import { getSiteHome, getSitePrograms, getSiteUniversities, getSiteUniversity } from "@/features/site/api"
// Hero files live in /public so the page can preload them (see SeoController).
const heroLg = "/images/hero-beijing-v2.webp"
const heroMd = "/images/hero-beijing-1400-v2.webp"
const heroSm = "/images/hero-beijing-800-v2.webp"
import { HIGHLIGHT_PHOTOS } from "@/features/site/headerImages"
import { AdmissionWindow, PhotoBanner, SiteSection, UniCard } from "@/features/site/components"
import HeroUpdates from "@/features/site/HeroUpdates"
import { DEFAULT_SECTION_ORDER, FEATURED_TAB1, FEATURED_TAB2, HIGHLIGHTS, POPULAR_SEARCHES } from "@/features/site/homeDefaults"
import { baseLocale, sectionContent, type HomeSectionData } from "@/features/site/homeContent"
import HomeCities from "@/features/site/HomeCities"
import WhyApply from "@/features/site/WhyApply"
import { useSeo } from "@/lib/seo"


const DOT_GRID = {
  backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)",
  backgroundSize: "22px 22px",
}

/** Round seal for a hero card: the university's square emblem crop, or its initials when it has none. */
function HeroLogo({ emblem, name }: { emblem?: string | null; name: string }) {
  const initials = name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("")

  return emblem ? (
    <img src={emblem} alt="" className="size-10 shrink-0 rounded-full bg-white object-cover ring-2 ring-white/80" />
  ) : (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold text-white">{initials}</span>
  )
}

const money = (t: TFunction, v: string | number | null | undefined, c?: string | null) =>
  v == null ? t("home.money.onRequest") : t("home.money.perYear", { amount: Number(v).toLocaleString(), currency: c ?? "CNY" })

export default function SiteHome() {
  const { t, i18n } = useTranslation()
  useSeo({
    title: t("home.seo.title"),
    description: t("home.seo.description"),
    canonicalPath: "/",
  })

  const navigate = useNavigate()
  const [term, setTerm] = useState("")
  const [contentTab, setContentTab] = useState("questions")

  // Real data only: featured universities and programs are the ones with a published admission window that is open.
  const universities = useQuery({ queryKey: ["site-universities", "home"], queryFn: () => getSiteUniversities({ page: 1, perPage: 12 }) })
  const openUniversities = useQuery({ queryKey: ["site-universities", "home-open"], queryFn: () => getSiteUniversities({ page: 1, perPage: 6, openIntake: true }) })
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

  // ── What the admin panel changed ──────────────────────────────────────
  const lng = baseLocale(i18n.language)
  const home = useQuery({ queryKey: ["site-home"], queryFn: getSiteHome, staleTime: 60_000, retry: false })
  // If the layout cannot be loaded, the standard page is shown.
  const fetched = Array.isArray(home.data?.data) ? home.data.data.filter((x) => typeof x?.key === "string" && typeof x?.type === "string") : []
  const sections: HomeSectionData[] = fetched.length > 0 ? fetched : DEFAULT_SECTION_ORDER.map((k) => ({ key: k, type: k, content: null }))
  const ordered = [...sections.filter((s) => s.key === "hero"), ...sections.filter((s) => s.key !== "hero")]
  const contentOf = (s: HomeSectionData) => sectionContent(s.content, lng)
  /** Changed text for a field, else the standard text. */
  const tx = (s: HomeSectionData, field: string, standard: string) => contentOf(s).text(field) ?? standard
  // Until the layout arrives, the hero text waits (a changed headline should not flash the old one).
  const waiting = home.isPending

  const FULL_WIDTH = new Set(["hero", "outstanding"])

  const blocks: Record<string, (s: HomeSectionData) => ReactNode> = {
    // ── Hero — full-screen photo, transparent header overlays it ──────
    hero: (s) => {
      const c = contentOf(s)
      const photo = c.image("hero")
      const popular = c.list<{ label: string; to: string }>("popular") ?? POPULAR_SEARCHES.map(([k, to]) => ({ label: t(k), to }))

      return (
        <section className="relative flex min-h-[calc(100svh/var(--site-zoom,1.1))] flex-col text-white">
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={photo ?? heroLg}
              srcSet={photo ? undefined : `${heroSm} 800w, ${heroMd} 1400w, ${heroLg} 2000w`}
              sizes={photo ? undefined : "(max-width: 640px) 150vw, 100vw"}
              alt=""
              fetchPriority="high"
              decoding="async"
              className="absolute inset-0 size-full object-cover object-[center_55%]"
            />
            {/* Light at the very top (so the navy header/logo read on the misty
                sky), darkening downward so the heading and search stay legible. */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/35 to-black/65" />
            <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={DOT_GRID} />
          </div>

          {/* Content — centred in the space above the search */}
          <div className="relative flex flex-1 flex-col items-center justify-center px-4 pt-24 pb-2 text-center sm:pt-28 [@media(max-height:680px)]:sm:pt-24">
            <div className="w-full max-w-5xl">
              <h1 className={`text-3xl font-normal tracking-tight [text-shadow:0_2px_12px_rgba(0,0,0,0.55)] sm:text-5xl md:leading-[1.05] [@media(min-height:700px)]:md:text-[3.5rem] ${waiting ? "invisible" : ""}`}>{tx(s, "title", t("home.hero.title"))}</h1>
              <p className={`mx-auto mt-3 max-w-2xl text-sm font-medium tracking-wide text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.55)] sm:text-lg ${waiting ? "invisible" : ""}`}>
                {tx(s, "motto", t("home.hero.motto"))}
              </p>

              {/* Ranked featured universities + expander (reference's numbered cards) */}
              {featuredUnis.length > 0 && (
                <div className="mt-4">
                  <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                    {featuredUnis.slice(0, 3).map((u) => (
                      <Link
                        key={u.id}
                        to={u.slug ? `/site/universities/${u.slug}` : "#"}
                        className="group relative flex h-11 w-full items-center gap-2.5 sm:h-14 overflow-hidden rounded-md bg-black/30 px-3 pl-4 text-left ring-1 ring-white/20 backdrop-blur-sm transition-colors hover:bg-black/45 sm:w-52"
                      >
                        <HeroLogo emblem={u.emblem_url} name={u.name} />
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
          <div className="relative z-10 mx-auto w-full max-w-3xl px-4 pb-4">
            <div>
              <p className="text-center text-xs font-semibold tracking-[0.18em] text-white uppercase [text-shadow:0_1px_8px_rgba(0,0,0,0.6)]">{tx(s, "searchLabel", t("home.search.label"))}</p>
              <form
                onSubmit={runSearch}
                role="search"
                className="mt-2.5 flex items-center gap-1 rounded-full bg-black/35 p-1.5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.6)] ring-1 ring-white/25 backdrop-blur-sm transition-shadow focus-within:bg-black/50 focus-within:ring-2 focus-within:ring-white/60"
              >
                <Search className="pointer-events-none ml-4 size-5 shrink-0 text-white/70" />
                <input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder={tx(s, "searchPlaceholder", t("home.search.placeholder"))}
                  aria-label={t("home.search.ariaSearchField")}
                  className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm text-ellipsis text-white caret-white outline-none placeholder:text-white/60 sm:text-base"
                />
                <button type="submit" aria-label={t("home.search.ariaSearchButton")} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-cas-red px-6 text-sm font-semibold text-white transition-colors hover:bg-cas-red-600 focus-visible:ring-2 focus-visible:ring-cas-red/40 focus-visible:outline-none">
                  <span className="hidden sm:inline">{tx(s, "searchButton", t("home.search.button"))}</span>
                  <ArrowRight className="size-4" />
                </button>
              </form>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-white/80 [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]">{tx(s, "popularLabel", t("home.search.popular"))}</span>
                {popular.map((p, i) => (
                  <Link key={`${p.label}-${i}`} to={p.to} className={`rounded-full border border-white/30 bg-black/30 px-3 py-1 text-xs ${i > 2 ? "hidden sm:inline-block" : ""} font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20`}>
                    {p.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )
    },

    cities: (s) => (
      <HomeCities
        cities={universities.data?.city_stats}
        isPending={universities.isPending}
        title={tx(s, "title", t("home.cities.title"))}
        subtitle={tx(s, "subtitle", t("home.cities.subtitle"))}
        seeMore={tx(s, "seeMore", t("home.cities.seeMore"))}
      />
    ),

    // ── Weekly Programs spotlight ────────────────────────────────────
    weekly: (s) => (
      <section>
        <h2 className="flex items-center justify-center gap-2 text-2xl font-bold text-cas-navy sm:text-[2rem]">
          <span className="size-2.5 animate-pulse rounded-full bg-cas-red" /> {tx(s, "title", t("home.weekly.title"))}
        </h2>
        <div className="mt-10 grid gap-0 overflow-hidden rounded-sm border bg-card shadow-sm md:grid-cols-[1fr_1.4fr]">
          <PhotoBanner src="/images/art-3.svg" image={weeklyUniversity.data?.data.cover_url ? { src: weeklyUniversity.data.data.cover_url, credit: weeklyUniversity.data.data.cover_credit ?? undefined } : null} className="min-h-48" />
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
                    <AdmissionWindow opens={weeklyWindow.application_open_date} closes={weeklyWindow.application_deadline} />
                  </div>
                )}
                <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-cas-red-600" /> {tx(s, "supportLine", t("home.weekly.fullSupport"))}</li>
                </ul>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                  <Link to={tx(s, "applyLink", "/site/study-plan")} className="inline-flex h-11 items-center gap-2 rounded-sm bg-cas-red px-5 text-sm font-bold text-white hover:bg-cas-red-600">{tx(s, "applyLabel", t("home.weekly.applyForSeat"))} <ArrowRight className="size-4" /></Link>
                </div>
              </>
            ) : (
              <Skeleton className="h-48 w-full" />
            )}
          </div>
        </div>
      </section>
    ),

    // ── Highlights 3×3 ───────────────────────────────────────────────
    highlights: (s) => {
      const c = contentOf(s)
      const items: { title: string; body: string; tag: string; to: string; image?: string }[] =
        c.list<{ title: string; body: string; tag: string; to: string; image?: string }>("items") ?? HIGHLIGHTS.map(([title, body, to, tag]) => ({ title: t(title), body: t(body), to, tag: t(tag) }))

      return (
        <SiteSection title={tx(s, "title", t("home.highlights.title"))} subtitle={tx(s, "subtitle", t("home.highlights.subtitle"))}>
          <div className="grid gap-6 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3">
            {items.map((h, i) => (
              <Link key={`${h.title}-${i}`} to={h.to || "#"} className="group flex flex-col overflow-hidden rounded-sm border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
                <PhotoBanner src={`/images/art-${(i % 6) + 1}.svg`} image={h.image ? { src: h.image } : HIGHLIGHT_PHOTOS[i % HIGHLIGHT_PHOTOS.length]} className="h-44">
                  {h.tag && <span className="absolute top-3 left-3 rounded-full bg-cas-red px-2.5 py-0.5 text-[11px] font-semibold text-white">{h.tag}</span>}
                </PhotoBanner>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="font-semibold text-cas-navy group-hover:text-cas-red-600">{h.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{h.body}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-cas-navy">{tx(s, "learnMore", t("home.highlights.learnMore"))} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></span>
                </div>
              </Link>
            ))}
          </div>
        </SiteSection>
      )
    },

    // ── Outstanding Programs (dark band) ─────────────────────────────
    outstanding: (s) => (
      <section className="bg-cas-navy-900 px-4 py-16 text-white sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold sm:text-[2rem]">{tx(s, "title", t("home.outstanding.title"))}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-white/70 sm:text-base">{tx(s, "subtitle", t("home.outstanding.subtitle"))}</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {programs.isPending && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-sm bg-white/10" />)}
            {outstanding.map((p, i) => (
              <Link key={p.id} to={p.university?.slug ? `/site/universities/${p.university.slug}` : "/site/programs?ref=outstanding"} className="group overflow-hidden rounded-sm border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow-md">
                <PhotoBanner src={`/images/art-${((i + 3) % 6) + 1}.svg`} image={p.university?.cover_url ? { src: p.university.cover_url, credit: p.university.cover_credit ?? undefined } : null} className="flex h-32 items-center justify-center">
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
            <Link to={tx(s, "viewAllLink", "/site/programs?sort=popular")} className="inline-flex items-center gap-1 rounded-sm border border-white/25 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10">
              {tx(s, "viewAll", t("home.outstanding.viewAll"))} <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    ),

    // ── Featured Content (tabbed) ────────────────────────────────────
    featured: (s) => {
      const c = contentOf(s)
      const tabs = [
        { id: "questions", label: tx(s, "tab1Label", t("home.featured.tabs.questions")), items: c.list<{ label: string; to: string }>("tab1") ?? FEATURED_TAB1.map(([k, to]) => ({ label: t(k), to })) },
        { id: "trending", label: tx(s, "tab2Label", t("home.featured.tabs.trending")), items: c.list<{ label: string; to: string }>("tab2") ?? FEATURED_TAB2.map(([k, to]) => ({ label: t(k), to })) },
      ]

      return (
        <SiteSection title={tx(s, "title", t("home.featured.title"))}>
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <Link to={tx(s, "guideLink", "/site/why-china?read=full")} className="group relative flex min-h-64 flex-col justify-end overflow-hidden rounded-sm bg-gradient-to-br from-cas-navy-900 to-cas-navy p-8 text-white">
              <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={DOT_GRID} />
              <BookOpen className="absolute top-6 right-6 size-16 text-cas-red/30" />
              <div className="relative">
                <span className="rounded-full bg-cas-red px-3 py-1 text-[11px] font-semibold text-white">{tx(s, "guideBadge", t("home.featured.guideBadge"))}</span>
                <h3 className="mt-3 font-sans text-2xl font-bold">{tx(s, "guideTitle", t("home.featured.guideTitle"))}</h3>
                <p className="mt-2 max-w-md text-sm text-white/80">{tx(s, "guideBody", t("home.featured.guideBody"))}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-cas-red">{tx(s, "guideButton", t("home.featured.readGuide"))} <ArrowRight className="size-4" /></span>
              </div>
            </Link>

            <div className="rounded-sm border bg-card p-5 shadow-sm">
              <div className="flex gap-1 border-b">
                {tabs.map((tab) => (
                  <button key={tab.id} type="button" onClick={() => setContentTab(tab.id)} className={cnContentTab(contentTab === tab.id)}>{tab.label}</button>
                ))}
              </div>
              <ul className="mt-3 divide-y">
                {(tabs.find((tab) => tab.id === contentTab)?.items ?? []).map((item, i) => (
                  <li key={`${item.label}-${i}`}>
                    <Link to={item.to || "#"} className="flex items-start gap-2 py-3 text-sm text-foreground/90 hover:text-cas-navy">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-cas-red" /> {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </SiteSection>
      )
    },

    // ── More in China ────────────────────────────────────────────────
    more: (s) => (
      <SiteSection title={tx(s, "title", t("home.more.title"))} action={<Link to={tx(s, "viewAllLink", "/site/universities?sort=name")} className="inline-flex items-center gap-1 text-sm font-semibold text-cas-navy hover:text-cas-red-600">{tx(s, "viewAll", t("home.more.viewAll"))} <ArrowRight className="size-4" /></Link>}>
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
    ),

    testimonials: () => <Testimonials audience="student" />,

    // Always visible (unless hidden here), so the link to share is on the home page even before any testimonial is published.
    share: (s) => (
      <section className="flex flex-col items-start justify-between gap-4 rounded-xl border bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:p-8">
        <div>
          <h2 className="text-lg font-semibold text-cas-navy">{tx(s, "title", t("home.share.title"))}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{tx(s, "body", t("home.share.body"))}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/site/share-your-experience" className="inline-flex h-10 items-center rounded-full bg-cas-navy px-5 text-sm font-semibold text-white hover:bg-cas-navy-700">
            {tx(s, "studentLabel", t("home.share.student"))}
          </Link>
          <Link to="/site/share-your-experience?as=agent" className="inline-flex h-10 items-center rounded-full border px-5 text-sm font-semibold text-cas-navy hover:bg-muted">
            {tx(s, "partnerLabel", t("home.share.partner"))}
          </Link>
        </div>
      </section>
    ),

    // ── Final search / CTA ───────────────────────────────────────────
    cta: (s) => (
      <section className="rounded-sm border bg-gradient-to-r from-cas-red-50 to-card p-8 text-center sm:p-12">
        <Building2 className="mx-auto size-9 text-cas-navy" />
        <h2 className="mt-3 font-sans text-2xl font-bold text-cas-navy sm:text-3xl">{tx(s, "title", t("home.cta.title"))}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{tx(s, "subtitle", t("home.cta.subtitle"))}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to={tx(s, "primaryLink", "/site/programs?sort=fee")} className="inline-flex h-12 items-center gap-2 rounded-sm bg-cas-navy px-6 text-sm font-bold text-white hover:bg-cas-navy-700"><Search className="size-4" /> {tx(s, "primaryLabel", t("home.cta.findProgram"))}</Link>
          <Link to={tx(s, "secondaryLink", "/site/contact?topic=consultation")} className="inline-flex h-12 items-center gap-2 rounded-sm bg-cas-red px-6 text-sm font-bold text-white hover:bg-cas-red-600"><MessageCircle className="size-4" /> {tx(s, "secondaryLabel", t("home.cta.freeConsultation"))}</Link>
        </div>
      </section>
    ),

    why: (s) => {
      const items = contentOf(s).list<{ title: string; body: string; linkLabel?: string; linkTo?: string }>("items")?.map((i) => ({
        title: i.title, body: i.body, link: i.linkLabel && i.linkTo ? { to: i.linkTo, label: i.linkLabel } : undefined,
      }))

      return <WhyApply title={tx(s, "title", t("home.why.title"))} items={items} />
    },

    // ── Sections added in the admin panel ────────────────────────────
    banner: (s) => {
      const photo = contentOf(s).image("main")
      const title = tx(s, "title", "")
      const link = tx(s, "buttonLink", "")
      const label = tx(s, "buttonLabel", "")

      return (
        <section className="relative overflow-hidden rounded-xl bg-cas-navy p-8 text-white sm:p-12">
          {photo && <img src={photo} alt="" loading="lazy" className="absolute inset-0 size-full object-cover opacity-30" />}
          <div className="relative mx-auto max-w-2xl text-center">
            {title && <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>}
            {tx(s, "body", "") && <p className="mt-3 text-sm whitespace-pre-line text-white/85 sm:text-base">{tx(s, "body", "")}</p>}
            {label && link && <Link to={link} className="mt-6 inline-flex h-11 items-center gap-2 rounded-sm bg-cas-red px-6 text-sm font-bold text-white hover:bg-cas-red-600">{label} <ArrowRight className="size-4" /></Link>}
          </div>
        </section>
      )
    },

    text: (s) => (
      <section className="mx-auto max-w-3xl">
        {tx(s, "title", "") && <h2 className="text-2xl font-bold text-cas-navy sm:text-3xl">{tx(s, "title", "")}</h2>}
        {tx(s, "body", "").split(/\n{2,}/).filter(Boolean).map((para, i) => (
          <p key={i} className="mt-4 text-sm leading-relaxed whitespace-pre-line text-slate-700 sm:text-base">{para}</p>
        ))}
      </section>
    ),
  }

  return (
    <div className="flex flex-col gap-16 sm:gap-24">
      {ordered.map((s) => {
        const render = blocks[s.type]
        if (!render) return null
        const node = render(s)

        return FULL_WIDTH.has(s.type)
          ? <div key={s.key}>{node}</div>
          : <div key={s.key} className="mx-auto w-full max-w-7xl px-4 empty:hidden sm:px-6">{node}</div>
      })}
    </div>
  )
}

function cnContentTab(active: boolean): string {
  return [
    "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
    active ? "border-cas-red text-cas-navy" : "border-transparent text-muted-foreground hover:text-cas-navy",
  ].join(" ")
}

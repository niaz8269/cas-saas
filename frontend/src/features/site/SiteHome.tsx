import { useQuery } from "@tanstack/react-query"
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BookOpen,
  Building2,
  CalendarClock,
  CheckCircle2,
  GraduationCap,
  Globe2,
  MessageCircle,
  Play,
  Search,
  ShieldCheck,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { Skeleton } from "@/components/ui/skeleton"
import { getSitePrograms, getSiteUniversities } from "@/features/site/api"
import { PhotoBanner, SiteSection, UniCard } from "@/features/site/components"
import HeroUpdates from "@/features/site/HeroUpdates"
import SiteReviews from "@/features/site/SiteReviews"
import { organizationJsonLd, useSeo } from "@/lib/seo"

const DEADLINE = new Date("2026-02-28T23:59:59Z").getTime()

const DOT_GRID = {
  backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)",
  backgroundSize: "22px 22px",
}

// Popular-search shortcuts under the hero search (reference's quick tags).
const POPULAR_SEARCHES: [string, string][] = [
  ["Chinese Language Program", "/site/programs?q=Chinese"],
  ["MBBS", "/site/programs?q=MBBS"],
  ["BS International Trade", "/site/programs?q=Trade"],
  ["Engineering", "/site/programs?q=Engineering"],
]

const HIGHLIGHTS: { title: string; body: string; to: string; tag: string; icon: LucideIcon }[] = [
  { title: "Globally recognised medical degrees", body: "Study MBBS at Ministry of Education–listed universities recognised worldwide.", to: "/site/programs?q=MBBS", tag: "MBBS", icon: BadgeCheck },
  { title: "Universities with late deadlines", body: "Still open for the coming intake — apply before the seats fill up.", to: "/site/universities", tag: "Deadlines", icon: CalendarClock },
  { title: "No-CSCA universities", body: "Universities that admit international students without the CSCA test.", to: "/site/universities", tag: "Admissions", icon: CheckCircle2 },
  { title: "Chinese-language foundations", body: "Foundation-year programs to prepare you for study and life in China.", to: "/site/programs?q=Chinese", tag: "Language", icon: BookOpen },
  { title: "Fast-track applications", body: "Priority processing for complete applications submitted through CAS.", to: "/site/contact", tag: "Fast-track", icon: Zap },
  { title: "Free-application universities", body: "Apply to selected universities with no application fee through CAS.", to: "/site/universities", tag: "Free apply", icon: ShieldCheck },
  { title: "Budget-friendly universities", body: "Quality education with affordable tuition and living costs.", to: "/site/programs", tag: "Value", icon: Wallet },
  { title: "Full-scholarship universities", body: "Universities offering full-tuition scholarships to eligible students.", to: "/site/scholarships?q=full", tag: "Scholarship", icon: Award },
  { title: "Partial-scholarship universities", body: "Universities offering partial awards and monthly stipends.", to: "/site/scholarships?q=partial", tag: "Scholarship", icon: Globe2 },
]

const FEATURED: Record<string, { title: string; to: string }[]> = {
  "Latest topics": [
    { title: "March 2026 intake now open across partner universities", to: "/site/news" },
    { title: "CSC & provincial scholarships accepting applications", to: "/site/scholarships" },
    { title: "New Ministry of Education–listed universities added", to: "/site/universities" },
    { title: "How to prepare a strong MBBS application", to: "/site/programs?q=MBBS" },
  ],
  "Common questions": [
    { title: "Is an MBBS from China recognised in my country?", to: "/site/why-china" },
    { title: "What are the tuition fees and living costs?", to: "/site/programs" },
    { title: "Which universities don't require the CSCA test?", to: "/site/universities" },
    { title: "How do I apply for a scholarship?", to: "/site/scholarships" },
  ],
  "Trending": [
    { title: "Study MBBS in English", to: "/site/programs?q=MBBS" },
    { title: "Engineering programs in China", to: "/site/programs?q=Engineering" },
    { title: "Business & MBA programs", to: "/site/programs?q=Business" },
    { title: "Full-tuition scholarships", to: "/site/scholarships?q=full" },
  ],
}

function Countdown() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)

    return () => clearInterval(id)
  }, [])

  const diff = Math.max(0, DEADLINE - now)
  const parts: [number, string][] = [
    [Math.floor(diff / 86_400_000), "Days"],
    [Math.floor((diff / 3_600_000) % 24), "Hrs"],
    [Math.floor((diff / 60_000) % 60), "Min"],
    [Math.floor((diff / 1_000) % 60), "Sec"],
  ]

  return (
    <div className="flex gap-2">
      {parts.map(([v, l]) => (
        <div key={l} className="flex w-12 flex-col items-center rounded-sm bg-cas-navy px-1 py-1.5 text-white">
          <span className="text-lg font-bold tabular-nums">{String(v).padStart(2, "0")}</span>
          <span className="text-[10px] text-white/70 uppercase">{l}</span>
        </div>
      ))}
    </div>
  )
}

const money = (v: string | number | null | undefined, c?: string | null) =>
  v == null ? "On request" : `${Number(v).toLocaleString()} ${c ?? "CNY"}/yr`

export default function SiteHome() {
  useSeo({
    title: "Study in China — Universities, Programs & Scholarships",
    description: "Study in China with CAS, an official authorized agent since 2012. Find MBBS, engineering and business programs at Ministry of Education–listed universities, with scholarships and full application-to-arrival support.",
    canonicalPath: "/site",
    jsonLd: organizationJsonLd(),
  })

  const navigate = useNavigate()
  const [term, setTerm] = useState("")
  const [contentTab, setContentTab] = useState("Latest topics")

  const universities = useQuery({ queryKey: ["site-universities", "home"], queryFn: () => getSiteUniversities({ page: 1 }) })
  const programs = useQuery({ queryKey: ["site-programs", "home"], queryFn: () => getSitePrograms({}) })

  const featuredUnis = universities.data?.data.slice(0, 6) ?? []
  const moreUnis = universities.data?.data.slice(0, 10) ?? []
  const weekly = programs.data?.data[0]
  const outstanding = programs.data?.data.slice(0, 5) ?? []

  const runSearch = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(`/site/universities${term.trim() ? `?q=${encodeURIComponent(term.trim())}` : ""}`)
  }

  return (
    <div className="space-y-12">
      {/* ── Hero (centred, reference-style) ──────────────────── */}
      <section className="site-bleed relative -mt-8 text-white">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('https://picsum.photos/seed/cas-hero/1600/900')" }} />
          <div className="absolute inset-0 bg-[#1f1c39]/85" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.08]" style={DOT_GRID} />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 pt-16 pb-28 text-center sm:pt-24">
          <h1 className="text-5xl font-normal tracking-tight sm:text-[5.5rem] sm:leading-[1.05]">Study in China</h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm text-white/85 sm:text-base">
            {featuredUnis[0]?.name ? `${featuredUnis[0].name} : English-taught Programs` : "Ministry of Education–listed universities : English-taught Programs"}
          </p>

          {/* Ranked featured universities + expander (reference's numbered cards) */}
          {featuredUnis.length > 0 && (
            <div className="mt-9">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {featuredUnis.slice(0, 3).map((u, i) => (
                <Link
                  key={u.id}
                  to={u.slug ? `/site/universities/${u.slug}` : "#"}
                  className="group relative flex h-16 w-52 items-center gap-2.5 overflow-hidden rounded-sm border border-cas-red/70 bg-white/5 px-3 pl-4 text-left backdrop-blur transition-colors hover:bg-white/10"
                >
                  <span className="absolute top-0 left-0 bg-cas-red px-1.5 py-0.5 text-[11px] font-bold text-white">{i + 1}</span>
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

        {/* Search bar — red-bordered input + popular tags, overlapping the edge */}
        <div className="absolute inset-x-0 bottom-0 z-10 translate-y-10 px-4">
          <div className="mx-auto max-w-3xl rounded-sm bg-white p-5 shadow-xl ring-1 ring-black/5 sm:p-6">
            <form onSubmit={runSearch} className="flex">
              <input
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                placeholder="ENTER THE NAME OF A UNIVERSITY OR A PROGRAM"
                aria-label="Search universities or programs"
                className="flex-1 rounded-l-sm border-2 border-r-0 border-cas-red bg-white px-4 py-3 text-sm text-ink placeholder:text-gray-400 outline-none focus:border-cas-red-600"
              />
              <button type="submit" aria-label="Search" className="inline-flex items-center rounded-r-sm bg-cas-red px-6 text-white transition-colors hover:bg-cas-red-600">
                <Search className="size-5" />
              </button>
            </form>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              {POPULAR_SEARCHES.map(([label, to]) => (
                <Link key={label} to={to} className="rounded-sm bg-gray-100 px-3 py-1 text-xs text-gray-500 transition-colors hover:bg-cas-red-50 hover:text-cas-red-600">
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Weekly Programs spotlight ────────────────────────── */}
      <section>
        <h2 className="flex items-center justify-center gap-2 text-2xl font-bold text-cas-navy sm:text-3xl">
          <span className="size-2.5 animate-pulse rounded-full bg-cas-red" /> Weekly Programs
        </h2>
        <div className="mt-4 grid gap-0 overflow-hidden rounded-sm border bg-card shadow-sm md:grid-cols-[1fr_1.4fr]">
          <PhotoBanner src="/images/art-3.svg" className="flex min-h-48 items-center justify-center p-6">
            <GraduationCap className="size-20 text-white/80 drop-shadow" />
          </PhotoBanner>
          <div className="p-6">
            {weekly ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-cas-navy">{weekly.university?.name ?? "Featured University"}</h3>
                    <p className="text-sm text-muted-foreground">{weekly.name}{weekly.teaching_language ? ` · ${weekly.teaching_language}` : ""}</p>
                  </div>
                  <span className="rounded-full bg-cas-red-50 px-2.5 py-1 text-[11px] font-semibold text-cas-red">Limited seats</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div><p className="text-xs text-muted-foreground">Language</p><p className="font-semibold">{weekly.teaching_language ?? "English"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Level</p><p className="font-semibold capitalize">{weekly.level}</p></div>
                  <div><p className="text-xs text-muted-foreground">Tuition</p><p className="font-semibold">{money(weekly.tuition_fee, weekly.currency)}</p></div>
                </div>
                <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-cas-red-600" /> Ministry of Education–listed university</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-cas-red-600" /> Full application and visa support from CAS</li>
                </ul>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                  <div><p className="mb-1 text-xs text-muted-foreground">Applications close in</p><Countdown /></div>
                  <Link to="/site/study-plan" className="inline-flex h-11 items-center gap-2 rounded-sm bg-cas-red px-5 text-sm font-bold text-white hover:bg-cas-red-600">Apply for a seat <ArrowRight className="size-4" /></Link>
                </div>
              </>
            ) : (
              <Skeleton className="h-48 w-full" />
            )}
          </div>
        </div>
      </section>

      {/* ── Highlights 3×3 ───────────────────────────────────── */}
      <SiteSection title="Highlights" subtitle="Handpicked routes into studying in China.">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {HIGHLIGHTS.map(({ title, body, to, tag, icon: Icon }, i) => (
            <Link key={title} to={to} className="group flex flex-col overflow-hidden rounded-sm border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow">
              <PhotoBanner src={`/images/art-${(i % 6) + 1}.svg`} className="flex h-28 items-center justify-center">
                <Icon className="size-9 text-white/90 drop-shadow" />
                <span className="absolute top-3 left-3 rounded-full bg-cas-red px-2.5 py-0.5 text-[11px] font-semibold text-white">{tag}</span>
              </PhotoBanner>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-semibold text-cas-navy group-hover:text-cas-red-600">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cas-navy">Learn more <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" /></span>
              </div>
            </Link>
          ))}
        </div>
      </SiteSection>

      {/* ── Outstanding Programs (dark band) ─────────────────── */}
      <section className="site-bleed bg-cas-navy-900 px-4 py-14 text-white sm:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">Outstanding programs</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-white/70">Popular programs students are applying to right now.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {programs.isPending && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-sm bg-white/10" />)}
            {outstanding.map((p, i) => (
              <Link key={p.id} to={p.university?.slug ? `/site/universities/${p.university.slug}` : "/site/programs"} className="group overflow-hidden rounded-sm border bg-card shadow-sm transition-all hover:-translate-y-1 hover:shadow">
                <PhotoBanner src={`/images/art-${((i + 3) % 6) + 1}.svg`} className="flex h-24 items-center justify-center">
                  <span className="rounded-full bg-cas-red px-2.5 py-0.5 text-[11px] font-semibold text-white capitalize">{p.level}</span>
                </PhotoBanner>
                <div className="p-4">
                  <h3 className="line-clamp-1 font-semibold text-cas-navy group-hover:text-cas-red-600">{p.name}</h3>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{p.university?.name}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-6 flex justify-center">
            <Link to="/site/programs" className="inline-flex items-center gap-1 rounded-sm border border-white/25 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10">
              View all programs <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Featured Content (tabbed) ────────────────────────── */}
      <SiteSection title="Featured content">
        <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
          <Link to="/site/why-china" className="group relative flex min-h-56 flex-col justify-end overflow-hidden rounded-sm bg-gradient-to-br from-cas-navy-900 to-cas-navy p-7 text-white">
            <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={DOT_GRID} />
            <BookOpen className="absolute top-6 right-6 size-16 text-cas-red/30" />
            <div className="relative">
              <span className="rounded-full bg-cas-red px-3 py-1 text-[11px] font-semibold text-white">Guide</span>
              <h3 className="mt-3 font-sans text-2xl font-bold">Study in China: the complete guide for international students</h3>
              <p className="mt-2 max-w-md text-sm text-white/80">Everything on universities, programs, scholarships, visas and life in China.</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-cas-red">Read the guide <ArrowRight className="size-4" /></span>
            </div>
          </Link>

          <div className="rounded-sm border bg-card p-5 shadow-sm">
            <div className="flex gap-1 border-b">
              {Object.keys(FEATURED).map((k) => (
                <button key={k} type="button" onClick={() => setContentTab(k)} className={cnContentTab(contentTab === k)}>{k}</button>
              ))}
            </div>
            <ul className="mt-3 divide-y">
              {FEATURED[contentTab].map((item) => (
                <li key={item.title}>
                  <Link to={item.to} className="flex items-start gap-2 py-3 text-sm text-foreground/90 hover:text-cas-navy">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-cas-red" /> {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SiteSection>

      {/* ── Watch & Learn ────────────────────────────────────── */}
      <SiteSection title="Watch & learn" subtitle="Guides and student stories from CAS.">
        <div className="grid gap-5 sm:grid-cols-3">
          {["How CAS helps you apply", "Life as an international student", "Choosing the right program"].map((title, i) => (
            <div key={title} className="group overflow-hidden rounded-sm border bg-card shadow-sm">
              <PhotoBanner src={`/images/art-${i + 4}.svg`} className="flex h-40 items-center justify-center">
                <span className="inline-flex size-14 items-center justify-center rounded-full bg-cas-red text-white shadow-lg transition-transform group-hover:scale-110"><Play className="size-6 fill-current" /></span>
              </PhotoBanner>
              <div className="p-4"><h3 className="font-semibold text-cas-navy">{title}</h3></div>
            </div>
          ))}
        </div>
      </SiteSection>

      {/* ── Reviews (monitor + world-map with hover cards) ───── */}
      <SiteReviews />

      {/* ── More in China ────────────────────────────────────── */}
      <SiteSection title="More universities in China" action={<Link to="/site/universities" className="inline-flex items-center gap-1 text-sm font-semibold text-cas-navy hover:text-cas-red-600">View all <ArrowRight className="size-4" /></Link>}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {universities.isPending && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-sm" />)}
          {featuredUnis.map((u) => <UniCard key={u.id} u={u} />)}
          {!universities.isPending && featuredUnis.length === 0 && (
            <div className="col-span-full rounded-sm border border-dashed bg-card p-10 text-center">
              <p className="text-sm text-muted-foreground">Our partner universities are ready to explore.</p>
              <Link to="/site/universities" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-cas-navy hover:underline">Browse all <ArrowRight className="size-4" /></Link>
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
      <section className="rounded-3xl border bg-gradient-to-r from-cas-red-50 to-card p-8 text-center sm:p-12">
        <Building2 className="mx-auto size-9 text-cas-navy" />
        <h2 className="mt-3 font-sans text-2xl font-bold text-cas-navy sm:text-3xl">Search universities and programs</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">Find your program in minutes — or book a free consultation and we'll guide you.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/site/programs" className="inline-flex h-12 items-center gap-2 rounded-sm bg-cas-navy px-6 text-sm font-bold text-white hover:bg-cas-navy-700"><Search className="size-4" /> Find your program</Link>
          <Link to="/site/contact" className="inline-flex h-12 items-center gap-2 rounded-sm bg-cas-red px-6 text-sm font-bold text-white hover:bg-cas-red-600"><MessageCircle className="size-4" /> Free consultation</Link>
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

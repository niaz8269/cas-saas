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
  Quote,
  Search,
  ShieldCheck,
  Star,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { Skeleton } from "@/components/ui/skeleton"
import { getSitePrograms, getSiteUniversities } from "@/features/site/api"
import { PhotoBanner, SiteSection, UniCard } from "@/features/site/components"
import SiteLeadPanel from "@/features/site/SiteLeadPanel"
import { organizationJsonLd, useSeo } from "@/lib/seo"

const DEADLINE = new Date("2026-02-28T23:59:59Z").getTime()

const DOT_GRID = {
  backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)",
  backgroundSize: "22px 22px",
}

const SEARCH_TABS = [
  { key: "programs", label: "Programs", to: "/site/programs" },
  { key: "universities", label: "Universities", to: "/site/universities" },
  { key: "scholarships", label: "Scholarships", to: "/site/scholarships" },
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

const REVIEWS = [
  { quote: "CAS handled everything — choosing my university, the application and my visa. I'm now studying MBBS in China with zero stress.", name: "Ayesha K.", detail: "MBBS · Jilin" },
  { quote: "The scholarship guidance alone saved me a fortune. Every message was answered quickly and professionally.", name: "Bilal R.", detail: "Engineering · Wuhan" },
  { quote: "They supported me even after I arrived — registration, banking, everything. Truly end-to-end.", name: "Fatima S.", detail: "Business · Beijing" },
]

function Stars() {
  return (
    <span className="inline-flex gap-0.5 text-cas-gold" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="size-4 fill-current" />)}
    </span>
  )
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
  const [tab, setTab] = useState("programs")
  const [term, setTerm] = useState("")
  const [contentTab, setContentTab] = useState("Latest topics")

  const universities = useQuery({ queryKey: ["site-universities", "home"], queryFn: () => getSiteUniversities({ page: 1 }) })
  const programs = useQuery({ queryKey: ["site-programs", "home"], queryFn: () => getSitePrograms({}) })

  const featuredUnis = universities.data?.data.slice(0, 6) ?? []
  const moreUnis = universities.data?.data.slice(0, 10) ?? []
  const uniCount = universities.data?.meta.total ?? null
  const weekly = programs.data?.data[0]
  const outstanding = programs.data?.data.slice(0, 5) ?? []

  const stats = [
    ["13+", "Years"], ["13K+", "Students"], [uniCount ? `${uniCount}+` : "200+", "Universities"],
    ["98%", "Visa success"], ["20+", "Branches"], ["50+", "Countries"],
  ]

  const runSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const to = SEARCH_TABS.find((t) => t.key === tab)!.to
    navigate(`${to}${term.trim() ? `?q=${encodeURIComponent(term.trim())}` : ""}`)
  }

  return (
    <div className="space-y-12">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="site-bleed relative -mt-8 overflow-hidden px-4 py-14 text-white sm:py-20">
        {/* Optional hero photo — drop /public/images/hero.jpg; the gradient shows until then. */}
        <div className="absolute inset-0 bg-cas-navy-900 bg-cover bg-center" style={{ backgroundImage: "url('/images/hero.jpg')" }} />
        <div className="absolute inset-0 bg-gradient-to-br from-cas-navy-900/92 via-cas-navy/85 to-cas-navy-700/80" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.1]" style={DOT_GRID} />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
          <span className="font-sans text-[22vw] font-bold whitespace-nowrap text-white/[0.04] select-none">留学中国</span>
        </div>
        <div className="pointer-events-none absolute -top-24 right-1/4 size-80 rounded-full bg-cas-gold/15 blur-3xl" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_20rem]">
          <div className="text-center lg:text-left">
            <span className="inline-flex items-center gap-2 rounded-full border border-cas-gold/30 bg-cas-gold/10 px-3 py-1 text-xs font-semibold text-cas-gold-50">
              <span className="size-2 animate-pulse rounded-full bg-cas-gold" /> Official Authorized Agent Since 2012
            </span>
            <h1 className="mt-5 font-sans text-4xl font-bold sm:text-6xl">
              Study in <span className="text-cas-gold">China</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm text-white/80 sm:text-base lg:mx-0">
              Explore Ministry of Education–listed universities and English-taught programs — with full support from application to arrival.
            </p>

            {/* Tabbed search */}
            <form onSubmit={runSearch} className="mx-auto mt-8 max-w-2xl lg:mx-0">
              <div className="flex justify-center gap-1 lg:justify-start">
                {SEARCH_TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={cnTab(tab === t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex overflow-hidden rounded-sm bg-card p-1.5 shadow-sm">
                <input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder="Enter a university or program name…"
                  aria-label="Search"
                  className="flex-1 bg-transparent px-4 text-sm text-foreground outline-none"
                />
                <button type="submit" className="inline-flex items-center gap-2 rounded-sm bg-cas-gold px-6 text-sm font-bold text-cas-navy hover:bg-cas-gold-600">
                  <Search className="size-4" /> Search
                </button>
              </div>
            </form>

            {/* Featured logos row */}
            {featuredUnis.length > 0 && (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-white/60 lg:justify-start">
                <span>Featured:</span>
                {featuredUnis.slice(0, 4).map((u) => (
                  <Link key={u.id} to={u.slug ? `/site/universities/${u.slug}` : "#"} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-medium text-white/80 hover:bg-white/10">
                    {u.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Docked lead-capture panel (reference "Leave a message") */}
          <SiteLeadPanel />
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────────── */}
      <section className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {stats.map(([v, l]) => (
          <div key={l} className="rounded-sm border bg-card p-4 text-center shadow-sm">
            <p className="bg-gradient-to-br from-cas-navy to-cas-navy-700 bg-clip-text text-2xl font-extrabold text-transparent">{v}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{l}</p>
          </div>
        ))}
      </section>

      {/* ── Weekly Programs spotlight ────────────────────────── */}
      <section>
        <h2 className="flex items-center justify-center gap-2 text-2xl font-bold text-cas-navy sm:text-3xl">
          <span className="size-2.5 animate-pulse rounded-full bg-cas-red" /> Weekly Programs
        </h2>
        <div className="mt-4 grid gap-0 overflow-hidden rounded-sm border bg-card shadow-sm md:grid-cols-[1fr_1.4fr]">
          <PhotoBanner src="/images/art-3.svg" className="flex min-h-48 items-center justify-center p-6">
            <GraduationCap className="size-20 text-cas-navy/40" />
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
                  <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-cas-gold-600" /> Ministry of Education–listed university</li>
                  <li className="flex items-center gap-2"><CheckCircle2 className="size-4 text-cas-gold-600" /> Full application and visa support from CAS</li>
                </ul>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                  <div><p className="mb-1 text-xs text-muted-foreground">Applications close in</p><Countdown /></div>
                  <Link to="/site/study-plan" className="inline-flex h-11 items-center gap-2 rounded-sm bg-cas-gold px-5 text-sm font-bold text-cas-navy hover:bg-cas-gold-600">Apply for a seat <ArrowRight className="size-4" /></Link>
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
                <Icon className="size-9 text-cas-navy/70" />
                <span className="absolute top-3 left-3 rounded-full bg-cas-gold px-2.5 py-0.5 text-[11px] font-semibold text-cas-navy">{tag}</span>
              </PhotoBanner>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-semibold text-cas-navy group-hover:text-cas-gold-600">{title}</h3>
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
                  <span className="rounded-full bg-cas-gold px-2.5 py-0.5 text-[11px] font-semibold text-cas-navy capitalize">{p.level}</span>
                </PhotoBanner>
                <div className="p-4">
                  <h3 className="line-clamp-1 font-semibold text-cas-navy group-hover:text-cas-gold-600">{p.name}</h3>
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
            <BookOpen className="absolute top-6 right-6 size-16 text-cas-gold/30" />
            <div className="relative">
              <span className="rounded-full bg-cas-gold px-3 py-1 text-[11px] font-semibold text-cas-navy">Guide</span>
              <h3 className="mt-3 font-sans text-2xl font-bold">Study in China: the complete guide for international students</h3>
              <p className="mt-2 max-w-md text-sm text-white/80">Everything on universities, programs, scholarships, visas and life in China.</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-cas-gold">Read the guide <ArrowRight className="size-4" /></span>
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
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-cas-gold" /> {item.title}
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
                <span className="inline-flex size-14 items-center justify-center rounded-full bg-cas-gold text-cas-navy shadow-lg transition-transform group-hover:scale-110"><Play className="size-6 fill-current" /></span>
              </PhotoBanner>
              <div className="p-4"><h3 className="font-semibold text-cas-navy">{title}</h3></div>
            </div>
          ))}
        </div>
      </SiteSection>

      {/* ── Reviews (light) ──────────────────────────────────── */}
      <section>
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-cas-navy sm:text-3xl">Reviews from our students</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">Students from 50+ countries trust CAS with their journey.</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {REVIEWS.map((t) => (
            <figure key={t.name} className="flex flex-col rounded-sm border bg-card p-6 shadow-sm">
              <Quote className="size-7 text-cas-gold" />
              <blockquote className="mt-2 flex-1 text-sm text-foreground/90">"{t.quote}"</blockquote>
              <figcaption className="mt-5 flex items-center gap-3 border-t pt-4">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-cas-navy text-sm font-bold text-white">{t.name[0]}</span>
                <span><span className="block text-sm font-semibold text-cas-navy">{t.name}</span><span className="block text-xs text-muted-foreground">{t.detail}</span></span>
                <span className="ml-auto"><Stars /></span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ── More in China ────────────────────────────────────── */}
      <SiteSection title="More universities in China" action={<Link to="/site/universities" className="inline-flex items-center gap-1 text-sm font-semibold text-cas-navy hover:text-cas-gold-600">View all <ArrowRight className="size-4" /></Link>}>
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
              <Link key={u.id} to={u.slug ? `/site/universities/${u.slug}` : "#"} className="rounded-full border bg-card px-3 py-1.5 text-xs font-medium text-cas-navy shadow-sm hover:border-cas-gold/50">{u.name}</Link>
            ))}
          </div>
        )}
      </SiteSection>

      {/* ── Final search / CTA ───────────────────────────────── */}
      <section className="rounded-3xl border bg-gradient-to-r from-cas-gold-50 to-card p-8 text-center sm:p-12">
        <Building2 className="mx-auto size-9 text-cas-navy" />
        <h2 className="mt-3 font-sans text-2xl font-bold text-cas-navy sm:text-3xl">Search universities and programs</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">Find your program in minutes — or book a free consultation and we'll guide you.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/site/programs" className="inline-flex h-12 items-center gap-2 rounded-sm bg-cas-navy px-6 text-sm font-bold text-white hover:bg-cas-navy-700"><Search className="size-4" /> Find your program</Link>
          <Link to="/site/contact" className="inline-flex h-12 items-center gap-2 rounded-sm bg-cas-gold px-6 text-sm font-bold text-cas-navy hover:bg-cas-gold-600"><MessageCircle className="size-4" /> Free consultation</Link>
        </div>
      </section>
    </div>
  )
}

function cnTab(active: boolean): string {
  return [
    "rounded-t-lg px-5 py-2 text-sm font-semibold transition-colors",
    active ? "bg-card text-cas-navy" : "bg-white/10 text-white/80 hover:bg-white/20",
  ].join(" ")
}

function cnContentTab(active: boolean): string {
  return [
    "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
    active ? "border-cas-gold text-cas-navy" : "border-transparent text-muted-foreground hover:text-cas-navy",
  ].join(" ")
}

import { useQuery } from "@tanstack/react-query"
import {
  Activity,
  ArrowRight,
  Award,
  BadgeCheck,
  Briefcase,
  Clock,
  Cpu,
  Headphones,
  HeartPulse,
  MessageCircle,
  Quote,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import { Skeleton } from "@/components/ui/skeleton"
import { getSiteUniversities } from "@/features/site/api"
import { SiteSection, UniCard } from "@/features/site/components"
import { organizationJsonLd, useSeo } from "@/lib/seo"

const FIELDS: { label: string; q: string; icon: LucideIcon }[] = [
  { label: "MBBS / Medicine", q: "MBBS", icon: Stethoscope },
  { label: "Engineering", q: "Engineering", icon: Cpu },
  { label: "Business & MBA", q: "Business", icon: Briefcase },
  { label: "Computer Science", q: "Computer", icon: Activity },
  { label: "Chinese Medicine", q: "Chinese Medicine", icon: HeartPulse },
  { label: "Law", q: "Law", icon: Scale },
]

const WHY: { title: string; body: string; icon: LucideIcon }[] = [
  { title: "Official authorized agent", body: "Working directly with Ministry of Education–listed universities since 2012.", icon: ShieldCheck },
  { title: "Guaranteed admissions", body: "Strong admission rates and a 98% visa-success track record.", icon: BadgeCheck },
  { title: "Fast processing", body: "Complete, correct applications prepared and submitted quickly.", icon: Clock },
  { title: "End-to-end support", body: "One team from choosing a program to admission, visa and arrival.", icon: Award },
  { title: "Scholarship access", body: "Government, provincial and university funding — matched to you.", icon: Wallet },
  { title: "24/7 student support", body: "Help before you apply and long after you land on campus.", icon: Headphones },
]

const TESTIMONIALS: { quote: string; name: string; detail: string }[] = [
  { quote: "CAS handled everything — choosing my university, the application and my visa. I'm now studying MBBS in China with zero stress.", name: "Ayesha K.", detail: "MBBS · Jilin" },
  { quote: "The scholarship guidance alone saved me a fortune. Every message was answered quickly and professionally.", name: "Bilal R.", detail: "Engineering · Wuhan" },
  { quote: "They supported me even after I arrived — registration, banking, everything. Truly end-to-end.", name: "Fatima S.", detail: "Business · Beijing" },
]

const SUBJECTS = ["All subjects", "MBBS", "Engineering", "Business", "Computer Science", "Chinese Medicine", "Law"]

const DOT_GRID = {
  backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)",
  backgroundSize: "22px 22px",
}

function Stars() {
  return (
    <span className="inline-flex gap-0.5 text-cas-gold" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="size-4 fill-current" />)}
    </span>
  )
}

export default function SiteHome() {
  useSeo({
    title: "Study in China — Universities, Programs & Scholarships",
    description: "Study in China with CAS, an official authorized agent since 2012. Find MBBS, engineering and business programs at Ministry of Education–listed universities, with scholarships and full application-to-arrival support.",
    canonicalPath: "/site",
    jsonLd: organizationJsonLd(),
  })

  const navigate = useNavigate()
  const [q, setQ] = useState("")
  const [level, setLevel] = useState("all")
  const [subject, setSubject] = useState("All subjects")

  const featured = useQuery({
    queryKey: ["site-universities", "featured"],
    queryFn: () => getSiteUniversities({ page: 1 }),
  })

  const universities = featured.data?.data.slice(0, 6) ?? []
  const uniCount = featured.data?.meta.total ?? null

  const stats = [
    ["13+", "Years of experience"],
    ["13K+", "Students enrolled"],
    [uniCount ? `${uniCount}+` : "200+", "University partners"],
    ["98%", "Visa success rate"],
    ["20+", "Worldwide branches"],
    ["50+", "Countries served"],
  ]

  const runSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const term = q.trim() || (subject !== "All subjects" ? subject : "")
    const params = new URLSearchParams()
    if (term) params.set("q", term)
    if (level !== "all") params.set("level", level)
    navigate(`/site/programs${params.toString() ? `?${params}` : ""}`)
  }

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cas-navy-900 via-cas-navy to-cas-navy-700 p-6 text-white shadow-xl sm:p-10 lg:p-12">
        <div className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-cas-gold/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 size-80 rounded-full bg-sky-400/10 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={DOT_GRID} />

        <div className="relative grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-cas-gold/30 bg-cas-gold/10 px-3 py-1 text-xs font-semibold text-cas-gold-50">
              <span className="size-2 animate-pulse rounded-full bg-cas-gold" /> Official Authorized Agent Since 2012
            </span>
            <h1 className="mt-5 font-serif text-4xl leading-[1.05] font-bold sm:text-5xl lg:text-6xl">
              Study in <span className="text-cas-gold">China</span> with Confidence
            </h1>
            <p className="mt-5 max-w-md text-base text-white/80">
              Your trusted path to Ministry of Education–listed universities — with full support from application to arrival.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/site/contact" className="inline-flex h-12 items-center gap-2 rounded-lg bg-cas-gold px-6 text-sm font-bold text-cas-navy shadow-lg shadow-cas-gold/20 transition-transform hover:scale-[1.03] hover:bg-cas-gold-600">
                <Sparkles className="size-4" /> Apply Now
              </Link>
              <Link to="/site/contact" className="inline-flex h-12 items-center gap-2 rounded-lg border border-white/30 px-6 text-sm font-semibold text-white backdrop-blur hover:bg-white/10">
                <MessageCircle className="size-4" /> Free Consultation
              </Link>
            </div>
            <div className="mt-6 flex items-center gap-3 text-sm text-white/80">
              <Stars />
              <span>Trusted by <strong className="text-white">13,000+</strong> students</span>
            </div>
          </div>

          {/* Find Your Program widget */}
          <form onSubmit={runSearch} className="relative overflow-hidden rounded-2xl bg-card p-6 text-foreground shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-1.5 bg-cas-gold" />
            <p className="flex items-center gap-2 font-serif text-lg font-bold text-cas-navy">
              <Search className="size-5 text-cas-gold" /> Find Your Program
            </p>
            <div className="mt-4 space-y-3">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Program name or field of study…"
                aria-label="Program name or field of study"
                className="h-12 w-full rounded-lg border bg-background px-3.5 text-sm outline-none transition-colors focus:border-cas-navy focus:ring-2 focus:ring-cas-navy/10"
              />
              <div className="grid grid-cols-2 gap-3">
                <select value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Degree level" className="h-12 rounded-lg border bg-background px-2.5 text-sm">
                  <option value="all">All degree levels</option>
                  <option value="bachelor">Bachelor</option>
                  <option value="master">Master</option>
                  <option value="phd">PhD</option>
                </select>
                <select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Subject" className="h-12 rounded-lg border bg-background px-2.5 text-sm">
                  {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <button type="submit" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-cas-navy text-sm font-bold text-white transition-colors hover:bg-cas-navy-700">
                <Search className="size-4" /> Search Programs
              </button>
              <p className="text-center text-xs text-muted-foreground">Free to search · No obligation</p>
            </div>
          </form>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(([v, l]) => (
          <div key={l} className="group rounded-2xl border bg-card p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-cas-gold/50 hover:shadow-md">
            <p className="bg-gradient-to-br from-cas-navy to-cas-navy-700 bg-clip-text text-2xl font-extrabold text-transparent tabular-nums sm:text-3xl">{v}</p>
            <div className="mx-auto mt-1 h-0.5 w-6 rounded-full bg-cas-gold/60 transition-all group-hover:w-10" />
            <p className="mt-1.5 text-xs text-muted-foreground">{l}</p>
          </div>
        ))}
      </section>

      {/* Fields */}
      <SiteSection title="What do you want to study?" subtitle="Jump straight to the programs students ask for most.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {FIELDS.map(({ label, q: fq, icon: Icon }) => (
            <Link key={label} to={`/site/programs?q=${encodeURIComponent(fq)}`} className="group flex flex-col items-center gap-2.5 rounded-2xl border bg-card p-5 text-center shadow-sm transition-all hover:-translate-y-1 hover:border-cas-gold/50 hover:shadow-lg">
              <span className="inline-flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-cas-gold-50 to-cas-gold-50 text-cas-gold-600 transition-colors group-hover:from-cas-gold group-hover:to-cas-gold-600 group-hover:text-cas-navy"><Icon className="size-5" /></span>
              <span className="text-xs font-semibold">{label}</span>
            </Link>
          ))}
        </div>
      </SiteSection>

      {/* Featured universities */}
      <SiteSection
        title="World-class Chinese universities"
        subtitle="A selection of the Ministry of Education–listed institutions we place students into."
        action={<Link to="/site/universities" className="inline-flex items-center gap-1 text-sm font-semibold text-cas-navy hover:text-cas-gold-600">View all <ArrowRight className="size-4" /></Link>}
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.isPending && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}
          {!featured.isPending && universities.map((u) => <UniCard key={u.id} u={u} />)}
          {!featured.isPending && universities.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed bg-card p-10 text-center">
              <p className="text-sm text-muted-foreground">Our partner universities are ready to explore.</p>
              <Link to="/site/universities" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-cas-navy hover:underline">Browse all universities <ArrowRight className="size-4" /></Link>
            </div>
          )}
        </div>
      </SiteSection>

      {/* Why choose us */}
      <SiteSection title="Why choose CAS" subtitle="What students and families get by applying with us.">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {WHY.map(({ title, body, icon: Icon }) => (
            <div key={title} className="group rounded-2xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-cas-navy/20 hover:shadow-lg">
              <span className="inline-flex size-12 items-center justify-center rounded-xl bg-cas-navy-50 text-cas-navy transition-colors group-hover:bg-cas-navy group-hover:text-white"><Icon className="size-6" /></span>
              <h3 className="mt-4 font-semibold text-cas-navy">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </SiteSection>

      {/* Testimonials */}
      <SiteSection title="What our students say" subtitle="Real journeys, from first enquiry to first day of class.">
        <div className="grid gap-5 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <figure key={t.name} className="relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm">
              <Quote className="size-8 text-cas-gold/30" />
              <blockquote className="mt-2 flex-1 text-sm text-foreground/90">"{t.quote}"</blockquote>
              <figcaption className="mt-5 flex items-center gap-3 border-t pt-4">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-cas-navy text-sm font-bold text-cas-gold">{t.name[0]}</span>
                <span>
                  <span className="block text-sm font-semibold text-cas-navy">{t.name}</span>
                  <span className="block text-xs text-muted-foreground">{t.detail}</span>
                </span>
                <span className="ml-auto"><Stars /></span>
              </figcaption>
            </figure>
          ))}
        </div>
      </SiteSection>

      {/* Scholarships band */}
      <section className="relative overflow-hidden rounded-2xl border border-cas-gold/30 bg-gradient-to-r from-cas-gold-50 to-transparent p-6 sm:p-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-4">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-cas-gold text-cas-navy shadow-sm"><Award className="size-6" /></span>
            <div>
              <h2 className="text-lg font-bold text-cas-navy">Scholarships available</h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">Government, provincial and university awards — full and partial. We help you find and apply for the ones you qualify for.</p>
            </div>
          </div>
          <Link to="/site/scholarships" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-cas-navy px-5 text-sm font-semibold text-white hover:bg-cas-navy-700">
            View scholarships <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cas-navy-900 via-cas-navy to-cas-navy-700 p-8 text-center text-white shadow-xl sm:p-14">
        <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={DOT_GRID} />
        <div className="pointer-events-none absolute -top-20 left-1/2 size-72 -translate-x-1/2 rounded-full bg-cas-gold/15 blur-3xl" />
        <div className="relative">
          <h2 className="font-serif text-3xl font-bold sm:text-4xl">Ready to study in China?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/80">
            Book a free consultation and a CAS counselor will guide you through your options — no obligation.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/site/programs" className="inline-flex h-12 items-center gap-2 rounded-lg bg-white px-6 text-sm font-bold text-cas-navy hover:bg-white/90">Browse programs</Link>
            <Link to="/site/contact" className="inline-flex h-12 items-center gap-2 rounded-lg bg-cas-gold px-6 text-sm font-bold text-cas-navy shadow-lg shadow-cas-gold/20 hover:bg-cas-gold-600">Free consultation</Link>
          </div>
        </div>
      </section>
    </div>
  )
}

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
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
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

const SUBJECTS = ["All subjects", "MBBS", "Engineering", "Business", "Computer Science", "Chinese Medicine", "Law"]

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
    <div className="space-y-14">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-cas-navy-900 to-cas-navy p-8 text-white shadow-sm sm:p-12">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-cas-gold/20 px-3 py-1 text-xs font-semibold text-cas-gold-50">
              <span className="size-2 rounded-full bg-cas-gold" /> Official Authorized Agent Since 2012
            </span>
            <h1 className="mt-5 font-serif text-4xl leading-tight font-bold sm:text-5xl">
              Study in <span className="text-cas-gold">China</span> with Confidence
            </h1>
            <p className="mt-4 max-w-md text-sm text-white/80 sm:text-base">
              Your trusted path to Ministry of Education–listed universities — with full support from application to arrival.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/site/contact" className="inline-flex h-11 items-center gap-2 rounded-md bg-cas-gold px-5 text-sm font-semibold text-cas-navy hover:bg-cas-gold-600">
                <Sparkles className="size-4" /> Apply Now
              </Link>
              <Link to="/site/contact" className="inline-flex h-11 items-center gap-2 rounded-md border border-white/30 px-5 text-sm font-semibold text-white hover:bg-white/10">
                <MessageCircle className="size-4" /> Free Consultation
              </Link>
            </div>
          </div>

          {/* Find Your Program widget */}
          <form onSubmit={runSearch} className="rounded-2xl bg-card p-5 text-foreground shadow-lg sm:p-6">
            <p className="flex items-center gap-2 font-serif text-lg font-semibold text-cas-navy">
              <Search className="size-5 text-cas-gold" /> Find Your Program
            </p>
            <div className="mt-4 space-y-3">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Program name or field of study…"
                aria-label="Program name or field of study"
                className="h-11 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-cas-navy"
              />
              <div className="grid grid-cols-2 gap-3">
                <select value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Degree level" className="h-11 rounded-md border bg-background px-2 text-sm">
                  <option value="all">All degree levels</option>
                  <option value="bachelor">Bachelor</option>
                  <option value="master">Master</option>
                  <option value="phd">PhD</option>
                </select>
                <select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Subject" className="h-11 rounded-md border bg-background px-2 text-sm">
                  {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <button type="submit" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-cas-navy text-sm font-semibold text-white hover:bg-cas-navy-700">
                <Search className="size-4" /> Search Programs
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(([v, l]) => (
          <div key={l} className="rounded-xl border bg-card p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-cas-navy tabular-nums sm:text-3xl">{v}</p>
            <p className="mt-1 text-xs text-muted-foreground">{l}</p>
          </div>
        ))}
      </section>

      {/* Fields */}
      <SiteSection title="What do you want to study?" subtitle="Jump straight to the programs students ask for most.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {FIELDS.map(({ label, q: fq, icon: Icon }) => (
            <Link key={label} to={`/site/programs?q=${encodeURIComponent(fq)}`} className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center shadow-sm transition-shadow hover:shadow-md">
              <span className="inline-flex size-11 items-center justify-center rounded-full bg-cas-gold-50 text-cas-gold-600"><Icon className="size-5" /></span>
              <span className="text-xs font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </SiteSection>

      {/* Featured universities */}
      <SiteSection
        title="World-class Chinese universities"
        subtitle="A selection of the Ministry of Education–listed institutions we place students into."
        action={<Link to="/site/universities" className="inline-flex items-center gap-1 text-sm font-medium text-cas-navy hover:underline">View all <ArrowRight className="size-4" /></Link>}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.isPending && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
          {universities.map((u) => <UniCard key={u.id} u={u} />)}
        </div>
      </SiteSection>

      {/* Why choose us */}
      <SiteSection title="Why choose CAS" subtitle="What students and families get by applying with us.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WHY.map(({ title, body, icon: Icon }) => (
            <div key={title} className="rounded-xl border bg-card p-6 shadow-sm">
              <span className="inline-flex size-11 items-center justify-center rounded-lg bg-cas-navy-50 text-cas-navy"><Icon className="size-5" /></span>
              <h3 className="mt-4 font-semibold text-cas-navy">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </SiteSection>

      {/* Scholarships band */}
      <section className="flex flex-col items-start justify-between gap-4 rounded-2xl border bg-cas-gold-50 p-6 sm:flex-row sm:items-center sm:p-8">
        <div className="flex items-start gap-4">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-cas-gold text-cas-navy"><Award className="size-5" /></span>
          <div>
            <h2 className="text-lg font-semibold text-cas-navy">Scholarships available</h2>
            <p className="mt-1 text-sm text-muted-foreground">Government, provincial and university awards — full and partial. We help you find and apply for the ones you qualify for.</p>
          </div>
        </div>
        <Link to="/site/scholarships" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-cas-navy px-5 text-sm font-semibold text-white hover:bg-cas-navy-700">
          View scholarships <ArrowRight className="size-4" />
        </Link>
      </section>

      {/* Final CTA */}
      <section className="rounded-2xl bg-gradient-to-br from-cas-navy-900 to-cas-navy p-8 text-center text-white shadow-sm sm:p-12">
        <h2 className="font-serif text-3xl font-bold">Ready to study in China?</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-white/80">
          Book a free consultation and a CAS counselor will guide you through your options — no obligation.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/site/programs" className="inline-flex h-11 items-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-cas-navy hover:bg-white/90">Browse programs</Link>
          <Link to="/site/contact" className="inline-flex h-11 items-center gap-2 rounded-md bg-cas-gold px-5 text-sm font-semibold text-cas-navy hover:bg-cas-gold-600">Free consultation</Link>
        </div>
      </section>
    </div>
  )
}

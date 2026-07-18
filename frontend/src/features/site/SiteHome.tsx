import { useQuery } from "@tanstack/react-query"
import {
  Activity,
  ArrowRight,
  Award,
  Briefcase,
  Building2,
  Cpu,
  GraduationCap,
  HeartPulse,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Users,
  type LucideIcon,
} from "lucide-react"
import { Link } from "react-router-dom"

import { Skeleton } from "@/components/ui/skeleton"
import { getSiteUniversities } from "@/features/site/api"
import { SiteSection, UniCard } from "@/features/site/components"

const FIELDS: { label: string; q: string; icon: LucideIcon }[] = [
  { label: "MBBS / Medicine", q: "MBBS", icon: Stethoscope },
  { label: "Engineering", q: "Engineering", icon: Cpu },
  { label: "Business & MBA", q: "Business", icon: Briefcase },
  { label: "Computer Science", q: "Computer", icon: Activity },
  { label: "Chinese Medicine", q: "Chinese Medicine", icon: HeartPulse },
  { label: "Law", q: "Law", icon: Scale },
]

const WHY: { title: string; body: string; icon: LucideIcon }[] = [
  { title: "Officially authorized", body: "A recognised consultancy working directly with partner universities across China.", icon: ShieldCheck },
  { title: "End-to-end support", body: "From choosing a program to admission, visa and travel — one team the whole way.", icon: Users },
  { title: "MoE-listed universities", body: "Focus on Ministry of Education–listed institutions your degree will be recognised from.", icon: Award },
  { title: "Scholarships guidance", body: "We match you to the funding you qualify for and help you apply on time.", icon: Sparkles },
]

const STAT = (value: string, label: string) => ({ value, label })

export default function SiteHome() {
  const featured = useQuery({
    queryKey: ["site-universities", "featured"],
    queryFn: () => getSiteUniversities({ page: 1 }),
  })

  const universities = featured.data?.data.slice(0, 6) ?? []
  const uniCount = featured.data?.meta.total ?? null

  const stats = [
    STAT("13+", "Years of experience"),
    STAT("13K+", "Students placed"),
    STAT(uniCount ? `${uniCount}+` : "200+", "Partner universities"),
    STAT("100%", "Application support"),
  ]

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl bg-cas-navy p-8 text-white shadow-sm sm:p-12">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
          <ShieldCheck className="size-3.5" /> September 2026 intake is open
        </span>
        <h1 className="mt-4 max-w-2xl text-3xl font-bold sm:text-4xl">Study in China with CAS</h1>
        <p className="mt-3 max-w-xl text-sm text-white/80 sm:text-base">
          We place students into Ministry of Education–listed universities across China — and support you from
          choosing a program all the way to arrival.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/site/programs" className="inline-flex h-11 items-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-cas-navy hover:bg-white/90">
            <Search className="size-4" /> Find your program
          </Link>
          <Link to="/site/universities" className="inline-flex h-11 items-center gap-2 rounded-md border border-white/30 px-5 text-sm font-semibold text-white hover:bg-white/10">
            Browse universities <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border bg-card p-5 text-center shadow-sm">
            <p className="text-3xl font-bold text-cas-navy tabular-nums">{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </section>

      {/* Field browser */}
      <SiteSection title="Explore by field" subtitle="Jump straight to the programs students ask for most.">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {FIELDS.map(({ label, q, icon: Icon }) => (
            <Link
              key={label}
              to={`/site/programs?q=${encodeURIComponent(q)}`}
              className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              <Icon className="size-6 text-cas-navy" />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </SiteSection>

      {/* Featured universities */}
      <SiteSection
        title="Partner universities"
        subtitle="A selection of the institutions we place students into."
        action={<Link to="/site/universities" className="inline-flex items-center gap-1 text-sm font-medium text-cas-navy hover:underline">View all <ArrowRight className="size-4" /></Link>}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.isPending && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
          {universities.map((u) => <UniCard key={u.id} u={u} />)}
        </div>
      </SiteSection>

      {/* Why CAS */}
      <SiteSection title="Why choose CAS" subtitle="What students and families get by applying with us.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map(({ title, body, icon: Icon }) => (
            <div key={title} className="rounded-xl border bg-card p-5 shadow-sm">
              <span className="inline-flex size-10 items-center justify-center rounded-lg bg-cas-navy-50 text-cas-navy">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </SiteSection>

      {/* Scholarships teaser */}
      <section className="flex flex-col items-start justify-between gap-4 rounded-2xl border bg-cas-navy-50 p-6 sm:flex-row sm:items-center sm:p-8">
        <div className="flex items-start gap-4">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-cas-navy text-white"><Award className="size-5" /></span>
          <div>
            <h2 className="text-lg font-semibold text-cas-navy">Scholarships & funding</h2>
            <p className="mt-1 text-sm text-muted-foreground">Full and partial awards are available — we help you find and apply for the ones you qualify for.</p>
          </div>
        </div>
        <Link to="/site/scholarships" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-cas-navy px-5 text-sm font-semibold text-white hover:bg-cas-navy-700">
          View scholarships <ArrowRight className="size-4" />
        </Link>
      </section>

      {/* Final CTA */}
      <section className="rounded-2xl border bg-card p-8 text-center shadow-sm sm:p-10">
        <Building2 className="mx-auto size-8 text-cas-navy" />
        <h2 className="mt-3 text-2xl font-semibold text-cas-navy">Ready to start your application?</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Tell us a little about yourself and a CAS counselor will get in touch to guide you through the next steps.
        </p>
        <Link to="/site/contact" className="mt-5 inline-flex h-11 items-center gap-2 rounded-md bg-cas-red px-6 text-sm font-semibold text-white hover:opacity-90">
          <GraduationCap className="size-4" /> Get free consultation
        </Link>
      </section>
    </div>
  )
}

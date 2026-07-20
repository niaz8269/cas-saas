import {
  ArrowRight,
  Award,
  BookOpen,
  Clock,
  Globe,
  GraduationCap,
  Headphones,
  HeartHandshake,
  PlaneLanding,
  ShieldCheck,
  Stamp,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { Link } from "react-router-dom"

import { SiteSection } from "@/features/site/components"
import { useSeo } from "@/lib/seo"

const WHY: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: ShieldCheck, title: "Official authorized agent", body: "Working directly with universities since 2012 — your application is in trusted, accountable hands." },
  { icon: Wallet, title: "Free to start, clear after", body: "Your consultation and study plan are free; any service fees are quoted up front with no hidden charges." },
  { icon: HeartHandshake, title: "One dedicated advisor", body: "A single point of contact guides you from your first enquiry through to arrival." },
  { icon: Clock, title: "Fast, complete applications", body: "We prepare everything correctly the first time, so you don't lose an intake to resubmissions." },
  { icon: Award, title: "Strong admission record", body: "A proven track record of getting students admitted and visa-ready." },
  { icon: Globe, title: "Support after you arrive", body: "Airport pickup, registration and settling-in help — we don't stop at the offer letter." },
]

const SERVICES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: GraduationCap, title: "Admission service", body: "We shortlist the right universities and programs, prepare your file and submit a complete, correct application on your behalf." },
  { icon: Stamp, title: "Visa assistance", body: "Full support with your JW202, admission letter and student visa — with a track record of high approval rates." },
  { icon: PlaneLanding, title: "Airport pickup", body: "A CAS representative meets you on arrival and helps you get to campus safely and smoothly." },
  { icon: Headphones, title: "On-campus support", body: "Ongoing help after you arrive — registration, accommodation, banking and day-to-day questions." },
  { icon: Wallet, title: "Scholarship assistance", body: "We match you to government, provincial and university scholarships and help you apply on time." },
  { icon: BookOpen, title: "Chinese language foundation", body: "Guidance on HSK and foundation-year options so you're ready for study and life in China." },
]

export default function SiteServices() {
  useSeo({
    title: "Our Services",
    description: "CAS services for studying in China — admission service, visa assistance, scholarship help, airport pickup and on-campus support, end to end.",
    canonicalPath: "/site/services",
  })

  return (
    <div className="space-y-12">
      <section className="rounded-sm bg-cas-navy p-8 text-white shadow-sm sm:p-12">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cas-red/20 px-3 py-1 text-xs font-medium text-cas-red-50">
          End-to-end support
        </span>
        <h1 className="mt-4 max-w-2xl text-3xl font-bold sm:text-4xl">Our services</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/80 sm:text-base">
          From your first enquiry to your first day of class — and beyond — CAS supports you at every step of studying in China.
        </p>
      </section>

      <SiteSection title="What we do for you" subtitle="One team handling the whole journey, so nothing falls through the cracks.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-sm border bg-card p-6 shadow-sm">
              <span className="inline-flex size-11 items-center justify-center rounded-sm bg-cas-red-50 text-cas-red-600"><Icon className="size-5" /></span>
              <h3 className="mt-4 font-semibold text-cas-navy">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </SiteSection>

      {/* Trust stats */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[["13+", "Years of experience"], ["13K+", "Students placed"], ["200+", "University partners"], ["98%", "Visa success rate"]].map(([v, l]) => (
          <div key={l} className="rounded-sm border bg-card p-5 text-center shadow-sm">
            <p className="text-3xl font-bold text-cas-navy tabular-nums">{v}</p>
            <p className="mt-1 text-xs text-muted-foreground">{l}</p>
          </div>
        ))}
      </section>

      <SiteSection title="Why choose CAS" subtitle="Trusted, transparent support at every step of your journey to China.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {WHY.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-sm border bg-card p-6 shadow-sm">
              <span className="inline-flex size-11 items-center justify-center rounded-sm bg-cas-navy-50 text-cas-navy"><Icon className="size-5" /></span>
              <h3 className="mt-4 font-semibold text-cas-navy">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </SiteSection>

      <section className="flex flex-col items-start justify-between gap-4 rounded-sm bg-cas-navy p-8 text-white sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold">Not sure where to start?</h2>
          <p className="mt-1 text-sm text-white/80">Book a free consultation and we'll map out your options.</p>
        </div>
        <Link to="/site/contact" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-sm bg-cas-red px-6 text-sm font-semibold text-white hover:bg-cas-red-600">
          Free consultation <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
  )
}

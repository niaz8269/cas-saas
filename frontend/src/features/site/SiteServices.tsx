import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  Headphones,
  PlaneLanding,
  Stamp,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { Link } from "react-router-dom"

import { SiteSection } from "@/features/site/components"

const SERVICES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: GraduationCap, title: "Admission service", body: "We shortlist the right universities and programs, prepare your file and submit a complete, correct application on your behalf." },
  { icon: Stamp, title: "Visa assistance", body: "Full support with your JW202, admission letter and student visa — with a track record of high approval rates." },
  { icon: PlaneLanding, title: "Airport pickup", body: "A CAS representative meets you on arrival and helps you get to campus safely and smoothly." },
  { icon: Headphones, title: "On-campus support", body: "Ongoing help after you arrive — registration, accommodation, banking and day-to-day questions." },
  { icon: Wallet, title: "Scholarship assistance", body: "We match you to government, provincial and university scholarships and help you apply on time." },
  { icon: BookOpen, title: "Chinese language foundation", body: "Guidance on HSK and foundation-year options so you're ready for study and life in China." },
]

export default function SiteServices() {
  return (
    <div className="space-y-12">
      <section className="rounded-2xl bg-cas-navy p-8 text-white shadow-sm sm:p-12">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cas-gold/20 px-3 py-1 text-xs font-medium text-cas-gold-50">
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
            <div key={title} className="rounded-xl border bg-card p-6 shadow-sm">
              <span className="inline-flex size-11 items-center justify-center rounded-lg bg-cas-gold-50 text-cas-gold-600"><Icon className="size-5" /></span>
              <h3 className="mt-4 font-semibold text-cas-navy">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </SiteSection>

      <section className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-cas-navy p-8 text-white sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold">Not sure where to start?</h2>
          <p className="mt-1 text-sm text-white/80">Book a free consultation and we'll map out your options.</p>
        </div>
        <Link to="/site/contact" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-cas-gold px-6 text-sm font-semibold text-cas-navy hover:bg-cas-gold-600">
          Free consultation <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
  )
}

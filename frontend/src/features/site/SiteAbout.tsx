import { ArrowRight, BadgeCheck, Compass, FileCheck2, GraduationCap, Plane, Sparkles, Users } from "lucide-react"
import { Link } from "react-router-dom"

import { SiteSection } from "@/features/site/components"

const STEPS = [
  { icon: Compass, title: "Choose", body: "We match you to universities and programs that fit your goals, grades and budget." },
  { icon: FileCheck2, title: "Apply", body: "We prepare your documents and submit a complete, correct application on your behalf." },
  { icon: BadgeCheck, title: "Offer", body: "Receive your admission offer and, where eligible, a scholarship." },
  { icon: Plane, title: "Arrive", body: "We guide you through the visa, travel and enrolment so you land ready to start." },
]

const WHY_CHINA = [
  "World-ranked, Ministry of Education–listed universities",
  "English-taught degrees across medicine, engineering and business",
  "Affordable tuition and living costs with generous scholarships",
  "A fast-growing hub for research, industry and opportunity",
]

export default function SiteAbout() {
  return (
    <div className="space-y-12">
      {/* Intro */}
      <section className="rounded-2xl bg-cas-navy p-8 text-white shadow-sm sm:p-12">
        <h1 className="max-w-2xl text-3xl font-bold sm:text-4xl">About CAS</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/80 sm:text-base">
          CAS — Consultancy for Abroad Study — helps students from around the world study at Ministry of
          Education–listed universities across China. We handle the whole journey: choosing the right program,
          applying, securing scholarships, and supporting you through visa and arrival.
        </p>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[["13+", "Years of experience"], ["13K+", "Students placed"], ["200+", "University partners"], ["100%", "Application support"]].map(([v, l]) => (
          <div key={l} className="rounded-xl border bg-card p-5 text-center shadow-sm">
            <p className="text-3xl font-bold text-cas-navy tabular-nums">{v}</p>
            <p className="mt-1 text-xs text-muted-foreground">{l}</p>
          </div>
        ))}
      </section>

      {/* Why China */}
      <SiteSection title="Why study in China" subtitle="A world-class education with real opportunity — at a fraction of the cost.">
        <ul className="grid gap-3 sm:grid-cols-2">
          {WHY_CHINA.map((point) => (
            <li key={point} className="flex items-start gap-3 rounded-xl border bg-card p-4 text-sm shadow-sm">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-cas-navy" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </SiteSection>

      {/* How we help */}
      <SiteSection title="How we help" subtitle="A clear, supported path from first enquiry to your first day of class.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="inline-flex size-9 items-center justify-center rounded-lg bg-cas-navy-50 text-cas-navy"><Icon className="size-5" /></span>
                <span className="text-xs font-semibold text-muted-foreground">Step {i + 1}</span>
              </div>
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </SiteSection>

      {/* Mission band */}
      <section className="flex flex-col items-start gap-4 rounded-2xl border bg-cas-navy-50 p-6 sm:flex-row sm:items-center sm:p-8">
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-cas-navy text-white"><Users className="size-5" /></span>
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-cas-navy">Our mission</span> — to make studying abroad in China simple,
          transparent and successful for every student we work with.
        </p>
      </section>

      {/* CTA */}
      <section className="rounded-2xl border bg-card p-8 text-center shadow-sm sm:p-10">
        <GraduationCap className="mx-auto size-8 text-cas-navy" />
        <h2 className="mt-3 text-2xl font-semibold text-cas-navy">Let's plan your journey</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">Talk to a CAS counselor about your options — it's free and there's no obligation.</p>
        <Link to="/site/contact" className="mt-5 inline-flex h-11 items-center gap-2 rounded-md bg-cas-navy px-6 text-sm font-semibold text-white hover:bg-cas-navy-700">
          Contact us <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
  )
}

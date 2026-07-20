import { ArrowRight, BadgeCheck, ReceiptText, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { SiteSection } from "@/features/site/components"
import { useSeo } from "@/lib/seo"

const PRINCIPLES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Sparkles, title: "Free to get started", body: "Your first consultation and a personalised study plan — including a university and scholarship shortlist — cost nothing." },
  { icon: ReceiptText, title: "Priced transparently", body: "Where a service has a fee, you see a clear, itemised quote before you commit. No hidden charges, ever." },
  { icon: ShieldCheck, title: "Only pay for what you need", body: "Take the full package or just the parts you want. Your advisor tailors the support — and the cost — to your plan." },
]

const FREE = [
  "Initial consultation with an advisor",
  "Personalised study plan",
  "University & program shortlisting",
  "Scholarship matching guidance",
]

const QUOTED = [
  "Application handling & document review",
  "Visa (JW202 / admission letter) assistance",
  "Accommodation booking",
  "Airport pickup & pre-departure support",
  "Certified document translation",
]

export default function SitePricing() {
  useSeo({
    title: "Pricing — Transparent Fees for Studying in China",
    description: "How CAS pricing works: a free consultation and study plan, with any paid services quoted clearly and up front. No hidden fees.",
    canonicalPath: "/site/pricing",
  })

  return (
    <div className="space-y-12">
      <section className="rounded-2xl bg-cas-navy p-8 text-white shadow-sm sm:p-12">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cas-gold/20 px-3 py-1 text-xs font-medium text-cas-gold-50">
          Clear &amp; student-first
        </span>
        <h1 className="mt-4 max-w-2xl text-3xl font-bold sm:text-4xl">Simple, transparent pricing</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/80 sm:text-base">
          Every student's plan is different, so we start free and quote clearly for anything beyond that —
          you'll always know the cost before you commit.
        </p>
      </section>

      <SiteSection title="How our pricing works">
        <div className="grid gap-4 sm:grid-cols-3">
          {PRINCIPLES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border bg-card p-6 shadow-sm">
              <span className="inline-flex size-11 items-center justify-center rounded-lg bg-cas-gold-50 text-cas-gold-600"><Icon className="size-5" /></span>
              <h3 className="mt-4 font-semibold text-cas-navy">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </SiteSection>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border-2 border-cas-gold bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-cas-gold px-2.5 py-0.5 text-[11px] font-bold text-cas-navy uppercase">Free</span>
            <h3 className="font-semibold text-cas-navy">Getting started</h3>
          </div>
          <ul className="mt-4 space-y-2.5">
            {FREE.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <BadgeCheck className="mt-0.5 size-4 shrink-0 text-cas-gold-600" /> {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-cas-navy-50 px-2.5 py-0.5 text-[11px] font-bold text-cas-navy uppercase">Quoted up front</span>
            <h3 className="font-semibold text-cas-navy">Optional services</h3>
          </div>
          <ul className="mt-4 space-y-2.5">
            {QUOTED.map((q) => (
              <li key={q} className="flex items-start gap-2 text-sm text-muted-foreground">
                <ReceiptText className="mt-0.5 size-4 shrink-0 text-cas-navy" /> {q}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="flex flex-col items-start justify-between gap-4 rounded-2xl bg-cas-navy p-8 text-white sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold">Want a personalised quote?</h2>
          <p className="mt-1 text-sm text-white/80">Start with a free study plan — we'll follow up with clear next steps and costs.</p>
        </div>
        <Link to="/site/study-plan" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md bg-cas-gold px-6 text-sm font-semibold text-cas-navy hover:bg-cas-gold-600">
          Get a free study plan <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
  )
}

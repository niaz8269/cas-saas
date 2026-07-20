import { ArrowRight, Award, Banknote, Building2, Handshake, LineChart, Megaphone, type LucideIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { SiteSection } from "@/features/site/components"
import { useSeo } from "@/lib/seo"

const BENEFITS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Building2, title: "200+ universities", body: "Refer students to Ministry of Education–listed universities across China through one trusted channel." },
  { icon: Banknote, title: "Competitive commissions", body: "Earn on every successful placement, tracked transparently and paid on a clear schedule." },
  { icon: LineChart, title: "A real-time partner portal", body: "Submit and track every application, see status changes live, and manage your students in one place." },
  { icon: Megaphone, title: "Marketing support", body: "Access up-to-date program lists, intake deadlines and co-branded materials to help you recruit." },
  { icon: Award, title: "Authorized since 2012", body: "Work with an established, university-authorized agent with a strong visa and admission track record." },
  { icon: Handshake, title: "Dedicated partner team", body: "A named CAS contact supports you and your students from first enquiry to arrival." },
]

const STEPS = [
  { n: 1, title: "Apply to partner", body: "Tell us about your agency and the students you work with." },
  { n: 2, title: "Get onboarded", body: "We set up your partner portal access and walk your team through the process." },
  { n: 3, title: "Refer & earn", body: "Submit applications, track them live, and earn on every successful placement." },
]

export default function SitePartner() {
  useSeo({
    title: "Partner with CAS — Agency & Recruitment Cooperation",
    description: "Partner with CAS to place students in Chinese universities: 200+ MoE-listed universities, competitive commissions, a real-time partner portal and dedicated support.",
    canonicalPath: "/site/partner",
  })

  return (
    <div className="space-y-12">
      <section className="rounded-sm bg-cas-navy p-8 text-white shadow-sm sm:p-12">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cas-red/20 px-3 py-1 text-xs font-medium text-cas-red-50">
          For agencies &amp; recruiters
        </span>
        <h1 className="mt-4 max-w-2xl text-3xl font-bold sm:text-4xl">Partner with CAS</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/80 sm:text-base">
          Give your students access to China's top universities through an authorized agent — with a live
          partner portal, competitive commissions and a team that supports you at every step.
        </p>
        <Link to="/site/contact" className="mt-6 inline-flex h-11 items-center gap-2 rounded-sm bg-cas-red px-6 text-sm font-semibold text-white hover:bg-cas-red-600">
          Become a partner <ArrowRight className="size-4" />
        </Link>
      </section>

      <SiteSection title="Why partner with us" subtitle="One trusted channel into studying in China.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-sm border bg-card p-6 shadow-sm">
              <span className="inline-flex size-11 items-center justify-center rounded-sm bg-cas-red-50 text-cas-red-600"><Icon className="size-5" /></span>
              <h3 className="mt-4 font-semibold text-cas-navy">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </SiteSection>

      <SiteSection title="How it works">
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="rounded-sm border bg-card p-6 shadow-sm">
              <span className="flex size-9 items-center justify-center rounded-full bg-cas-navy font-sans text-lg font-bold text-white">{s.n}</span>
              <h3 className="mt-3 font-semibold text-cas-navy">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
            </li>
          ))}
        </ol>
      </SiteSection>

      <section className="flex flex-col items-start justify-between gap-4 rounded-sm bg-cas-navy p-8 text-white sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold">Ready to work together?</h2>
          <p className="mt-1 text-sm text-white/80">Tell us about your agency and we'll set up your partnership.</p>
        </div>
        <Link to="/site/contact" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-sm bg-cas-red px-6 text-sm font-semibold text-white hover:bg-cas-red-600">
          Become a partner <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
  )
}

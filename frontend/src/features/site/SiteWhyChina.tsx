import { ArrowRight, Award, Building2, Coins, GraduationCap, Globe2, Landmark, Sparkles, type LucideIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { SiteSection } from "@/features/site/components"
import { useSeo } from "@/lib/seo"

const REASONS: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Award, title: "World-ranked universities", body: "Study at Ministry of Education–listed and globally ranked institutions recognised worldwide." },
  { icon: Globe2, title: "English-taught degrees", body: "Full degrees taught in English across medicine, engineering, business and more — no Chinese required to start." },
  { icon: Coins, title: "Affordable & funded", body: "Low tuition and living costs, plus generous government, provincial and university scholarships." },
  { icon: Building2, title: "Opportunity & industry", body: "Study in one of the world's largest economies, with real exposure to research and industry." },
  { icon: Landmark, title: "Rich culture & safety", body: "Modern, safe cities with a deep culture and a large, welcoming international-student community." },
  { icon: GraduationCap, title: "Globally recognised degrees", body: "Qualifications accepted by employers and licensing bodies around the world." },
]

export default function SiteWhyChina() {
  useSeo({
    title: "Why Study in China",
    description: "Why study in China — world-ranked, Ministry of Education–listed universities, English-taught degrees, affordable tuition and generous scholarships.",
    canonicalPath: "/site/why-china",
  })

  return (
    <div className="space-y-12">
      <section className="rounded-sm bg-cas-navy p-8 text-white shadow-sm sm:p-12">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cas-orange/20 px-3 py-1 text-xs font-medium text-cas-orange-50">
          <Sparkles className="size-3.5" /> A world-class education
        </span>
        <h1 className="mt-4 max-w-2xl text-3xl font-bold sm:text-4xl">Why study in China</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/80 sm:text-base">
          China has become one of the world's leading destinations for international students — combining top universities,
          affordable costs, generous scholarships and real opportunity.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[["500K+", "International students"], ["English", "Taught programs"], ["Scholarships", "Widely available"], ["Global", "Degree recognition"]].map(([v, l]) => (
          <div key={l} className="rounded-sm border bg-card p-5 text-center shadow-sm">
            <p className="text-2xl font-bold text-cas-navy">{v}</p>
            <p className="mt-1 text-xs text-muted-foreground">{l}</p>
          </div>
        ))}
      </section>

      <SiteSection title="Reasons students choose China" subtitle="What makes it one of the smartest study-abroad decisions today.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {REASONS.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-sm border bg-card p-6 shadow-sm">
              <span className="inline-flex size-11 items-center justify-center rounded-sm bg-cas-navy-50 text-cas-navy"><Icon className="size-5" /></span>
              <h3 className="mt-4 font-semibold text-cas-navy">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </SiteSection>

      <section className="flex flex-col items-start justify-between gap-4 rounded-sm border bg-cas-orange-50 p-6 sm:flex-row sm:items-center sm:p-8">
        <div>
          <h2 className="text-lg font-semibold text-cas-navy">Ready to explore your options?</h2>
          <p className="mt-1 text-sm text-muted-foreground">Browse programs across our partner universities and find your fit.</p>
        </div>
        <Link to="/site/programs" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-sm bg-cas-navy px-6 text-sm font-semibold text-white hover:bg-cas-navy-700">
          Find your program <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
  )
}

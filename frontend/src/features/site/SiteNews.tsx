import { ArrowRight, Award, CalendarDays, FileText, School, Stamp, Stethoscope, Wallet, type LucideIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { SitePageHeader, SiteSection } from "@/features/site/components"
import { useSeo } from "@/lib/seo"

const GUIDES: { icon: LucideIcon; title: string; body: string; to: string }[] = [
  { icon: FileText, title: "How to apply, step by step", body: "From choosing a program to submitting a complete application — the whole process explained.", to: "/site/study-plan" },
  { icon: Stamp, title: "Your student visa, explained", body: "What the JW202 and admission letter are, and how the X-visa process works.", to: "/site/faq" },
  { icon: Award, title: "Scholarships in China", body: "Government, provincial and university awards — who qualifies and how to apply.", to: "/site/scholarships" },
  { icon: Wallet, title: "What it costs to study in China", body: "Tuition and living costs, and how CAS's transparent pricing works.", to: "/site/pricing" },
  { icon: Stethoscope, title: "Study MBBS in China", body: "English-taught medical degrees at recognised universities — a popular route with CAS.", to: "/site/programs?q=MBBS" },
  { icon: School, title: "Choosing the right university", body: "How to weigh city, ranking, language and budget to find your best fit.", to: "/site/universities" },
]

const UPDATES: { date: string; tag: string; title: string; body: string; to: string }[] = [
  {
    date: "January 2026", tag: "Intakes",
    title: "March 2026 intake applications are open",
    body: "Applications for the Spring 2026 intake are now open across our partner universities. Early applicants get first pick of programs and scholarships.",
    to: "/site/programs",
  },
  {
    date: "January 2026", tag: "Scholarships",
    title: "CSC & provincial scholarships now accepting applications",
    body: "Chinese Government (CSC) and provincial scholarships covering full or partial tuition — plus a monthly stipend — are open for eligible students.",
    to: "/site/scholarships",
  },
  {
    date: "December 2025", tag: "Universities",
    title: "New partner universities added to the catalogue",
    body: "We've expanded our list of Ministry of Education–listed partner universities, adding more English-taught medical and engineering programs.",
    to: "/site/universities",
  },
]

export default function SiteNews() {
  useSeo({
    title: "News & Updates",
    description: "News and updates from CAS — intake deadlines, scholarship openings and partner-university announcements for studying in China.",
    canonicalPath: "/site/news",
  })

  return (
    <div className="space-y-8">
      <SitePageHeader
        eyebrow="News & resources"
        title="Latest from CAS"
        subtitle="Intake deadlines and scholarship openings, plus guides to help you plan your studies in China."
      />

      <SiteSection title="Latest updates">
        <div className="grid gap-4 lg:grid-cols-3">
          {UPDATES.map((u) => (
            <article key={u.title} className="flex flex-col rounded-sm border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-transparent bg-cas-red-50 text-cas-red-600">{u.tag}</Badge>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays className="size-3.5" /> {u.date}</span>
              </div>
              <h2 className="mt-3 font-semibold text-cas-navy">{u.title}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{u.body}</p>
              <Link to={u.to} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-cas-navy hover:underline">
                Learn more <ArrowRight className="size-4" />
              </Link>
            </article>
          ))}
        </div>
      </SiteSection>

      <SiteSection title="Guides &amp; resources" subtitle="Everything you need to know to plan your studies in China.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDES.map(({ icon: Icon, title, body, to }) => (
            <Link key={title} to={to} className="group flex flex-col rounded-sm border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow">
              <span className="inline-flex size-11 items-center justify-center rounded-sm bg-cas-navy-50 text-cas-navy"><Icon className="size-5" /></span>
              <h3 className="mt-4 font-semibold text-cas-navy group-hover:text-cas-red-600">{title}</h3>
              <p className="mt-1.5 flex-1 text-sm text-muted-foreground">{body}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-cas-navy">Read guide <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" /></span>
            </Link>
          ))}
        </div>
      </SiteSection>
    </div>
  )
}

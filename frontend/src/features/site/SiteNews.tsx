import { ArrowRight, CalendarDays } from "lucide-react"
import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { SiteSection } from "@/features/site/components"

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
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-cas-navy sm:text-3xl">News & updates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Intake deadlines, scholarship openings and the latest from CAS and our partner universities.
        </p>
      </div>

      <SiteSection title="Latest updates">
        <div className="grid gap-4 lg:grid-cols-3">
          {UPDATES.map((u) => (
            <article key={u.title} className="flex flex-col rounded-xl border bg-card p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-transparent bg-cas-gold-50 text-cas-gold-600">{u.tag}</Badge>
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
    </div>
  )
}

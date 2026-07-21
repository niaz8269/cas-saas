import { useQuery } from "@tanstack/react-query"
import { Plus, X } from "lucide-react"
import { type ReactNode, useState } from "react"
import { Link } from "react-router-dom"

import { getSiteScholarships, type SiteProgram, type SiteUniversityCard } from "@/features/site/api"
import { cn } from "@/lib/utils"

const TABS = [
  { key: "universities", label: "University Updates" },
  { key: "programs", label: "Program Updates" },
  { key: "scholarships", label: "Latest Scholarships" },
  { key: "news", label: "New Stories" },
] as const
type TabKey = (typeof TABS)[number]["key"]

const NEW_STORIES: [string, string][] = [
  ["March 2026 intake now open across partner universities", "/site/news"],
  ["CSC & provincial scholarships accepting applications", "/site/scholarships"],
  ["New Ministry of Education–listed universities added", "/site/universities"],
  ["How to prepare a strong MBBS application", "/site/programs?q=MBBS"],
  ["Student visa guide: documents and timeline", "/site/why-china"],
]

const STOPWORDS = new Set(["of", "and", "the", "for", "&", "in", "a"])
// Auto-abbreviation from a name's significant words: "Beijing Institute of Technology" → "BIT".
const abbr = (name: string) =>
  name.split(/\s+/).filter((w) => w && !STOPWORDS.has(w.toLowerCase())).map((w) => w[0]).join("").toUpperCase().slice(0, 5)

const fmtDate = (d: string | number | Date) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

function Row({ to, left, right }: { to: string; left: ReactNode; right: string }) {
  return (
    <Link to={to} className="flex items-center justify-between gap-4 border-b border-white/5 px-4 py-2.5 text-sm transition-colors last:border-0 hover:bg-white/5">
      <span className="min-w-0 truncate text-white/90">{left}</span>
      <span className="shrink-0 text-xs text-white/55">({right})</span>
    </Link>
  )
}

function Note({ children }: { children: ReactNode }) {
  return <p className="px-4 py-6 text-center text-sm text-white/50">{children}</p>
}

/**
 * The hero's "+" expander (reference behaviour): a centred toggle below the
 * ranked cards that opens a tabbed, scrollable panel of the latest updates
 * across universities, programs, scholarships and stories.
 */
export default function HeroUpdates({ universities, programs }: { universities: SiteUniversityCard[]; programs: SiteProgram[] }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<TabKey>("universities")

  // Scholarships load lazily — only when the panel is first opened.
  const scholarships = useQuery({
    queryKey: ["site-scholarships", "hero-updates"],
    queryFn: () => getSiteScholarships({}),
    enabled: open,
  })

  // Rolling "last application" date (~2 months out) so rows never read as stale.
  const lastApp = fmtDate(Date.now() + 60 * 86_400_000)

  return (
    <div className="mt-4">
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Hide latest updates" : "Show latest updates"}
          className="flex size-9 items-center justify-center rounded-full border border-white/40 text-white/80 transition-colors hover:border-cas-red hover:text-cas-red"
        >
          {open ? <X className="size-5" /> : <Plus className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="mx-auto mt-4 max-w-4xl overflow-hidden rounded-sm border border-white/10 bg-[#1a1733]/95 text-left shadow-xl backdrop-blur">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-white/10 px-4 py-3">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "text-sm font-semibold tracking-wide uppercase transition-colors",
                  tab === t.key ? "text-cas-red" : "text-white/70 hover:text-white",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="max-h-64 overflow-y-auto">
            {tab === "universities" && (universities.length
              ? universities.map((u) => (
                <Row
                  key={u.id}
                  to={u.slug ? `/site/universities/${u.slug}` : "/site/universities"}
                  left={<>{u.name} <span className="text-white/45">| {abbr(u.name)}{u.city ? ` | ${u.city}` : ""}</span></>}
                  right={`Last application: ${lastApp}`}
                />
              ))
              : <Note>No universities to show yet.</Note>)}

            {tab === "programs" && (programs.length
              ? programs.map((p) => (
                <Row
                  key={p.id}
                  to={p.university?.slug ? `/site/universities/${p.university.slug}` : "/site/programs"}
                  left={<>{p.name} <span className="text-white/45">| {p.university?.name ?? "—"} | <span className="capitalize">{p.level}</span></span></>}
                  right={`Last application: ${lastApp}`}
                />
              ))
              : <Note>No programs to show yet.</Note>)}

            {tab === "scholarships" && (scholarships.isPending
              ? <Note>Loading…</Note>
              : scholarships.data?.data.length
                ? scholarships.data.data.map((s) => (
                  <Row
                    key={s.id}
                    to={s.university?.slug ? `/site/universities/${s.university.slug}` : "/site/scholarships"}
                    left={<>{s.name} <span className="text-white/45">| {s.coverage ?? s.type ?? "Scholarship"}{s.university?.name ? ` | ${s.university.name}` : ""}</span></>}
                    right={s.deadline ? `Deadline: ${fmtDate(s.deadline)}` : "Open now"}
                  />
                ))
                : <Note>No scholarships to show yet.</Note>)}

            {tab === "news" && NEW_STORIES.map(([title, to]) => (
              <Row key={title} to={to} left={title} right={`Updated ${lastApp}`} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

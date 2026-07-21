import { useQuery } from "@tanstack/react-query"
import { Plus, X } from "lucide-react"
import { type ReactNode, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { getSiteScholarships, type SiteProgram, type SiteUniversityCard } from "@/features/site/api"
import { cn } from "@/lib/utils"

// Display labels are i18n keys resolved at render (report — 5-language support).
const TABS = [
  { key: "universities", labelKey: "heroUpdates.tabUniversities" },
  { key: "programs", labelKey: "heroUpdates.tabPrograms" },
  { key: "scholarships", labelKey: "heroUpdates.tabScholarships" },
  { key: "news", labelKey: "heroUpdates.tabNews" },
] as const
type TabKey = (typeof TABS)[number]["key"]

// [titleKey, to] — title is an i18n key resolved at render; the URL stays literal.
const NEW_STORIES: [string, string][] = [
  ["heroUpdates.storyMarchIntake", "/site/news?post=march-2026-intake"],
  ["heroUpdates.storyCscScholarships", "/site/news?post=csc-scholarships"],
  ["heroUpdates.storyNewMoe", "/site/news?post=new-moe-universities"],
  ["heroUpdates.storyMbbsGuide", "/site/news?post=mbbs-application-guide"],
  ["heroUpdates.storyVisaGuide", "/site/news?post=student-visa-guide"],
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
  const { t } = useTranslation()
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
    <div className="relative mt-4">
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? t("heroUpdates.hideUpdates") : t("heroUpdates.showUpdates")}
          className="flex size-9 items-center justify-center rounded-full border border-white/40 bg-black/20 text-white/80 backdrop-blur transition-colors hover:border-cas-red hover:text-cas-red"
        >
          {open ? <X className="size-5" /> : <Plus className="size-5" />}
        </button>
      </div>

      {/* Floating popup — overlays the hero (does not push it down), like the reference. */}
      {open && (
        <div className="absolute top-full left-1/2 z-30 mt-3 w-[calc(100vw-2rem)] max-w-4xl -translate-x-1/2 overflow-hidden rounded-sm border border-white/10 bg-[#1a1733]/95 text-left shadow-2xl backdrop-blur">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-white/10 px-4 py-3">
            {TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={cn(
                  "text-sm font-semibold tracking-wide uppercase transition-colors",
                  tab === item.key ? "text-cas-red" : "text-white/70 hover:text-white",
                )}
              >
                {t(item.labelKey)}
              </button>
            ))}
          </div>

          <div className="scrollbar-slim max-h-64 overflow-y-auto">
            {tab === "universities" && (universities.length
              ? universities.map((u) => (
                <Row
                  key={u.id}
                  to={u.slug ? `/site/universities/${u.slug}` : "/site/universities?src=updates"}
                  left={<>{u.name} <span className="text-white/45">| {abbr(u.name)}{u.city ? ` | ${u.city}` : ""}</span></>}
                  right={t("heroUpdates.lastApplication", { date: lastApp })}
                />
              ))
              : <Note>{t("heroUpdates.noUniversities")}</Note>)}

            {tab === "programs" && (programs.length
              ? programs.map((p) => (
                <Row
                  key={p.id}
                  to={p.university?.slug ? `/site/universities/${p.university.slug}` : "/site/programs?src=updates"}
                  left={<>{p.name} <span className="text-white/45">| {p.university?.name ?? "—"} | <span className="capitalize">{p.level}</span></span></>}
                  right={t("heroUpdates.lastApplication", { date: lastApp })}
                />
              ))
              : <Note>{t("heroUpdates.noPrograms")}</Note>)}

            {tab === "scholarships" && (scholarships.isPending
              ? <Note>{t("heroUpdates.loading")}</Note>
              : scholarships.data?.data.length
                ? scholarships.data.data.map((s) => (
                  <Row
                    key={s.id}
                    to={s.university?.slug ? `/site/universities/${s.university.slug}` : "/site/scholarships?src=updates"}
                    left={<>{s.name} <span className="text-white/45">| {s.coverage ?? s.type ?? t("heroUpdates.scholarshipFallback")}{s.university?.name ? ` | ${s.university.name}` : ""}</span></>}
                    right={s.deadline ? t("heroUpdates.deadline", { date: fmtDate(s.deadline) }) : t("heroUpdates.openNow")}
                  />
                ))
                : <Note>{t("heroUpdates.noScholarships")}</Note>)}

            {tab === "news" && NEW_STORIES.map(([titleKey, to]) => (
              <Row key={titleKey} to={to} left={t(titleKey)} right={t("heroUpdates.updated", { date: lastApp })} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

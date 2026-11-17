import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeft,
  ArrowRight,
  Award,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  BookOpen,
  GraduationCap,
  Info,
  Languages,
  Lock,
  MapPin,
  Plane,
  Search,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router-dom"
import PortalLink from "@/features/site/PortalLink"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { AdmissionWindow } from "@/features/site/components"
import { getSiteUniversity, type SiteOverviewSection, type SiteRepProfessor, type SiteUniversityDetail } from "@/features/site/api"
import ApplyButton from "@/features/site/ApplyButton"
import EnquiryForm from "@/features/site/EnquiryForm"
import { formatDuration } from "@/lib/duration"
import { useSeo } from "@/lib/seo"
import { cn } from "@/lib/utils"

const money = (v: string | number | null | undefined, currency?: string | null) =>
  v == null ? null : `${Number(v).toLocaleString()} ${currency ?? ""}`.trim()

const levelLabel = (l: string) => l.replace(/_/g, "-").replace(/^\w/, (c) => c.toUpperCase())

export default function SiteUniversity() {
  const { t } = useTranslation()
  const { slug = "" } = useParams()

  const { data, isPending, isError } = useQuery({
    queryKey: ["site-university", slug],
    queryFn: () => getSiteUniversity(slug),
    retry: false,
  })

  const uni = data?.data
  useSeo({
    title: uni ? t("university.seoTitle", { name: uni.name }) : t("university.seoTitleFallback"),
    description: uni
      ? t("university.seoDescription", {
          name: uni.name,
          location: uni.city ? t("university.seoDescriptionLocation", { city: uni.city }) : "",
          moe: uni.moe_listed ? t("university.seoDescriptionMoe") : "",
        })
      : t("university.seoDescriptionFallback"),
    canonicalPath: `/site/universities/${slug}`,
  })

  if (isPending) return <Skeleton className="h-96 w-full rounded-sm" />

  if (isError || !data) {
    return (
      <div className="rounded-sm border bg-card p-10 text-center shadow-sm">
        <p className="text-sm text-muted-foreground">{t("university.notAvailable")}</p>
        <Button asChild variant="secondary" size="sm" className="mt-4">
          <Link to="/site/universities"><ArrowLeft className="size-4" /> {t("university.backToUniversities")}</Link>
        </Button>
      </div>
    )
  }

  const u = data.data
  const cover = u.cover_url ? { src: u.cover_url, credit: u.cover_credit ?? null, own: !u.cover_is_city } : null
  const today = new Date().setHours(0, 0, 0, 0)
  const upcoming = u.intakes.find((i) => i.status !== 'closed' && (!i.application_deadline || new Date(i.application_deadline).getTime() >= today))
  const rep = u.representative_professor

  return (
    <div className="space-y-6">
      <Link to="/site/universities" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> {t("university.allUniversities")}
      </Link>

      {/* Hero */}
      <div className="overflow-hidden rounded-sm border bg-card shadow-sm">
        {/* Cover — image, or a designed gradient banner when none is available */}
        <div className="relative h-48 overflow-hidden sm:h-60">
          {cover ? (
            <img src={cover.src} alt={cover.own ? `${u.name} campus` : `${u.city ?? "China"} city view near ${u.name}`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-cas-navy-900 via-cas-navy to-cas-navy-700">
              <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
              <span className="relative px-6 text-center font-sans text-2xl font-bold text-white/90 sm:text-3xl">{u.name}</span>
            </div>
          )}
        </div>
        <div className="p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3 sm:gap-4">
              {u.logo_url && <img src={u.logo_url} alt={t("university.logoAlt", { name: u.name })} className="relative z-10 -mt-10 size-16 shrink-0 sm:-mt-14 sm:size-20 rounded-sm border-2 border-card bg-white object-contain p-1 shadow-lg" />}
              <div>
                <h1 className="text-2xl font-bold text-cas-navy sm:text-3xl">{u.name}</h1>
                {u.name_zh && <p className="mt-0.5 text-lg text-muted-foreground">{u.name_zh}</p>}
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {(u.city || u.country) && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {[u.city, u.province, u.country].filter(Boolean).join(", ")}</span>}
                  {u.nearest_airport && <span className="inline-flex items-center gap-1"><Plane className="size-3.5" /> {u.nearest_airport}</span>}
                </div>
                {u.moe_listed && (
                  <Badge variant="outline" className="mt-3 border-transparent bg-cas-red-50 text-cas-red-600">
                    <ShieldCheck className="size-3.5" /> {t("university.moeListedBadge")}{u.moe_mbbs_year ? ` ${u.moe_mbbs_year}` : ""}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href="#enquire" className="inline-flex h-11 items-center gap-1.5 rounded-sm border bg-background px-5 text-sm font-semibold text-cas-navy hover:bg-muted">{t("university.enquire")}</a>
              <ApplyButton universitySlug={u.slug} className="inline-flex h-11 items-center gap-1.5 rounded-sm bg-cas-red px-5 text-sm font-bold text-white shadow-sm hover:bg-cas-red-600">
                {t("university.applyNow")} <ArrowRight className="size-4" />
              </ApplyButton>
            </div>
          </div>

          <div className="mt-5 rounded-sm bg-subtle px-3 py-2 text-sm">
            {upcoming ? (
              <>
                <p className="mb-1 font-medium">{upcoming.name}</p>
                <AdmissionWindow opens={upcoming.application_open_date} closes={upcoming.application_deadline} />
              </>
            ) : u.deadlines_locked ? (
              <p className="flex items-center gap-2"><CalendarClock className="size-4 text-cas-navy" /><SignInGate label={t("university.signInForDeadlines")} /></p>
            ) : (
              <p className="flex items-center gap-2"><CalendarClock className="size-4 text-cas-navy" />{t("admissionWindow.nextTbd")}</p>
            )}
          </div>

        </div>
      </div>

      {/* Tabbed detail — Overview / Programs / Intakes / Scholarships / Admission */}
      <UniversityTabs u={u} rep={rep} />

      {/* Enquiry */}
      <EnquiryForm universityId={u.id} universityName={u.name} />
    </div>
  )
}

// ── Tabbed detail body ───────────────────────────────────────────────────

function UniversityTabs({ u, rep }: { u: SiteUniversityDetail; rep: SiteRepProfessor | null }) {
  const { t } = useTranslation()
  const tabs: { key: string; label: string; icon: LucideIcon }[] = [
    { key: "overview", label: t("university.tabOverview"), icon: Info },
    { key: "programs", label: u.programs.length ? t("university.tabProgramsCount", { count: u.programs.length }) : t("university.tabPrograms"), icon: GraduationCap },
    ...(u.intakes.length || u.deadlines_locked ? [{ key: "intakes", label: t("university.tabIntakes"), icon: CalendarDays }] : []),
    ...(u.scholarships.length ? [{ key: "scholarships", label: t("university.tabScholarships"), icon: Award }] : []),
    ...(u.guide?.blocks?.length ? [{ key: "guide", label: t("university.tabGuide"), icon: BookOpen }] : []),
    { key: "admission", label: t("university.tabAdmission"), icon: ClipboardCheck },
  ]
  const [tab, setTab] = useState("overview")

  return (
    <div>
      <div className="flex flex-wrap gap-1 rounded-sm border bg-card p-1 shadow-sm">
        {tabs.map((tb) => (
          <button
            key={tb.key}
            type="button"
            onClick={() => setTab(tb.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm px-4 py-2 text-sm font-medium transition-colors",
              tab === tb.key ? "bg-cas-navy text-white shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-cas-navy",
            )}
          >
            <tb.icon className="size-4" /> {tb.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "overview" && <OverviewPanel u={u} rep={rep} />}
        {tab === "programs" && <ProgramsPanel u={u} />}
        {tab === "intakes" && <IntakesPanel u={u} />}
        {tab === "scholarships" && <ScholarshipsPanel u={u} />}
        {tab === "guide" && <GuidePanel u={u} />}
        {tab === "admission" && <AdmissionPanel u={u} />}
      </div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-sm border bg-card p-6 text-sm text-muted-foreground shadow-sm">{text}</p>
}

/** Registered-only content is gated (ADR-0015); prompt the visitor to sign in. */
function SignInGate({ label, className }: { label: string; className?: string }) {
  return (
    <PortalLink to="/portal/login" className={cn("inline-flex items-center gap-1 font-semibold text-cas-red hover:underline", className)}>
      <Lock className="size-3.5" /> {label}
    </PortalLink>
  )
}

/** The long Overview: a contents row and the sections (history, campus, city, programs, admission). */
export function OverviewArticle({ sections }: { sections: SiteOverviewSection[] }) {
  const { t } = useTranslation()
  const slug = (i: number) => `overview-${i}`
  const toc = sections.map((s, i) => ({ s, i })).filter(({ s }) => s.level === 2)

  return (
    <article className="rounded-sm border bg-card p-6 shadow-sm sm:p-8">
      <p className="mb-4 text-xs font-semibold tracking-wider text-cas-red-600 uppercase">{t("university.profileLabel")}</p>
      {toc.length > 3 && (
        <nav aria-label={t("university.overviewContents")} className="mb-6 flex flex-wrap gap-x-4 gap-y-1.5 border-b pb-4 text-sm">
          {toc.map(({ s, i }) => (
            <a key={i} href={`#${slug(i)}`} className="text-cas-navy hover:underline">{s.h}</a>
          ))}
        </nav>
      )}
      <div className="max-w-3xl space-y-8">
        {sections.map((s, i) => {
          const Heading = s.level === 2 ? "h2" : "h3"
          const groups: ({ t: "p"; x: string } | { t: "ul"; items: string[] })[] = []
          for (const b of s.blocks) {
            const last = groups[groups.length - 1]
            if (b.t === "li") {
              if (last && last.t === "ul") last.items.push(b.x)
              else groups.push({ t: "ul", items: [b.x] })
            } else groups.push({ t: "p", x: b.x })
          }

          return (
            <section key={i} id={slug(i)} className={s.level === 2 ? "scroll-mt-24" : "-mt-4 scroll-mt-24"}>
              <Heading className={s.level === 2 ? "text-lg font-semibold text-cas-navy" : "text-base font-semibold text-foreground"}>{s.h}</Heading>
              <div className="mt-2 space-y-3 text-sm leading-relaxed text-foreground/90">
                {groups.map((g, j) => g.t === "p" ? (
                  <p key={j}>{g.x}</p>
                ) : (
                  <ul key={j} className="grid list-disc gap-x-8 gap-y-1 pl-5 sm:grid-cols-2">
                    {g.items.map((x, k) => <li key={k}>{x}</li>)}
                  </ul>
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </article>
  )
}

function OverviewPanel({ u, rep }: { u: SiteUniversityDetail; rep: SiteRepProfessor | null }) {
  const { t } = useTranslation()
  const facts: [string, string][] = [
    [t("university.factLocation"), [u.city, u.country].filter(Boolean).join(", ") || "—"],
    [t("university.factMoeListed"), u.moe_listed ? t("university.moeApprovedYear", { year: u.moe_mbbs_year ?? "" }) : "—"],
    [t("university.factNearestAirport"), u.nearest_airport || "—"],
    [t("university.factPrograms"), String(u.programs.length)],
    ...(u.founded_year ? [[t("university.factFounded"), String(u.founded_year)] as [string, string]] : []),
    ...(u.institution_type ? [[t("university.factType"), u.institution_type] as [string, string]] : []),
    ...(u.student_count ? [[t("university.factStudents"), u.student_count] as [string, string]] : []),
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {facts.map(([l, v]) => (
          <div key={l} className="rounded-sm border bg-card p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">{l}</p>
            <p className="mt-0.5 text-sm font-semibold text-cas-navy">{v}</p>
          </div>
        ))}
      </div>
      {u.overview?.length ? (
        <OverviewArticle sections={u.overview} />
      ) : u.about ? (
        <div className="rounded-sm border bg-card p-6 shadow-sm">
          <p className="mb-3 text-xs font-semibold tracking-wider text-cas-red-600 uppercase">{t("university.profileLabel")}</p>
          <p className="text-sm whitespace-pre-line text-foreground/90">{u.about}</p>
        </div>
      ) : null}
      {rep?.name && (
        <div className="rounded-sm border bg-card p-6 shadow-sm">
          <h3 className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{t("university.repHeading")}</h3>
          <div className="mt-2 flex items-center gap-3">
            {rep.photo_url && <img src={rep.photo_url} alt={rep.name} className="size-11 rounded-full object-cover" />}
            <div>
              <p className="text-sm font-medium">{rep.name}</p>
              {rep.title && <p className="text-xs text-muted-foreground">{rep.title}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const PROGRAMS_PAGE = 24

function ProgramsPanel({ u }: { u: SiteUniversityDetail }) {
  const { t } = useTranslation()
  const [shown, setShown] = useState(PROGRAMS_PAGE)
  const [q, setQ] = useState("")
  const [level, setLevel] = useState("")
  const [language, setLanguage] = useState("")
  const [cscOnly, setCscOnly] = useState(false)
  const [status, setStatus] = useState<"" | "confirmed" | "registered">("")
  const [sort, setSort] = useState<"name" | "fee">("name")

  const levels = useMemo(() => [...new Set(u.programs.map((p) => p.level))], [u.programs])
  const languages = useMemo(() => [...new Set(u.programs.map((p) => p.teaching_language).filter((x): x is string => !!x))].sort(), [u.programs])
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    const rows = u.programs.filter((p) =>
      (!term || p.name.toLowerCase().includes(term) || (p.name_zh ?? "").toLowerCase().includes(term)) &&
      (!level || p.level === level) &&
      (!language || p.teaching_language === language) &&
      (!cscOnly || p.csc_listed) &&
      (status === "" || (status === "registered" ? !!p.registry_only : !p.registry_only)))

    // Lowest tuition first; programs without a published fee go last.
    return sort === "fee" ? [...rows].sort((a, b) => (a.tuition_fee == null ? 1 : 0) - (b.tuition_fee == null ? 1 : 0) || Number(a.tuition_fee) - Number(b.tuition_fee)) : rows
  }, [u.programs, q, level, language, cscOnly, status, sort])

  if (!u.programs.length) return <Empty text={t("university.programsEmpty")} />

  const hasRegistered = u.programs.some((p) => p.registry_only)
  const filtering = q.trim() !== "" || level !== "" || language !== "" || cscOnly || status !== ""
  const reset = () => { setQ(""); setLevel(""); setLanguage(""); setCscOnly(false); setStatus(""); setShown(PROGRAMS_PAGE) }
  const selectCls = "h-10 rounded-sm border bg-background px-3 text-sm text-foreground"

  return (
    <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-3 rounded-sm border bg-card p-3 shadow-sm">
      <div className="relative min-w-52 flex-1 sm:max-w-sm">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => { setQ(e.target.value); setShown(PROGRAMS_PAGE) }} placeholder={t("university.programSearchPlaceholder")} aria-label={t("university.programSearchAria")} className="h-10 bg-background pl-9" />
      </div>
      <select value={level} onChange={(e) => { setLevel(e.target.value); setShown(PROGRAMS_PAGE) }} aria-label={t("university.filterLevel")} className={selectCls}>
        <option value="">{t("university.allLevels")}</option>
        {levels.map((l) => <option key={l} value={l}>{levelLabel(l)}</option>)}
      </select>
      <select value={language} onChange={(e) => { setLanguage(e.target.value); setShown(PROGRAMS_PAGE) }} aria-label={t("university.filterLanguage")} className={selectCls}>
        <option value="">{t("university.allLanguages")}</option>
        {languages.map((l) => <option key={l} value={l}>{l}</option>)}
      </select>
      {hasRegistered && (
        <select value={status} onChange={(e) => { setStatus(e.target.value as "" | "confirmed" | "registered"); setShown(PROGRAMS_PAGE) }} aria-label={t("university.filterStatus")} className={selectCls}>
          <option value="">{t("university.allStatuses")}</option>
          <option value="confirmed">{t("university.statusConfirmed")}</option>
          <option value="registered">{t("university.registeredMajor")}</option>
        </select>
      )}
      <button type="button" aria-pressed={cscOnly} onClick={() => { setCscOnly((v) => !v); setShown(PROGRAMS_PAGE) }} className={cn("h-10 rounded-sm border px-3 text-sm font-medium transition-colors", cscOnly ? "border-cas-navy bg-cas-navy-50 text-cas-navy" : "bg-background text-muted-foreground hover:text-foreground")}>
        {t("university.cscListed")}
      </button>
      <select value={sort} onChange={(e) => setSort(e.target.value as "name" | "fee")} aria-label={t("university.sortPrograms")} className={selectCls}>
        <option value="name">{t("university.sortProgramName")}</option>
        <option value="fee">{t("university.sortProgramFee")}</option>
      </select>
      {filtering && <button type="button" onClick={reset} className="text-sm text-cas-navy hover:underline">{t("city.clear")}</button>}
    </div>
    <p className="text-sm text-muted-foreground" aria-live="polite">{t("university.programsShowing", { count: filtered.length, total: u.programs.length })}</p>
    {filtered.length === 0 && <Empty text={t("university.programsNoMatch")} />}
    {hasRegistered && (
      <p className="rounded-sm border border-cas-navy/15 bg-cas-navy-50 px-4 py-3 text-sm text-cas-navy">{t("university.registryNote")}</p>
    )}
    <div className="grid gap-3 sm:grid-cols-2">
      {filtered.slice(0, shown).map((p) => (
        <div key={p.id} className="rounded-sm border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium">{p.name}</h3>
              {p.name_zh && <p className="text-xs text-muted-foreground">{p.name_zh}</p>}
              <p className="text-xs text-muted-foreground">{levelLabel(p.level)}{p.duration_months ? ` · ${formatDuration(p.duration_months, t)}` : ""}</p>
            </div>
            {p.registry_only ? (
              <Badge variant="outline" className="border-transparent bg-subtle text-muted-foreground">{t("university.registeredMajor")}</Badge>
            ) : p.fee_locked ? (
              <SignInGate label={t("university.signInForFees")} className="text-sm" />
            ) : p.tuition_fee != null ? (
              <span className="text-right text-sm font-semibold tabular-nums text-cas-navy">
                {money(p.tuition_fee, p.currency)}<span className="text-xs font-normal text-muted-foreground">{t("university.perYear")}</span>
                {p.service_charge && (
                  <span className="block text-xs font-normal text-muted-foreground">
                    {t("programs.serviceFee", { amount: Number(p.service_charge.amount).toLocaleString(), currency: p.service_charge.currency })}
                  </span>
                )}
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {p.teaching_language && <span className="inline-flex items-center gap-1"><Languages className="size-3.5" /> {p.teaching_language}</span>}
            {!u.moe_listed && p.level === "bachelor" && p.teaching_language === "English" && /MBBS|Clinical Medicine/i.test(p.name) && (
              <span className="basis-full text-cas-red-600">{t("university.mbbsNotApproved")}</span>
            )}
            {p.csc_listed && <Badge variant="outline" className="border-transparent bg-cas-navy-50 text-cas-navy">{t("university.cscListed")}</Badge>}
            <ApplyButton universitySlug={u.slug} className="inline-flex items-center gap-1 font-medium text-cas-navy hover:underline">{t("university.apply")} <ArrowRight className="size-3" /></ApplyButton>
          </div>
        </div>
      ))}
    </div>
    {shown < filtered.length && (
      <div className="text-center">
        <Button type="button" variant="outline" onClick={() => setShown((n) => n + PROGRAMS_PAGE * 2)}>
          {t("university.showMorePrograms", { shown: Math.min(shown, filtered.length), total: filtered.length })}
        </Button>
      </div>
    )}
    </div>
  )
}

function IntakesPanel({ u }: { u: SiteUniversityDetail }) {
  const { t } = useTranslation()
  if (u.deadlines_locked) {
    return (
      <div className="rounded-sm border bg-card p-6 shadow-sm">
        <SignInGate label={t("university.signInForDeadlines")} />
      </div>
    )
  }
  if (!u.intakes.length) return <Empty text={t("university.intakesEmpty")} />

  return (
    <div className="overflow-hidden rounded-sm border bg-card shadow-sm">
      <ul className="divide-y">
        {u.intakes.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <div>
              <p className="font-medium">{i.name}</p>
              <p className="text-xs text-muted-foreground">{i.program ?? t("university.allPrograms")}{i.seats ? t("university.seatsCount", { count: i.seats }) : ""}</p>
            </div>
            <div className="text-right text-muted-foreground">
              <AdmissionWindow opens={i.application_open_date} closes={i.application_deadline} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ScholarshipsPanel({ u }: { u: SiteUniversityDetail }) {
  const { t } = useTranslation()
  if (!u.scholarships.length) return <Empty text={t("university.scholarshipsEmpty")} />

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {u.scholarships.map((s) => (
        <div key={s.id} className="rounded-sm border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-medium">{s.name}</h3>
            {s.type && <Badge variant="outline" className="border-transparent bg-cas-navy-50 text-cas-navy capitalize">{s.type}</Badge>}
          </div>
          {s.description && <p className="mt-1.5 text-sm text-muted-foreground">{s.description}</p>}
          <AdmissionWindow className="mt-2" opens={s.application_open_date} closes={s.deadline} />
          <p className="mt-2 text-sm text-muted-foreground">
            {[s.coverage, s.amount != null ? money(s.amount, s.currency) : null, s.deadline ? t("university.deadlineLabel", { date: new Date(s.deadline).toLocaleDateString() }) : null].filter(Boolean).join(" · ")}
          </p>
          {s.details_locked && <div className="mt-2"><SignInGate label={t("university.signInForAward")} className="text-xs" /></div>}
        </div>
      ))}
    </div>
  )
}

function GuideTable({ raw }: { raw: string }) {
  const rows = raw.replace(/^TABLE:\s*/, "").split(" // ").map((r) => r.split(" | "))
  const [head, ...body] = rows

  return (
    <div className="overflow-x-auto rounded-sm border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>{head.map((c, i) => <th key={i} className="px-3 py-2 font-medium">{c}</th>)}</tr>
        </thead>
        <tbody className="divide-y">
          {body.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="px-3 py-2 align-top">{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  )
}

function GuidePanel({ u }: { u: SiteUniversityDetail }) {
  const { t } = useTranslation()
  const guide = u.guide
  if (!guide?.blocks?.length) return <Empty text={t("university.guideEmpty")} />

  return (
    <div className="space-y-5 rounded-sm border bg-card p-6 shadow-sm">
      {guide.blocks.map((b, i) => (
        <section key={i} className="space-y-2">
          {b.h && <h3 className="font-semibold text-cas-navy">{b.h}</h3>}
          {b.t.map((line, j) => (line.startsWith("TABLE:") ? <GuideTable key={j} raw={line} /> : <p key={j} className="text-sm text-muted-foreground">{line}</p>))}
        </section>
      ))}
    </div>
  )
}

function AdmissionPanel({ u }: { u: SiteUniversityDetail }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <div className="rounded-sm border bg-card p-6 shadow-sm">
        <h3 className="font-semibold text-cas-navy">{t("university.admissionRequirements")}</h3>
        {u.requirements.length ? (
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {u.requirements.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-cas-navy" />{r}</li>
            ))}
          </ul>
        ) : (
          <div className="mt-2">
            <p className="text-sm text-muted-foreground">{t("university.generalRequirementsTitle")}</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {(t("university.generalRequirements", { returnObjects: true }) as string[]).map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-cas-navy" />{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="flex flex-col items-start justify-between gap-3 rounded-sm bg-cas-navy p-6 text-white sm:flex-row sm:items-center">
        <div>
          <h3 className="font-semibold">{t("university.readyToApply")}</h3>
          <p className="mt-0.5 text-sm text-white/80">{t("university.readyToApplyBody")}</p>
        </div>
        <div className="flex gap-2">
          <ApplyButton universitySlug={u.slug} className="inline-flex h-10 items-center gap-1.5 rounded-sm bg-cas-red px-4 text-sm font-semibold text-white hover:bg-cas-red-600">
            {t("university.applyNow")} <ArrowRight className="size-4" />
          </ApplyButton>
          <a href="#enquire" className="inline-flex h-10 items-center rounded-sm border border-white/25 px-4 text-sm font-semibold hover:bg-white/10">{t("university.enquire")}</a>
        </div>
      </div>
    </div>
  )
}

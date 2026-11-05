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
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AdmissionWindow } from "@/features/site/components"
import { getSiteUniversity, type SiteOverviewSection, type SiteRepProfessor, type SiteUniversityDetail } from "@/features/site/api"
import ApplyButton from "@/features/site/ApplyButton"
import EnquiryForm from "@/features/site/EnquiryForm"
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
          <Link to="/site"><ArrowLeft className="size-4" /> {t("university.backToUniversities")}</Link>
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
      <Link to="/site" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> {t("university.allUniversities")}
      </Link>

      {/* Hero */}
      <div className="overflow-hidden rounded-sm border bg-card shadow-sm">
        {/* Cover — image, or a designed gradient banner when none is available */}
        <div className="relative h-48 overflow-hidden sm:h-60">
          {cover ? (
            <img src={cover.src} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-cas-navy-900 via-cas-navy to-cas-navy-700">
              <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
              <span className="relative px-6 text-center font-sans text-2xl font-bold text-white/90 sm:text-3xl">{u.name}</span>
            </div>
          )}
        </div>
        {u.cover_downloadable && (
          <div className="flex justify-end px-4 pt-2 text-xs sm:px-6">
            <a href={`/api/v1/public/universities/${u.slug}/cover-download`} className="text-muted-foreground hover:text-cas-navy hover:underline">{t("university.downloadCover")}</a>
          </div>
        )}
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
                <AdmissionWindow opens={upcoming.application_open_date} closes={upcoming.application_deadline} sourceKind={upcoming.source_kind} verifiedOn={upcoming.verified_on} />
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
    <Link to="/portal/login" className={cn("inline-flex items-center gap-1 font-semibold text-cas-red hover:underline", className)}>
      <Lock className="size-3.5" /> {label}
    </Link>
  )
}

/** The long Overview: a contents row and the sections (history, campus, city, programs, admission). */
export function OverviewArticle({ sections }: { sections: SiteOverviewSection[] }) {
  const { t } = useTranslation()
  const slug = (i: number) => `overview-${i}`
  const toc = sections.map((s, i) => ({ s, i })).filter(({ s }) => s.level === 2)

  return (
    <article className="rounded-sm border bg-card p-6 shadow-sm sm:p-8">
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
  if (!u.programs.length) return <Empty text={t("university.programsEmpty")} />

  const hasRegistered = u.programs.some((p) => p.registry_only)

  return (
    <div className="space-y-4">
    {hasRegistered && (
      <p className="rounded-sm border border-cas-navy/15 bg-cas-navy-50 px-4 py-3 text-sm text-cas-navy">{t("university.registryNote")}</p>
    )}
    <div className="grid gap-3 sm:grid-cols-2">
      {u.programs.slice(0, shown).map((p) => (
        <div key={p.id} className="rounded-sm border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium">{p.name}</h3>
              {p.name_zh && <p className="text-xs text-muted-foreground">{p.name_zh}</p>}
              <p className="text-xs text-muted-foreground">{levelLabel(p.level)}{p.duration_months ? t("university.durationMonths", { count: p.duration_months }) : ""}</p>
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
    {shown < u.programs.length && (
      <div className="text-center">
        <Button type="button" variant="outline" onClick={() => setShown((n) => n + PROGRAMS_PAGE * 2)}>
          {t("university.showMorePrograms", { shown: Math.min(shown, u.programs.length), total: u.programs.length })}
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
              <AdmissionWindow opens={i.application_open_date} closes={i.application_deadline} sourceKind={i.source_kind} verifiedOn={i.verified_on} />
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
          <AdmissionWindow className="mt-2" opens={s.application_open_date} closes={s.deadline} sourceKind={s.source_kind} verifiedOn={s.verified_on} />
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

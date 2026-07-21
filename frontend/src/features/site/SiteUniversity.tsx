import { useQuery } from "@tanstack/react-query"
import {
  ArrowLeft,
  Award,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  ExternalLink,
  GraduationCap,
  Info,
  Languages,
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
import { getSiteUniversity, type SiteIntake, type SiteRepProfessor, type SiteUniversityDetail } from "@/features/site/api"
import EnquiryForm from "@/features/site/EnquiryForm"
import { useSeo } from "@/lib/seo"
import { cn } from "@/lib/utils"

const money = (v: string | number | null | undefined, currency?: string | null) =>
  v == null ? null : `${Number(v).toLocaleString()} ${currency ?? ""}`.trim()

const levelLabel = (l: string) => l.replace(/\b\w/g, (c) => c.toUpperCase())

function nextDeadline(intakes: SiteIntake[]): { name: string; date: string; daysLeft: number } | null {
  const now = Date.now()
  const up = intakes
    .filter((i) => i.application_deadline)
    .map((i) => ({ name: i.name, date: i.application_deadline as string, ms: new Date(i.application_deadline as string).getTime() }))
    .filter((i) => i.ms >= now)
    .sort((a, b) => a.ms - b.ms)[0]

  return up ? { name: up.name, date: up.date, daysLeft: Math.ceil((up.ms - now) / 86_400_000) } : null
}

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
    jsonLd: uni
      ? {
          "@context": "https://schema.org",
          "@type": "CollegeOrUniversity",
          name: uni.name,
          ...(uni.website ? { url: uni.website } : {}),
          ...(uni.city ? { address: { "@type": "PostalAddress", addressLocality: uni.city, addressCountry: "CN" } } : {}),
        }
      : undefined,
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
  const deadline = nextDeadline(u.intakes)
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
          {u.cover_url ? (
            <img src={u.cover_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-cas-navy-900 via-cas-navy to-cas-navy-700">
              <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
              <span className="relative px-6 text-center font-sans text-2xl font-bold text-white/90 sm:text-3xl">{u.name}</span>
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
        </div>
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {u.logo_url && <img src={u.logo_url} alt={t("university.logoAlt", { name: u.name })} className="-mt-14 size-20 shrink-0 rounded-sm border-2 border-card bg-white object-contain p-1 shadow-lg" />}
              <div>
                <h1 className="text-2xl font-bold text-cas-navy sm:text-3xl">{u.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {(u.city || u.country) && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {[u.city, u.country].filter(Boolean).join(", ")}</span>}
                  {u.nearest_airport && <span className="inline-flex items-center gap-1"><Plane className="size-3.5" /> {u.nearest_airport}</span>}
                </div>
                {u.moe_listed && (
                  <Badge variant="outline" className="mt-3 border-transparent bg-cas-red-50 text-cas-red-600">
                    <ShieldCheck className="size-3.5" /> {t("university.moeListedBadge")}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <a href="#enquire" className="inline-flex h-11 items-center gap-1.5 rounded-sm border bg-background px-5 text-sm font-semibold text-cas-navy hover:bg-muted">{t("university.enquire")}</a>
              {u.apply_link && (
                <a href={u.apply_link} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-1.5 rounded-sm bg-cas-red px-5 text-sm font-bold text-white shadow-sm hover:bg-cas-red-600">
                  {t("university.applyNow")} <ExternalLink className="size-4" />
                </a>
              )}
            </div>
          </div>

          {deadline && (
            <div className="mt-5 flex flex-wrap items-center gap-2 rounded-sm bg-subtle px-3 py-2 text-sm">
              <CalendarClock className="size-4 text-cas-navy" />
              <span>{t("university.nextIntakePrefix")} <span className="font-medium">{deadline.name}</span> {t("university.nextIntakeCloses", { date: new Date(deadline.date).toLocaleDateString() })}</span>
              <span className={cn("ml-auto rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", deadline.daysLeft <= 14 ? "bg-cas-red-50 text-cas-red" : "bg-cas-navy-50 text-cas-navy")}>
                {t("university.daysLeft", { count: deadline.daysLeft })}
              </span>
            </div>
          )}

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
    ...(u.intakes.length ? [{ key: "intakes", label: t("university.tabIntakes"), icon: CalendarDays }] : []),
    ...(u.scholarships.length ? [{ key: "scholarships", label: t("university.tabScholarships"), icon: Award }] : []),
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
        {tab === "admission" && <AdmissionPanel u={u} />}
      </div>
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-sm border bg-card p-6 text-sm text-muted-foreground shadow-sm">{text}</p>
}

function OverviewPanel({ u, rep }: { u: SiteUniversityDetail; rep: SiteRepProfessor | null }) {
  const { t } = useTranslation()
  const facts: [string, string][] = [
    [t("university.factLocation"), [u.city, u.country].filter(Boolean).join(", ") || "—"],
    [t("university.factMoeListed"), u.moe_listed ? t("university.yes") : "—"],
    [t("university.factNearestAirport"), u.nearest_airport || "—"],
    [t("university.factPrograms"), String(u.programs.length)],
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
      {u.about && (
        <div className="rounded-sm border bg-card p-6 shadow-sm">
          <p className="text-sm whitespace-pre-line text-foreground/90">{u.about}</p>
        </div>
      )}
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

function ProgramsPanel({ u }: { u: SiteUniversityDetail }) {
  const { t } = useTranslation()
  if (!u.programs.length) return <Empty text={t("university.programsEmpty")} />

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {u.programs.map((p) => (
        <div key={p.id} className="rounded-sm border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium">{p.name}</h3>
              <p className="text-xs text-muted-foreground">{levelLabel(p.level)}{p.duration_months ? t("university.durationMonths", { count: p.duration_months }) : ""}</p>
            </div>
            {p.tuition_fee != null && <span className="text-sm font-semibold tabular-nums text-cas-navy">{money(p.tuition_fee, p.currency)}<span className="text-xs font-normal text-muted-foreground">{t("university.perYear")}</span></span>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {p.teaching_language && <span className="inline-flex items-center gap-1"><Languages className="size-3.5" /> {p.teaching_language}</span>}
            {p.apply_link && <a href={p.apply_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-cas-navy hover:underline">{t("university.apply")} <ExternalLink className="size-3" /></a>}
          </div>
        </div>
      ))}
    </div>
  )
}

function IntakesPanel({ u }: { u: SiteUniversityDetail }) {
  const { t } = useTranslation()
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
              {i.application_deadline
                ? <>{t("university.applyBy")} <span className="font-medium text-cas-navy">{new Date(i.application_deadline).toLocaleDateString()}</span></>
                : t("university.rollingAdmission")}
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
          <p className="mt-2 text-sm text-muted-foreground">
            {[s.coverage, s.amount != null ? money(s.amount, s.currency) : null, s.deadline ? t("university.deadlineLabel", { date: new Date(s.deadline).toLocaleDateString() }) : null].filter(Boolean).join(" · ")}
          </p>
          {s.apply_link && <a href={s.apply_link} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-cas-navy hover:underline">{t("university.howToApply")} <ExternalLink className="size-3" /></a>}
        </div>
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
          <p className="mt-2 text-sm text-muted-foreground">{t("university.requirementsFallback")}</p>
        )}
      </div>
      <div className="flex flex-col items-start justify-between gap-3 rounded-sm bg-cas-navy p-6 text-white sm:flex-row sm:items-center">
        <div>
          <h3 className="font-semibold">{t("university.readyToApply")}</h3>
          <p className="mt-0.5 text-sm text-white/80">{t("university.readyToApplyBody")}</p>
        </div>
        <div className="flex gap-2">
          {u.apply_link && (
            <a href={u.apply_link} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-sm bg-cas-red px-4 text-sm font-semibold text-white hover:bg-cas-red-600">
              {t("university.applyNow")} <ExternalLink className="size-4" />
            </a>
          )}
          <a href="#enquire" className="inline-flex h-10 items-center rounded-sm border border-white/25 px-4 text-sm font-semibold hover:bg-white/10">{t("university.enquire")}</a>
        </div>
      </div>
    </div>
  )
}

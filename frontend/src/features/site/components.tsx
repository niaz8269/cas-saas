import { ArrowUpRight, CalendarClock, GraduationCap, MapPin, ShieldCheck } from "lucide-react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { cn } from "@/lib/utils"
import type { SiteUniversityCard } from "@/features/site/api"

// Light, varied placeholder tints — photo-ready image areas that read light &
// colourful like the reference, instead of heavy dark blocks.
const TONES = [
  "from-sky-100 to-blue-50",
  "from-amber-100 to-orange-50",
  "from-emerald-100 to-teal-50",
  "from-rose-100 to-pink-50",
  "from-indigo-100 to-sky-50",
  "from-violet-100 to-fuchsia-50",
]

function toneFor(seed: number | string): string {
  const n = typeof seed === "number" ? seed : Number(String(seed).match(/(\d+)/)?.[1] ?? String(seed).length)
  return TONES[Math.abs(n) % TONES.length]
}

/**
 * A tinted banner area. Only real, supplied images are ever shown on the public
 * site; where there is none, this renders a plain brand tint — never stock art.
 */
export function PhotoBanner({ src, className, children }: { src: string; className?: string; children?: ReactNode }) {
  return (
    <div className={cn("relative isolate overflow-hidden bg-gradient-to-br", toneFor(src), className)}>
      {children}
    </div>
  )
}

/** University card shared by the home page and the universities listing. */
export function UniCard({ u }: { u: SiteUniversityCard }) {
  const { t } = useTranslation()
  // A campus photo if one is available; otherwise a credited photo of the city (never an unrelated image).
  const cover = u.cover_url ? { src: u.cover_url, credit: u.cover_credit ?? null, own: !u.cover_is_city } : null

  return (
    <Link
      to={u.slug ? `/site/universities/${u.slug}` : "#"}
      className="group flex flex-col overflow-hidden rounded-sm border bg-card shadow-sm ring-1 ring-transparent transition-all duration-300 hover:-translate-y-1 hover:shadow-sm hover:ring-cas-red/40"
    >
      {/* Cover — a designed gradient banner when no image is available */}
      <div className={cn("relative h-44 overflow-hidden bg-gradient-to-br", toneFor(u.id))}>
        {cover && (
          <>
            <img
              src={cover.src}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
            {cover.credit && (
              <p className="pointer-events-none absolute inset-x-3 bottom-1.5 line-clamp-1 text-[10px] text-white/85">{cover.credit}</p>
            )}
          </>
        )}
        {u.moe_listed && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-cas-red px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
            <ShieldCheck className="size-3.5" /> {t("components.moeListed")}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          {u.logo_url && (
            <img src={u.logo_url} alt="" loading="lazy" decoding="async" className="h-11 w-24 shrink-0 rounded-sm border bg-white object-contain p-1 shadow-sm" />
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-cas-navy transition-colors group-hover:text-cas-red-600">{u.name}</h3>
            {u.name_zh && <p className="text-xs text-muted-foreground">{u.name_zh}</p>}
            {[u.city, u.province, u.country].filter(Boolean).length > 0 && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3.5" /> {[u.city, u.province, u.country].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>
        {u.about && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{u.about}</p>}
        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cas-navy-50 px-2.5 py-1 text-xs font-medium text-cas-navy">
            <GraduationCap className="size-3.5" /> {t("components.programCount", { count: u.programs_count ?? 0 })}
          </span>
          <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-cas-red-600">
            {t("components.view")} <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}

/**
 * The one page-header band used at the top of every site page (listing and
 * content) — a prominent navy banner with a red eyebrow pill, so the whole
 * site shares a single header pattern.
 */
export function SitePageHeader({ eyebrow, title, subtitle, action }: {
  eyebrow?: ReactNode
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <section className="relative overflow-hidden rounded-sm bg-cas-navy p-8 text-white shadow-sm sm:p-12">
      <div className="pointer-events-none absolute -top-16 -right-12 size-56 rounded-full bg-cas-red/20 blur-3xl" />
      <div className="relative flex flex-wrap items-end justify-between gap-5">
        <div>
          {eyebrow && <span className="inline-flex items-center gap-1.5 rounded-full bg-cas-red/20 px-3 py-1 text-xs font-medium text-cas-red-50">{eyebrow}</span>}
          <h1 className="mt-4 max-w-2xl text-3xl font-bold sm:text-4xl">{title}</h1>
          {subtitle && <p className="mt-3 max-w-2xl text-sm text-white/80 sm:text-base">{subtitle}</p>}
        </div>
        {action}
      </div>
    </section>
  )
}

/** Section heading with an optional "see all" link, used across site pages. */
export function SiteSection({ title, subtitle, action, children }: {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section>
      <div className="mb-10 text-center">
        <h2 className="text-2xl font-bold text-cas-navy sm:text-[2rem]">{title}</h2>
        {subtitle && <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">{subtitle}</p>}
      </div>
      {children}
      {action && <div className="mt-9 flex justify-center">{action}</div>}
    </section>
  )
}

const fmtDay = (d: string) => new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })

/**
 * An admission window: when applications open and close, taken from the
 * university's own published page (named, never linked, on public pages). Never invents a date;
 * shows "to be announced" when the university has not published one.
 */
export function AdmissionWindow({ opens, closes, sourceUrl, verifiedOn, className }: {
  opens?: string | null
  closes?: string | null
  sourceUrl?: string | null
  verifiedOn?: string | null
  className?: string
}) {
  const { t } = useTranslation()
  const today = new Date().setHours(0, 0, 0, 0)
  const closed = closes ? new Date(closes).getTime() < today : false

  return (
    <div className={cn("space-y-0.5 text-xs", className)}>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
        <CalendarClock className="size-3.5 shrink-0 text-cas-navy" />
        <span>
          {opens ? t(new Date(opens).getTime() > today ? "admissionWindow.opens" : "admissionWindow.opened", { date: fmtDay(opens) }) : t("admissionWindow.openTbd")}
        </span>
        <span className={cn(closed && "font-semibold text-cas-red")}>
          {closes ? t(closed ? "admissionWindow.closedOn" : "admissionWindow.closes", { date: fmtDay(closes) }) : t("admissionWindow.closeTbd")}
        </span>
      </p>
      {sourceUrl && (
        <p className="pl-5 text-[11px] text-muted-foreground">
          {t(/cucas\./.test(sourceUrl) ? "admissionWindow.sourceCucas" : /sas\.cas\.moe/.test(sourceUrl) ? "admissionWindow.sourceSas" : "admissionWindow.source")}
          {verifiedOn ? ` · ${t("admissionWindow.checked", { date: fmtDay(verifiedOn) })}` : ""}
        </p>
      )}
    </div>
  )
}

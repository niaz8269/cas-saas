import { ArrowUpRight, GraduationCap, MapPin, School, ShieldCheck } from "lucide-react"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"

import type { SiteUniversityCard } from "@/features/site/api"

function monogram(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()
}

/** University card shared by the home page and the universities listing. */
export function UniCard({ u }: { u: SiteUniversityCard }) {
  return (
    <Link
      to={u.slug ? `/site/universities/${u.slug}` : "#"}
      className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm ring-1 ring-transparent transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-cas-gold/40"
    >
      {/* Cover — a designed gradient banner when no image is available */}
      <div className="relative h-36 overflow-hidden">
        {u.cover_url ? (
          <img src={u.cover_url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="relative flex h-full items-center justify-center bg-gradient-to-br from-cas-navy-900 to-cas-navy">
            <School className="absolute size-16 text-white/10" />
            <span className="relative z-10 font-serif text-3xl font-bold tracking-wide text-cas-gold/90">{monogram(u.name)}</span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
        {u.moe_listed && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-cas-gold px-2.5 py-1 text-[11px] font-semibold text-cas-navy shadow-sm">
            <ShieldCheck className="size-3.5" /> MoE Listed
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          {u.logo_url && (
            <img src={u.logo_url} alt="" className="size-11 shrink-0 rounded-lg border bg-white object-contain p-0.5 shadow-sm" />
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-cas-navy transition-colors group-hover:text-cas-gold-600">{u.name}</h3>
            {[u.city, u.country].filter(Boolean).length > 0 && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3.5" /> {[u.city, u.country].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>
        {u.about && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{u.about}</p>}
        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cas-navy-50 px-2.5 py-1 text-xs font-medium text-cas-navy">
            <GraduationCap className="size-3.5" /> {u.programs_count ?? 0} program{u.programs_count === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-cas-gold-600">
            View <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}

/** Premium page-header band used at the top of the site's data pages. */
export function SitePageHeader({ eyebrow, title, subtitle, action }: {
  eyebrow?: string
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-cas-navy-50 via-card to-card p-6 shadow-sm sm:p-8">
      <div className="pointer-events-none absolute -top-12 -right-12 size-44 rounded-full bg-cas-gold/10 blur-2xl" />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
          {eyebrow && <p className="text-xs font-bold tracking-wider text-cas-gold-600 uppercase">{eyebrow}</p>}
          <h1 className="mt-1 text-2xl font-bold text-cas-navy sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
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
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-cas-navy sm:text-2xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
